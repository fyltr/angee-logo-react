// CSS-equivalent rotateY(rotY) rotateX(rotX) projection. Returns 2D screen
// coordinates plus a depth value used for painter's-order back-to-front sort.

import type { Vec3 } from './geometry.js';

export interface ProjectedPoint {
  readonly sx: number;
  readonly sy: number;
  readonly depth: number;
}

const D2R = Math.PI / 180;

/** Project a 3D world-space point onto the screen for the given rotation. */
export function project(x: number, y: number, z: number, rotY: number, rotX: number): ProjectedPoint {
  const ry = rotY * D2R;
  const rx = rotX * D2R;
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cx = Math.cos(rx), sx = Math.sin(rx);
  // rotateY:
  const x1 = cy * x + sy * z;
  const y1 = y;
  const z1 = -sy * x + cy * z;
  // rotateX:
  const x2 = x1;
  const y2 = cx * y1 - sx * z1;
  const z2 = sx * y1 + cx * z1;
  return { sx: x2, sy: y2, depth: z2 };
}

/**
 * Direction in scene-space pointing FROM the origin TOWARD the camera, given a
 * CSS `rotateY(rotY) rotateX(rotX)` transform applied to the scene. Used to
 * decide which faces are visible and to depth-sort cubes (larger dot product
 * with this vector ⇒ closer to camera).
 */
export function viewDirection(rotY: number, rotX: number): Vec3 {
  const ry = rotY * D2R;
  const rx = rotX * D2R;
  // R^-1 · (0,0,1) = R_y(-ry) · R_x(-rx) · (0,0,1)
  // R_x(-rx) · (0,0,1) = (0, sin rx, cos rx)
  const a = 0, b = Math.sin(rx), c = Math.cos(rx);
  // R_y(-ry) on (a, b, c):
  const cy = Math.cos(ry), sy = Math.sin(ry);
  return [cy * a - sy * c, b, sy * a + cy * c];
}
