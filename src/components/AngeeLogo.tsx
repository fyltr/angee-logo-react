// Static SVG Angee logo. Pure component, no canvas / no JS animation.
// Pass `preset` for one of the named looks, or any combination of the
// granular props. `bgColor={null}` means transparent.

import { useId, type FC, type SVGProps } from 'react';
import {
  renderScene,
  gradientSpecs,
  type RenderOptions,
  type Scheme,
  type Colors,
} from '../lib/render.js';
import { BRAND_BACKGROUND, BRAND_COLORS, ROTATIONS, PRESETS } from '../lib/presets.js';
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
    colors: { ...BRAND_COLORS, ...presetCfg?.colors, ...colors },
    bgMode: bgColor === null ? 'transparent' : 'color',
    bgColor: bgColor ?? presetCfg?.bgColor ?? BRAND_BACKGROUND,
    stroke: stroke ?? presetCfg?.stroke ?? BRAND_BACKGROUND,
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
          {gradientSpecs(opts.colors, opts.idPrefix).map(gradient => (
            <linearGradient
              key={gradient.id}
              id={gradient.id}
              x1={gradient.x1}
              y1={gradient.y1}
              x2={gradient.x2}
              y2={gradient.y2}
            >
              {gradient.stops.map(stop => (
                <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
              ))}
            </linearGradient>
          ))}
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
