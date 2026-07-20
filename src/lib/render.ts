// SVG generation. Pure functions: input options → SVG markup string and / or
// a structured polygon list (used by the React component for direct rendering).

import { FACES, type FaceName, faceBucket, getCubes, type Geometry } from './geometry.js';
import { shadeHex } from './color.js';
import { createProjector, viewDirection } from './projection.js';

export type Scheme = '3tone' | 'mono' | 'shade';

export interface Colors {
  top: string;
  right: string;
  left: string;
}

export interface RenderOptions {
  geometry: Geometry;
  rotY: number;
  rotX: number;
  size: number;
  pad: number;
  scheme: Scheme;
  colors: Colors;
  bgMode: 'color' | 'transparent';
  bgColor: string;
  stroke: string;
  strokeWidth: number;
  /** Optional namespace for gradient `id`s (used when `scheme === 'shade'`).
   *  When omitted, a deterministic prefix is derived from the colors so the
   *  same palette always produces the same SVG markup. The React component
   *  passes a `useId()`-derived prefix so multiple instances don't collide. */
  idPrefix?: string;
}

export interface Polygon {
  readonly face: FaceName;
  readonly points: readonly (readonly [number, number])[];
  readonly fill: string;
}

export interface RenderedScene {
  readonly polys: readonly Polygon[];
  readonly viewBox: { x: number; y: number; w: number; h: number };
}

export interface GradientSpec {
  readonly id: string;
  readonly x1: string;
  readonly y1: string;
  readonly x2: string;
  readonly y2: string;
  readonly stops: readonly { readonly offset: string; readonly color: string }[];
}

const round = (n: number) => Math.round(n * 100) / 100;

function defaultIdPrefix(colors: Colors): string {
  // Deterministic — same palette ⇒ same prefix ⇒ same SVG bytes.
  const hex = (colors.top + colors.right + colors.left).replace(/[^0-9a-fA-F]/g, '').toLowerCase();
  return `angee-${hex || '0'}`;
}

function faceFill(face: FaceName, opts: RenderOptions): string {
  if (opts.scheme === 'mono') return opts.colors.right;
  const bucket = faceBucket(face);
  if (opts.scheme === 'shade') {
    const prefix = opts.idPrefix ?? defaultIdPrefix(opts.colors);
    return `url(#${prefix}-${bucket})`;
  }
  return opts.colors[bucket];
}

/** Compute polygons + viewBox without serializing — used by the React component. */
export function renderScene(opts: RenderOptions): RenderedScene {
  const { geometry, rotY, rotX, size, pad } = opts;
  const cubes = getCubes(geometry);
  const view = viewDirection(rotY, rotX);
  const project = createProjector(rotY, rotX);

  // Painter's order — back-to-front by depth of cube center along view dir.
  const items = cubes.map(([cx, cy, cz]) => {
    const center = [(cx + 0.5) * size, (cy + 0.5) * size, (cz + 0.5) * size] as const;
    const depth = center[0] * view[0] + center[1] * view[1] + center[2] * view[2];
    return { pos: [cx, cy, cz] as const, depth };
  });
  items.sort((a, b) => a.depth - b.depth);

  const polys: Polygon[] = [];
  for (const item of items) {
    const [cx, cy, cz] = item.pos;
    for (const face of FACES) {
      const dot = face.normal[0] * view[0] + face.normal[1] * view[1] + face.normal[2] * view[2];
      if (dot <= 0) continue;
      const points = face.verts.map(([dx, dy, dz]) => {
        const wx = (cx + dx) * size;
        const wy = (cy + dy) * size;
        const wz = (cz + dz) * size;
        const p = project(wx, wy, wz);
        return [p.sx, p.sy] as const;
      });
      polys.push({ face: face.name, points, fill: faceFill(face.name, opts) });
    }
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of polys) for (const [x, y] of p.points) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return {
    polys,
    viewBox: {
      x: minX - pad,
      y: minY - pad,
      w: (maxX - minX) + pad * 2,
      h: (maxY - minY) + pad * 2,
    },
  };
}

/** Backward-compatible name retained for the public render API. */
export function shadeStop(hex: string, factor: number): string {
  return shadeHex(hex, factor);
}

/** One canonical set of gradients for both string and React SVG renderers. */
export function gradientSpecs(colors: Colors, idPrefix?: string): readonly GradientSpec[] {
  const prefix = idPrefix ?? defaultIdPrefix(colors);
  return [
    {
      id: `${prefix}-top`, x1: '0%', y1: '0%', x2: '0%', y2: '100%',
      stops: [
        { offset: '0%', color: shadeStop(colors.top, 0.4) },
        { offset: '100%', color: colors.top },
      ],
    },
    {
      id: `${prefix}-right`, x1: '100%', y1: '0%', x2: '0%', y2: '100%',
      stops: [
        { offset: '0%', color: shadeStop(colors.right, 0.3) },
        { offset: '55%', color: colors.right },
        { offset: '100%', color: shadeStop(colors.right, 1.25) },
      ],
    },
    {
      id: `${prefix}-left`, x1: '0%', y1: '0%', x2: '100%', y2: '100%',
      stops: [
        { offset: '0%', color: shadeStop(colors.left, 0.25) },
        { offset: '60%', color: colors.left },
        { offset: '100%', color: shadeStop(colors.left, 1.4) },
      ],
    },
  ];
}

export function gradientDefs(colors: Colors, idPrefix?: string): string {
  const gradients = gradientSpecs(colors, idPrefix).map(gradient => `    <linearGradient id="${gradient.id}" x1="${gradient.x1}" y1="${gradient.y1}" x2="${gradient.x2}" y2="${gradient.y2}">
${gradient.stops.map(stop => `      <stop offset="${stop.offset}" stop-color="${stop.color}"/>`).join('\n')}
    </linearGradient>`).join('\n');
  return `<defs>\n${gradients}\n  </defs>`;
}

/** Build a complete `<svg>…</svg>` markup string. */
export function buildSvg(opts: RenderOptions): string {
  const { polys, viewBox } = renderScene(opts);
  const { x: vbX, y: vbY, w, h } = viewBox;

  const bg = opts.bgMode === 'transparent'
    ? ''
    : `<rect x="${round(vbX)}" y="${round(vbY)}" width="${round(w)}" height="${round(h)}" fill="${opts.bgColor}"/>`;

  const defs = opts.scheme === 'shade' ? gradientDefs(opts.colors, opts.idPrefix) : '';

  const strokeAttr = opts.strokeWidth > 0
    ? ` stroke="${opts.stroke}" stroke-width="${opts.strokeWidth}" stroke-linejoin="round"`
    : '';

  const polyTags = polys.map(p => {
    const pts = p.points.map(([x, y]) => `${round(x)},${round(y)}`).join(' ');
    return `<polygon points="${pts}" fill="${p.fill}"${strokeAttr}/>`;
  }).join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${round(vbX)} ${round(vbY)} ${round(w)} ${round(h)}" width="${round(w)}" height="${round(h)}">
  ${defs}
  ${bg}
  ${polyTags}
</svg>`;
}
