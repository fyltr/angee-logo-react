import type { AngeeLogoFractalStart } from './components/AngeeLogoFractal.js';
import { PRESETS, ROTATIONS, type PresetKey, type RotationKey } from './lib/presets.js';
import type { Geometry } from './lib/geometry.js';
import type { Colors, Scheme } from './lib/render.js';

export type LogoView = 'static' | 'cube' | 'fractal';
export type PresetSelection = PresetKey | 'custom';
export type RotationSelection = RotationKey | 'custom';

export interface ConfiguratorState {
  preset: PresetSelection;
  geometry: Geometry;
  rotation: RotationSelection;
  rotY: number;
  rotX: number;
  scheme: Scheme;
  colors: Colors;
  bgMode: 'color' | 'transparent';
  bgColor: string;
  stroke: string;
  strokeWidth: number;
  size: number;
  pad: number;
  filename: string;
}

export interface ShareableConfiguratorState {
  readonly config: ConfiguratorState;
  readonly view: LogoView;
  readonly fractalStart: AngeeLogoFractalStart;
}

const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[];
const ROTATION_KEYS = Object.keys(ROTATIONS) as RotationKey[];
const GEOMETRIES: readonly Geometry[] = ['full', 'tripod1', 'tripod2', 'cube'];
const SCHEMES: readonly Scheme[] = ['3tone', 'mono', 'shade'];

function isOneOf<T extends string>(value: string | null, options: readonly T[]): value is T {
  return value !== null && options.includes(value as T);
}

function configForPreset(preset: PresetSelection): ConfiguratorState {
  const presetConfig = preset === 'custom' ? PRESETS.gold : PRESETS[preset];
  const rotation = ROTATIONS[presetConfig.rotation];
  return {
    preset,
    geometry: presetConfig.geometry,
    rotation: presetConfig.rotation,
    rotY: rotation.rotY,
    rotX: rotation.rotX,
    scheme: presetConfig.scheme,
    colors: { ...presetConfig.colors },
    bgMode: 'color',
    bgColor: presetConfig.bgColor,
    stroke: presetConfig.stroke,
    strokeWidth: presetConfig.strokeWidth,
    size: 100,
    pad: 40,
    filename: presetConfig.filename,
  };
}

export const DEFAULT_CONFIGURATOR_STATE = configForPreset('gold');

export const DEFAULT_SHAREABLE_STATE: ShareableConfiguratorState = {
  config: DEFAULT_CONFIGURATOR_STATE,
  view: 'static',
  fractalStart: 'cube',
};

function readNumber(
  params: URLSearchParams,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = params.get(key);
  if (raw === null || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

function readColor(params: URLSearchParams, key: string, fallback: string): string {
  const value = params.get(key);
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function readFilename(params: URLSearchParams, fallback: string): string {
  const value = params.get('filename');
  return value === null ? fallback : value.slice(0, 120);
}

export function parseConfiguratorSearch(search: string): ShareableConfiguratorState {
  const params = new URLSearchParams(search);
  const presetParam = params.get('preset');
  const preset: PresetSelection = presetParam === 'custom' || isOneOf(presetParam, PRESET_KEYS)
    ? presetParam
    : 'gold';
  const base = configForPreset(preset);

  const rotationParam = params.get('rotation');
  const rotation: RotationSelection = rotationParam === 'custom' || isOneOf(rotationParam, ROTATION_KEYS)
    ? rotationParam
    : base.rotation;
  const rotationBase = rotation === 'custom' ? base : ROTATIONS[rotation];

  const viewParam = params.get('view');
  const view: LogoView = viewParam === 'animated'
    ? 'cube'
    : isOneOf(viewParam, ['static', 'cube', 'fractal'] as const) ? viewParam : 'static';

  return {
    view,
    fractalStart: params.get('start') === 'dust' ? 'dust' : 'cube',
    config: {
      preset,
      geometry: isOneOf(params.get('geometry'), GEOMETRIES)
        ? params.get('geometry') as Geometry
        : base.geometry,
      rotation,
      rotY: readNumber(params, 'rotY', rotationBase.rotY, -180, 180),
      rotX: readNumber(params, 'rotX', rotationBase.rotX, -89, 89),
      scheme: isOneOf(params.get('scheme'), SCHEMES)
        ? params.get('scheme') as Scheme
        : base.scheme,
      colors: {
        top: readColor(params, 'top', base.colors.top),
        right: readColor(params, 'right', base.colors.right),
        left: readColor(params, 'left', base.colors.left),
      },
      bgMode: params.get('backgroundMode') === 'transparent' ? 'transparent' : 'color',
      bgColor: readColor(params, 'background', base.bgColor),
      stroke: readColor(params, 'stroke', base.stroke),
      strokeWidth: readNumber(params, 'strokeWidth', base.strokeWidth, 0, 3),
      size: readNumber(params, 'size', base.size, 20, 200),
      pad: readNumber(params, 'pad', base.pad, 0, 200),
      filename: readFilename(params, base.filename),
    },
  };
}

function sameColor(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function formatNumber(value: number): string {
  return Number(value.toFixed(3)).toString();
}

export function serializeConfiguratorSearch(state: ShareableConfiguratorState): string {
  const params = new URLSearchParams();
  const { config } = state;
  const base = configForPreset(config.preset);

  if (state.view !== 'static') params.set('view', state.view);
  if (state.fractalStart !== 'cube') params.set('start', state.fractalStart);
  if (config.preset !== 'gold') params.set('preset', config.preset);
  if (config.geometry !== base.geometry) params.set('geometry', config.geometry);
  if (config.rotation !== base.rotation) params.set('rotation', config.rotation);

  const rotationBase = config.rotation === 'custom' ? base : ROTATIONS[config.rotation];
  if (config.rotY !== rotationBase.rotY) params.set('rotY', formatNumber(config.rotY));
  if (config.rotX !== rotationBase.rotX) params.set('rotX', formatNumber(config.rotX));
  if (config.scheme !== base.scheme) params.set('scheme', config.scheme);
  if (!sameColor(config.colors.top, base.colors.top)) params.set('top', config.colors.top);
  if (!sameColor(config.colors.right, base.colors.right)) params.set('right', config.colors.right);
  if (!sameColor(config.colors.left, base.colors.left)) params.set('left', config.colors.left);
  if (config.bgMode !== base.bgMode) params.set('backgroundMode', config.bgMode);
  if (!sameColor(config.bgColor, base.bgColor)) params.set('background', config.bgColor);
  if (!sameColor(config.stroke, base.stroke)) params.set('stroke', config.stroke);
  if (config.strokeWidth !== base.strokeWidth) params.set('strokeWidth', formatNumber(config.strokeWidth));
  if (config.size !== base.size) params.set('size', formatNumber(config.size));
  if (config.pad !== base.pad) params.set('pad', formatNumber(config.pad));
  if (config.filename !== base.filename) params.set('filename', config.filename);

  return params.toString();
}

export function buildConfiguratorUrl(baseUrl: string, state: ShareableConfiguratorState): string {
  const url = new URL(baseUrl);
  const query = serializeConfiguratorSearch(state);
  url.search = query ? `?${query}` : '';
  return url.toString();
}
