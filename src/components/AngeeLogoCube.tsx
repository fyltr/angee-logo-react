// Animated CSS-3D cube logo. Pure CSS keyframes drive the rotation,
// slide and wander; the optional color-drift effect is the only piece
// that needs JS (a continuous hue rotation through HSL space, applied
// to the CSS custom properties for the left/right faces).
//
// Three independent animations compose:
//   - rotate / slide   (from `animationType`, on the shape container)
//   - color drift      (opt-in via `animateColors`, on the scene)
//   - viewport wander  (opt-in via `wander`, on the scene)
//
// Heritage: ported from the original DjangoFlow webflow component, with
// opaque-face fix (no more cubes bleeding through each other) plus the
// color-drift + wander upgrades originally landed in angee-nextjs.

import { type FC, type CSSProperties, useEffect, useRef } from 'react';
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
  /** Which static animation to play on the cube shape. */
  animationType?: 'rotate' | 'slide' | 'rotate-slide' | 'none';
  initialRotation?: { x: number; y: number };
  /**
   * Continuously hue-rotate the left/right face colors. The two sides
   * drift in opposite directions at slightly different speeds so the
   * cube cycles through a wide palette without ever syncing up. Off by
   * default — opt in for marketing/hero contexts.
   */
  animateColors?: boolean;
  /**
   * Degrees per second of hue drift when `animateColors` is on. Default
   * 8 — slow enough to read as a gentle shift, not a strobe.
   */
  colorDriftSpeed?: number;
  /**
   * Translate the whole scene through a 7-waypoint path that spans the
   * viewport (vw/vh units), looping forever. Honors
   * `prefers-reduced-motion` (parks at the path's midpoint). Off by
   * default — opt in for page-level decorative backdrops.
   */
  wander?: boolean;
  /** Seconds per full wander loop. Default 90. */
  wanderSpeed?: number;
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

/** `#abc` → `#aabbcc`. Leaves 6-char hex untouched. */
function expand3(hex: string): string {
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    return '#' + hex.slice(1).split('').map(c => c + c).join('');
  }
  return hex;
}

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

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n: number) => {
    const c = lN - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHue(hex: string): number {
  const h = expand3(hex);
  const r = (parseInt(h.slice(1, 3), 16) || 0) / 255;
  const g = (parseInt(h.slice(3, 5), 16) || 0) / 255;
  const b = (parseInt(h.slice(5, 7), 16) || 0) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let hue: number;
  if (max === r) hue = ((g - b) / d) % 6;
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  hue *= 60;
  return (hue + 360) % 360;
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
  animateColors = false,
  colorDriftSpeed = 8,
  wander = false,
  wanderSpeed = 90,
  className,
  style,
}) => {
  const sceneRef = useRef<HTMLDivElement>(null);

  // Color drift: opposite-direction hue rotation on left and right
  // faces at slightly mismatched speeds so they never sync up. Driven
  // by requestAnimationFrame; cancels on unmount or prop change.
  useEffect(() => {
    if (!animateColors) return;
    const el = sceneRef.current;
    if (!el) return;

    let leftHue = hexToHue(leftColor);
    let rightHue = hexToHue(rightColor);
    let prev = performance.now();
    let rafId = 0;

    const apply = (hue: number, prefix: 'left' | 'right') => {
      const color = hslToHex(hue, 88, 55);
      el.style.setProperty(`--${prefix}-color`, color);
      el.style.setProperty(`--${prefix}-color-dark`, mixWithBlack(color, 0.2));
      el.style.setProperty(`--${prefix}-shadow`, hexToRgba(color, 0.4));
    };

    const tick = (now: number) => {
      const dt = (now - prev) / 1000;
      prev = now;
      leftHue = (leftHue + colorDriftSpeed * dt + 360) % 360;
      rightHue = (rightHue - colorDriftSpeed * 1.3 * dt + 360) % 360;
      apply(leftHue, 'left');
      apply(rightHue, 'right');
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [animateColors, colorDriftSpeed, leftColor, rightColor]);

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
    '--wander-duration': `${wanderSpeed}s`,
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

  const sceneCls = ['angee-scene'];
  if (wander) sceneCls.push('angee-anim-wander');
  if (className) sceneCls.push(className);

  return (
    <div ref={sceneRef} className={sceneCls.join(' ')} style={styleVariables}>
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
