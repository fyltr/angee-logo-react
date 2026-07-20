// Named presets — both rotation/camera and complete styling.

import type { Colors, Scheme } from './render.js';
import type { Geometry } from './geometry.js';

export interface RotationPreset {
  rotY: number;
  rotX: number;
}

/** `as const satisfies` keeps the literal key union (`'iso' | 'rotated' | …`)
 *  in `keyof typeof ROTATIONS` while still type-checking each value against
 *  `RotationPreset`. */
export const ROTATIONS = {
  /** Classic 30°/30° isometric — body diagonal is along the camera axis, so
   *  diagonally-opposite cubes project to the same screen point. */
  iso:     { rotY: -45,  rotX: -35.264 },
  /** Slightly off-iso — both tripods stay visible, no full-cover overlaps. */
  rotated: { rotY: -15,  rotX: -30 },
  /** Looking down the body diagonal of one tripod — its corner cube points
   *  straight at the observer, the other tripod sits behind. */
  star:    { rotY:  45,  rotX:  35.264 },
  /** Flatter "cabinet"-ish view. */
  cabinet: { rotY: -30,  rotX: -15 },
} as const satisfies Record<string, RotationPreset>;

export type RotationKey = keyof typeof ROTATIONS;

export interface Preset {
  geometry: Geometry;
  rotation: RotationKey;
  scheme: Scheme;
  colors: Colors;
  bgColor: string;
  stroke: string;
  strokeWidth: number;
  filename: string;
}

export const BRAND_COLORS = {
  top: '#FCD34D',
  right: '#E6B400',
  left: '#9A7D0A',
} as const satisfies Colors;

export const BRAND_BACKGROUND = '#0A0A0F';

const MONO_GOLD = {
  top: BRAND_COLORS.right,
  right: BRAND_COLORS.right,
  left: BRAND_COLORS.right,
} as const satisfies Colors;

/** Built-in presets matching the variants discussed during design. */
export const PRESETS = {
  webflow: {
    geometry: 'full', rotation: 'iso', scheme: 'shade',
    colors: { top: '#0a0a0a', right: '#ff2200', left: '#0033ff' },
    bgColor: '#000000', stroke: BRAND_BACKGROUND, strokeWidth: 0,
    filename: 'Angee-Logo-Webflow',
  },
  gold: {
    geometry: 'full', rotation: 'rotated', scheme: '3tone',
    colors: BRAND_COLORS,
    bgColor: BRAND_BACKGROUND, stroke: BRAND_BACKGROUND, strokeWidth: 0,
    filename: 'Angee-Logo-Gold',
  },
  goldIso: {
    geometry: 'full', rotation: 'iso', scheme: '3tone',
    colors: BRAND_COLORS,
    bgColor: BRAND_BACKGROUND, stroke: BRAND_BACKGROUND, strokeWidth: 0,
    filename: 'Angee-Logo-Gold-Iso',
  },
  mono: {
    geometry: 'full', rotation: 'rotated', scheme: 'mono',
    colors: MONO_GOLD,
    bgColor: BRAND_BACKGROUND, stroke: BRAND_BACKGROUND, strokeWidth: 1.5,
    filename: 'Angee-Logo-Mono',
  },
  shade: {
    geometry: 'full', rotation: 'rotated', scheme: 'shade',
    colors: BRAND_COLORS,
    bgColor: BRAND_BACKGROUND, stroke: BRAND_BACKGROUND, strokeWidth: 0,
    filename: 'Angee-Logo-Shade',
  },
  star: {
    geometry: 'full', rotation: 'star', scheme: '3tone',
    colors: { top: BRAND_COLORS.right, right: BRAND_COLORS.top, left: BRAND_COLORS.left },
    bgColor: BRAND_BACKGROUND, stroke: BRAND_BACKGROUND, strokeWidth: 0,
    filename: 'Angee-Logo-Star',
  },
  corner: {
    geometry: 'tripod1', rotation: 'iso', scheme: '3tone',
    colors: BRAND_COLORS,
    bgColor: BRAND_BACKGROUND, stroke: BRAND_BACKGROUND, strokeWidth: 0,
    filename: 'Angee-Logo-Corner',
  },
} as const satisfies Record<string, Preset>;

export type PresetKey = keyof typeof PRESETS;

export interface Palette {
  readonly name: string;
  readonly top: string;
  readonly right: string;
  readonly left: string;
}

/** Quick-pick palettes shown as swatches in the configurator. */
export const PALETTES: readonly Palette[] = [
  { name: 'Gold (angee)',  ...BRAND_COLORS },
  { name: 'Webflow',       top: '#0a0a0a', right: '#ff2200', left: '#0033ff' },
  { name: 'Indigo / Cyan', top: '#a5b4fc', right: '#6366f1', left: '#0ea5e9' },
  { name: 'Mint',          top: '#86efac', right: '#10b981', left: '#0f766e' },
  { name: 'Magenta',       top: '#f0abfc', right: '#d946ef', left: '#7e22ce' },
  { name: 'Mono — gold',   ...MONO_GOLD },
  { name: 'Mono — white',  top: '#f5f5f5', right: '#bdbdbd', left: '#7d7d7d' },
];
