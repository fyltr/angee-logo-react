import { parseHexColor, rgbToRgba, type Rgb } from '../lib/color.js';
import { FACES, LOGO_CUBES, faceBucket, type FaceName, type GridPos, type Vec3 } from '../lib/geometry.js';
import { createRotation, type Rotation } from '../lib/projection.js';

interface CubeToDraw {
  readonly position: Vec3;
  readonly size: number;
  readonly opacity: number;
}

export interface FractalFrameOptions {
  readonly size: number;
  readonly gap: number;
  readonly topColor: string;
  readonly rightColor: string;
  readonly leftColor: string;
  readonly initialRotation: { readonly x: number; readonly y: number };
  readonly cycleDuration: number;
  readonly startFrom: FractalStart;
}

export type FractalStart = 'cube' | 'dust';

type ColorBucket = ReturnType<typeof faceBucket>;

const LOGO_CELLS = LOGO_CUBES;
const MINIATURE_SCALE = 0.17;
const INVALID_COLOR_FALLBACK: Rgb = { r: 255, g: 255, b: 255 };
const FACE_SHADES: Readonly<Record<FaceName, number>> = {
  top: 1,
  bottom: 0.55,
  left: 0.72,
  right: 0.92,
  back: 0.62,
  front: 0.88,
};

function centeredCell(cell: GridPos): Vec3 {
  return [cell[0] - 1, cell[1] - 1, cell[2] - 1];
}

function hash(seed: number): number {
  const x = Math.sin(seed * 91.3458 + 12.345) * 47453.5453;
  return x - Math.floor(x);
}

function normalize([x, y, z]: Vec3): Vec3 {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

function mix(a: number, b: number, amount: number): number {
  return a + (b - a) * amount;
}

function mixVec(a: Vec3, b: Vec3, amount: number): Vec3 {
  return [mix(a[0], b[0], amount), mix(a[1], b[1], amount), mix(a[2], b[2], amount)];
}

function scaleVec(vector: Vec3, scale: number): Vec3 {
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

function smoothstep(start: number, end: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

function project(point: Vec3, width: number, height: number, cameraDistance: number): readonly [number, number, number] {
  const perspective = cameraDistance / Math.max(cameraDistance - point[2], cameraDistance * 0.2);
  return [width / 2 + point[0] * perspective, height / 2 + point[1] * perspective, perspective];
}

const ROOTS = LOGO_CELLS.map((cell, index) => {
  const assembled = centeredCell(cell);
  const noise: Vec3 = [hash(index * 3) - 0.5, hash(index * 3 + 1) - 0.5, hash(index * 3 + 2) - 0.5];
  const direction = normalize([
    assembled[0] + noise[0] * 0.85,
    assembled[1] + noise[1] * 0.85,
    assembled[2] + noise[2] * 0.85,
  ]);
  return {
    assembled,
    separated: [
      assembled[0] + direction[0] * 1.55 + noise[0] * 0.35,
      assembled[1] + direction[1] * 1.55 + noise[1] * 0.35,
      assembled[2] + direction[2] * 1.55 + noise[2] * 0.35,
    ] as Vec3,
  };
});

const CHILDREN = ROOTS.flatMap((_, rootIndex) => LOGO_CELLS.map(cell => ({
  rootIndex,
  relative: centeredCell(cell),
})));

const GRANDCHILDREN = CHILDREN.flatMap((_, childIndex) => LOGO_CELLS.map((cell, cellIndex) => {
  const seed = childIndex * LOGO_CELLS.length + cellIndex;
  const dustDirection = normalize([
    hash(seed * 5 + 1) * 2 - 1,
    hash(seed * 5 + 2) * 2 - 1,
    hash(seed * 5 + 3) * 2 - 1,
  ]);
  return {
    childIndex,
    relative: centeredCell(cell),
    dustDirection,
    dustDistance: 0.7 + hash(seed * 5 + 4) * 2.5,
    colorIndex: seed % 3,
  };
}));

function drawSolidCubes(
  context: CanvasRenderingContext2D,
  cubes: readonly CubeToDraw[],
  rotate: Rotation,
  width: number,
  height: number,
  cameraDistance: number,
  palette: Readonly<Record<ColorBucket, Rgb>>,
): void {
  const polygons: Array<{
    readonly points: readonly (readonly [number, number, number])[];
    readonly depth: number;
    readonly fill: string;
    readonly stroke: string;
  }> = [];

  for (const cube of cubes) {
    for (const face of FACES) {
      const rotatedNormal = rotate(face.normal);
      if (rotatedNormal[2] <= 0.015) continue;

      const rotatedPoints = face.verts.map(vertex => rotate([
        cube.position[0] + (vertex[0] - 0.5) * cube.size,
        cube.position[1] + (vertex[1] - 0.5) * cube.size,
        cube.position[2] + (vertex[2] - 0.5) * cube.size,
      ]));
      const projected = rotatedPoints.map(point => project(point, width, height, cameraDistance));
      const light = FACE_SHADES[face.name] * (0.72 + rotatedNormal[2] * 0.28);
      polygons.push({
        points: projected,
        depth: rotatedPoints.reduce((sum, point) => sum + point[2], 0) / rotatedPoints.length,
        fill: rgbToRgba(palette[faceBucket(face.name)], cube.opacity, light),
        stroke: `rgba(255, 255, 255, ${cube.opacity * 0.16})`,
      });
    }
  }

  polygons.sort((a, b) => a.depth - b.depth);
  context.lineWidth = 0.65;
  for (const polygon of polygons) {
    context.beginPath();
    context.moveTo(polygon.points[0][0], polygon.points[0][1]);
    for (let index = 1; index < polygon.points.length; index += 1) {
      context.lineTo(polygon.points[index][0], polygon.points[index][1]);
    }
    context.closePath();
    context.fillStyle = polygon.fill;
    context.fill();
    context.strokeStyle = polygon.stroke;
    context.stroke();
  }
}

export function createFractalRenderer() {
  const rootPositions: Vec3[] = ROOTS.map(root => root.assembled);
  const childPositions: Vec3[] = CHILDREN.map(() => [0, 0, 0]);

  return function renderFractalFrame(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    elapsedSeconds: number,
    options: FractalFrameOptions,
    reducedMotion = false,
  ): void {
    context.clearRect(0, 0, width, height);

    const safeDuration = Math.max(4, options.cycleDuration);
    const elapsedCycle = (elapsedSeconds % safeDuration) / safeDuration;
    const phaseOffset = options.startFrom === 'dust' ? 0.5 : 0;
    const cycle = reducedMotion ? 0 : (elapsedCycle + phaseOffset) % 1;
    const expansion = cycle <= 0.5 ? cycle * 2 : (1 - cycle) * 2;
    const rootBreak = smoothstep(0.08, 0.28, expansion);
    const childReveal = smoothstep(0.24, 0.5, expansion);
    const grandchildReveal = smoothstep(0.48, 0.73, expansion);
    const dust = smoothstep(0.7, 0.97, expansion);

    const viewportLimit = Math.max(18, Math.min(width, height) / 8.2);
    const cubeSize = Math.min(Math.max(12, options.size), viewportLimit);
    const step = cubeSize + Math.max(0, options.gap);
    const childSize = cubeSize * MINIATURE_SCALE;
    const grandchildSize = childSize * MINIATURE_SCALE;
    const cameraDistance = Math.max(width, height) * 1.7;
    const motionElapsed = reducedMotion ? 0 : elapsedSeconds;
    const rotationX = options.initialRotation.x + Math.sin(motionElapsed * 0.31) * 4.58;
    const rotationY = options.initialRotation.y + motionElapsed * (360 / safeDuration);
    const rotate = createRotation(rotationY, rotationX);
    const palette = {
      top: parseHexColor(options.topColor, INVALID_COLOR_FALLBACK),
      right: parseHexColor(options.rightColor, INVALID_COLOR_FALLBACK),
      left: parseHexColor(options.leftColor, INVALID_COLOR_FALLBACK),
    };

    const halo = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.min(width, height) * 0.44);
    halo.addColorStop(0, rgbToRgba(palette.top, 0.055));
    halo.addColorStop(0.5, rgbToRgba(palette.left, 0.018));
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = halo;
    context.fillRect(0, 0, width, height);

    for (let index = 0; index < ROOTS.length; index += 1) {
      const root = ROOTS[index];
      rootPositions[index] = scaleVec(mixVec(root.assembled, root.separated, rootBreak), step);
    }

    const solidCubes: CubeToDraw[] = [];
    const rootOpacity = 1 - childReveal;
    if (rootOpacity > 0.01) {
      for (const position of rootPositions) {
        solidCubes.push({ position, size: cubeSize, opacity: rootOpacity });
      }
    }

    const childOpacity = childReveal * (1 - grandchildReveal);
    for (let index = 0; index < CHILDREN.length; index += 1) {
      const child = CHILDREN[index];
      const parent = rootPositions[child.rootIndex];
      const expanded: Vec3 = [
        parent[0] + child.relative[0] * childSize * 1.08,
        parent[1] + child.relative[1] * childSize * 1.08,
        parent[2] + child.relative[2] * childSize * 1.08,
      ];
      childPositions[index] = mixVec(parent, expanded, childReveal);
      if (childOpacity > 0.01) {
        solidCubes.push({
          position: childPositions[index],
          size: childSize * mix(0.35, 1, childReveal),
          opacity: childOpacity,
        });
      }
    }

    drawSolidCubes(context, solidCubes, rotate, width, height, cameraDistance, palette);

    if (grandchildReveal <= 0.01) return;

    const pointColors = [palette.top, palette.right, palette.left] as const;
    const pointOpacity = grandchildReveal * (1 - dust * 0.58);
    const pointSize = Math.max(0.55, grandchildSize * mix(1, 0.28, dust));
    context.save();
    context.globalCompositeOperation = 'lighter';

    for (let colorIndex = 0; colorIndex < pointColors.length; colorIndex += 1) {
      context.fillStyle = rgbToRgba(pointColors[colorIndex], pointOpacity, 1.08);
      context.shadowColor = rgbToRgba(pointColors[colorIndex], dust * 0.5);
      context.shadowBlur = dust * 5;
      for (const particle of GRANDCHILDREN) {
        if (particle.colorIndex !== colorIndex) continue;
        const parent = childPositions[particle.childIndex];
        const formed: Vec3 = [
          parent[0] + particle.relative[0] * grandchildSize * 1.08,
          parent[1] + particle.relative[1] * grandchildSize * 1.08,
          parent[2] + particle.relative[2] * grandchildSize * 1.08,
        ];
        const formedProgress = mixVec(parent, formed, grandchildReveal);
        const dustDistance = step * particle.dustDistance * dust;
        const position: Vec3 = [
          formedProgress[0] + particle.dustDirection[0] * dustDistance,
          formedProgress[1] + particle.dustDirection[1] * dustDistance,
          formedProgress[2] + particle.dustDirection[2] * dustDistance,
        ];
        const rotated = rotate(position);
        const projected = project(rotated, width, height, cameraDistance);
        const renderedSize = pointSize * projected[2];
        context.fillRect(
          projected[0] - renderedSize / 2,
          projected[1] - renderedSize / 2,
          renderedSize,
          renderedSize,
        );
      }
    }
    context.restore();
  };
}
