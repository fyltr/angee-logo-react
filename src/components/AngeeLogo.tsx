// Static SVG Angee logo. Pure component, no canvas / no JS animation.
// Pass `preset` for one of the named looks, or any combination of the
// granular props. `bgColor={null}` means transparent.

import { useId, type FC, type SVGProps } from 'react';
import {
  renderScene,
  shadeStop,
  type RenderOptions,
  type Scheme,
  type Colors,
} from '../lib/render.js';
import { ROTATIONS, PRESETS } from '../lib/presets.js';
import type { Geometry } from '../lib/geometry.js';

export interface AngeeLogoProps extends Omit<SVGProps<SVGSVGElement>, 'viewBox'> {
  /** Pre-canned look. Granular props override individual fields. */
  preset?: keyof typeof PRESETS;
  /** Named camera angle (default `rotated` — both tripods visible, no overlap). */
  rotation?: keyof typeof ROTATIONS;
  rotY?: number;
  rotX?: number;
  scheme?: Scheme;
  colors?: Partial<Colors>;
  geometry?: Geometry;
  size?: number;
  pad?: number;
  /** `null` = transparent. Omitted = use preset default. */
  bgColor?: string | null;
  stroke?: string;
  strokeWidth?: number;
}

const DEFAULT_COLORS: Colors = { top: '#FCD34D', right: '#E6B400', left: '#9A7D0A' };

const round = (n: number) => Math.round(n * 100) / 100;

export const AngeeLogo: FC<AngeeLogoProps> = ({
  preset,
  rotation,
  rotY,
  rotX,
  scheme,
  colors,
  geometry,
  size = 100,
  pad = 40,
  // No defaults for these — we want preset values to win when the prop is undefined.
  bgColor,
  stroke,
  strokeWidth,
  ...svgProps
}) => {
  const presetCfg = preset ? PRESETS[preset] : undefined;
  const reactId = useId();

  const rotKey = rotation ?? presetCfg?.rotation ?? 'rotated';
  const rotPreset = ROTATIONS[rotKey];

  const opts: RenderOptions = {
    geometry: geometry ?? presetCfg?.geometry ?? 'full',
    rotY: rotY ?? rotPreset.rotY,
    rotX: rotX ?? rotPreset.rotX,
    size,
    pad,
    scheme: scheme ?? presetCfg?.scheme ?? '3tone',
    colors: { ...DEFAULT_COLORS, ...presetCfg?.colors, ...colors },
    bgMode: bgColor === null ? 'transparent' : 'color',
    bgColor: bgColor ?? presetCfg?.bgColor ?? '#0A0A0F',
    stroke: stroke ?? presetCfg?.stroke ?? '#0A0A0F',
    strokeWidth: strokeWidth ?? presetCfg?.strokeWidth ?? 0,
    // useId() guarantees uniqueness even with identical color palettes on the
    // same page. Each <AngeeLogo /> instance owns its own gradient defs.
    idPrefix: `angee-${reactId.replace(/:/g, '')}`,
  };

  const { polys, viewBox } = renderScene(opts);
  const vb = `${round(viewBox.x)} ${round(viewBox.y)} ${round(viewBox.w)} ${round(viewBox.h)}`;

  const showStroke = opts.strokeWidth > 0;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={vb} {...svgProps}>
      {opts.scheme === 'shade' && (
        <defs>
          <linearGradient id={`${opts.idPrefix}-top`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={shadeStop(opts.colors.top, 0.4)} />
            <stop offset="100%" stopColor={opts.colors.top} />
          </linearGradient>
          <linearGradient id={`${opts.idPrefix}-right`} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={shadeStop(opts.colors.right, 0.3)} />
            <stop offset="55%" stopColor={opts.colors.right} />
            <stop offset="100%" stopColor={shadeStop(opts.colors.right, 1.25)} />
          </linearGradient>
          <linearGradient id={`${opts.idPrefix}-left`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={shadeStop(opts.colors.left, 0.25)} />
            <stop offset="60%" stopColor={opts.colors.left} />
            <stop offset="100%" stopColor={shadeStop(opts.colors.left, 1.4)} />
          </linearGradient>
        </defs>
      )}
      {opts.bgMode === 'color' && (
        <rect
          x={round(viewBox.x)}
          y={round(viewBox.y)}
          width={round(viewBox.w)}
          height={round(viewBox.h)}
          fill={opts.bgColor}
        />
      )}
      {polys.map((p, i) => (
        <polygon
          key={`${p.face}-${i}`}
          points={p.points.map(([x, y]) => `${round(x)},${round(y)}`).join(' ')}
          fill={p.fill}
          stroke={showStroke ? opts.stroke : undefined}
          strokeWidth={showStroke ? opts.strokeWidth : undefined}
          strokeLinejoin={showStroke ? 'round' : undefined}
        />
      ))}
    </svg>
  );
};

export default AngeeLogo;
