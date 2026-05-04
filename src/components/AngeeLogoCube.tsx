// Animated CSS-3D cube logo. Pure CSS keyframes for the rotation, no
// per-frame JS. Heritage: ported from the original DjangoFlow webflow
// component, with opaque-face fix (no more cubes bleeding through each other).

import { type FC, type CSSProperties } from 'react';
import './AngeeLogoCube.css';

export interface AngeeLogoCubeProps {
  /** Edge length of one sub-cube in px. Default 100. */
  size?: number;
  /** Gap between sub-cubes in px. Default 2. */
  gap?: number;
  /** Color for the −X-facing planes (the "blue" side in the original). */
  leftColor?: string;
  /** Color for the +X-facing planes (the "red" side). */
  rightColor?: string;
  /** Base dark color for top/bottom faces. */
  baseDark?: string;
  /** Seconds per full rotation. Default 20. */
  animationSpeed?: number;
  /** What animation to play. */
  animationType?: 'rotate' | 'slide' | 'rotate-slide' | 'none';
  initialRotation?: { x: number; y: number };
  className?: string;
  style?: CSSProperties;
}

type Block = readonly [number, number, number];

// Same tripod geometry as <AngeeLogo>.
const SHAPE_1: readonly Block[] = [
  [0, 2, 2], [1, 2, 2], [2, 2, 2],
  [0, 1, 2], [0, 0, 2],
  [0, 2, 1], [0, 2, 0],
];
const SHAPE_2: readonly Block[] = [
  [2, 0, 0], [1, 0, 0], [0, 0, 0],
  [2, 1, 0], [2, 2, 0],
  [2, 0, 1], [2, 0, 2],
];

/** Solid (non-transparent) blend of `hex` toward black. Same look as
 *  `rgba(color, factor)` over black, but opaque — prevents cubes from
 *  bleeding through each other when CSS depth-sort fights gradients. */
function mixWithBlack(hex: string, factor: number): string {
  const h = expand3(hex);
  const r = Math.round((parseInt(h.slice(1, 3), 16) || 0) * factor);
  const g = Math.round((parseInt(h.slice(3, 5), 16) || 0) * factor);
  const b = Math.round((parseInt(h.slice(5, 7), 16) || 0) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = expand3(hex);
  const r = parseInt(h.slice(1, 3), 16) || 0;
  const g = parseInt(h.slice(3, 5), 16) || 0;
  const b = parseInt(h.slice(5, 7), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** `#abc` → `#aabbcc`. Leaves 6-char hex untouched. */
function expand3(hex: string): string {
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    return '#' + hex.slice(1).split('').map(c => c + c).join('');
  }
  return hex;
}

export const AngeeLogoCube: FC<AngeeLogoCubeProps> = ({
  size = 100,
  gap = 2,
  leftColor = '#0033ff',
  rightColor = '#ff2200',
  baseDark = '#050505',
  animationSpeed = 20,
  animationType = 'rotate',
  initialRotation = { x: -35.264, y: -45 },
  className,
  style,
}) => {
  const step = size + gap;

  const styleVariables = {
    '--cube-size': `${size}px`,
    '--left-color': leftColor,
    '--left-color-dark': mixWithBlack(leftColor, 0.2),
    '--left-shadow': hexToRgba(leftColor, 0.4),
    '--right-color': rightColor,
    '--right-color-dark': mixWithBlack(rightColor, 0.2),
    '--right-shadow': hexToRgba(rightColor, 0.4),
    '--base-dark': baseDark,
    '--anim-duration': `${animationSpeed}s`,
    '--rot-x': `${initialRotation.x}deg`,
    '--rot-y': `${initialRotation.y}deg`,
    '--gap': `${gap}px`,
    '--step': 'calc(var(--cube-size) + var(--gap))',
    '--center-origin': 'calc(var(--step) + var(--cube-size) / 2)',
    '--center-offset': 'calc(-1 * var(--step))',
    ...style,
  } as CSSProperties;

  const renderCube = (pos: Block) => {
    const cubeKey = `${pos[0]}-${pos[1]}-${pos[2]}`;
    const transform = `translate3d(${pos[0] * step}px, ${pos[1] * step}px, ${pos[2] * step}px)`;
    return (
      <div key={cubeKey} className="angee-cube" style={{ transform }}>
        <div className="angee-face angee-face-front" />
        <div className="angee-face angee-face-back" />
        <div className="angee-face angee-face-right" />
        <div className="angee-face angee-face-left" />
        <div className="angee-face angee-face-top" />
        <div className="angee-face angee-face-bottom" />
      </div>
    );
  };

  const containerCls = ['angee-shape-container'];
  if (animationType === 'rotate' || animationType === 'rotate-slide') {
    containerCls.push('angee-anim-rotate');
  }
  const shapeCls = (n: 1 | 2) => {
    const c = [`angee-shape-${n}`];
    if (animationType === 'slide' || animationType === 'rotate-slide') c.push('angee-anim-slide');
    return c.join(' ');
  };

  return (
    <div className={['angee-scene', className].filter(Boolean).join(' ')} style={styleVariables}>
      <div className={containerCls.join(' ')}>
        <div className={shapeCls(1)}>
          {SHAPE_1.map(renderCube)}
        </div>
        <div className={shapeCls(2)}>
          {SHAPE_2.map(renderCube)}
        </div>
      </div>
    </div>
  );
};

export default AngeeLogoCube;
