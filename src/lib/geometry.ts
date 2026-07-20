// Geometry of the Angee / DjangoFlow logo.
//
// Two interlocking 3D "tripod" corners inside a 3×3×3 grid. Each tripod is a
// corner cube plus three two-cube arms extending along the cube's three axes.

export type GridPos = readonly [x: number, y: number, z: number];

/** Tripod 1 — corner at [0,2,2] (bottom-front-left in CSS y-down). */
export const SHAPE1: readonly GridPos[] = [
  [0, 2, 2], [1, 2, 2], [2, 2, 2], // X-arm (right)
  [0, 1, 2], [0, 0, 2],             // Y-arm (up in CSS)
  [0, 2, 1], [0, 2, 0],             // Z-arm (back)
];

/** Tripod 2 — corner at [2,0,0] (top-back-right in CSS y-down). */
export const SHAPE2: readonly GridPos[] = [
  [2, 0, 0], [1, 0, 0], [0, 0, 0], // X-arm (left)
  [2, 1, 0], [2, 2, 0],             // Y-arm (down)
  [2, 0, 1], [2, 0, 2],             // Z-arm (front)
];

/** Complete 14-cube Angee mark. Shared by all static and animated renderers. */
export const LOGO_CUBES: readonly GridPos[] = [...SHAPE1, ...SHAPE2];

export type FaceName = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';
export type Vec3 = readonly [number, number, number];

export interface FaceDef {
  readonly name: FaceName;
  readonly normal: Vec3;
  /** Four 0/1 cube-corner offsets in CCW order viewed from outside the cube. */
  readonly verts: readonly Vec3[];
}

export const FACES: readonly FaceDef[] = [
  { name: 'top',    normal: [ 0, -1,  0], verts: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },
  { name: 'bottom', normal: [ 0,  1,  0], verts: [[0,1,0],[0,1,1],[1,1,1],[1,1,0]] },
  { name: 'left',   normal: [-1,  0,  0], verts: [[0,0,0],[0,0,1],[0,1,1],[0,1,0]] },
  { name: 'right',  normal: [ 1,  0,  0], verts: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
  { name: 'front',  normal: [ 0,  0,  1], verts: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]] },
  { name: 'back',   normal: [ 0,  0, -1], verts: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]] },
];

export type Geometry = 'full' | 'tripod1' | 'tripod2' | 'cube';

export function getCubes(geometry: Geometry): readonly GridPos[] {
  switch (geometry) {
    case 'tripod1': return SHAPE1;
    case 'tripod2': return SHAPE2;
    case 'cube':    return [[0, 0, 0]];
    case 'full':
    default:        return LOGO_CUBES;
  }
}

/** "Bucket" maps every cube face onto one of three color slots. Lets the
 *  3-tone scheme survive any rotation: whichever face is visible inherits the
 *  bucket's color. */
export function faceBucket(name: FaceName): 'top' | 'right' | 'left' {
  if (name === 'top'   || name === 'bottom') return 'top';
  if (name === 'right' || name === 'left')   return 'right';
  return 'left'; // front, back
}
