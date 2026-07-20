import { type CSSProperties, type FC, useEffect, useRef } from 'react';
import { BRAND_COLORS } from '../lib/presets.js';
import { createFractalRenderer, type FractalFrameOptions, type FractalStart } from './fractalRenderer.js';
import './AngeeLogoFractal.css';

export type AngeeLogoFractalStart = FractalStart;

export interface AngeeLogoFractalProps {
  /** Edge length of each of the 14 top-level building blocks. Default 72. */
  size?: number;
  /** Gap between top-level building blocks. Default 2. */
  gap?: number;
  /** Color used for upward-facing planes and one third of the dust. */
  topColor?: string;
  /** Color used for the X-facing planes and one third of the dust. */
  rightColor?: string;
  /** Color used for the Z-facing planes and one third of the dust. */
  leftColor?: string;
  /** Seconds for one complete break-apart and reassembly cycle. Default 20. */
  animationSpeed?: number;
  /** Initial phase: break apart from the cube, or reassemble from dust. Default `cube`. */
  startFrom?: AngeeLogoFractalStart;
  /** Initial CSS-style rotation, in degrees. */
  initialRotation?: { x: number; y: number };
  /** Accessible description for the animated canvas. */
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Canvas-rendered fractal logo animation. The 14 logo blocks separate, each
 * becomes a miniature Angee logo, and those logos recurse once more into
 * thousands of dust-sized blocks before the sequence reverses.
 */
export const AngeeLogoFractal: FC<AngeeLogoFractalProps> = ({
  size = 72,
  gap = 2,
  topColor = BRAND_COLORS.top,
  rightColor = BRAND_COLORS.right,
  leftColor = BRAND_COLORS.left,
  animationSpeed = 20,
  startFrom = 'cube',
  initialRotation = { x: -30, y: -15 },
  ariaLabel = 'Angee logo breaking into recursively smaller cubes and reassembling',
  className,
  style,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initialRotationX = initialRotation.x;
  const initialRotationY = initialRotation.y;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const renderFrame = createFractalRenderer();
    const options: FractalFrameOptions = {
      size,
      gap,
      topColor,
      rightColor,
      leftColor,
      initialRotation: { x: initialRotationX, y: initialRotationY },
      cycleDuration: animationSpeed,
      startFrom,
    };
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let animationFrame = 0;
    let startedAt = performance.now();
    let visible = true;
    let pausedAt: number | null = null;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const bitmapWidth = Math.round(width * pixelRatio);
      const bitmapHeight = Math.round(height * pixelRatio);
      if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight) {
        canvas.width = bitmapWidth;
        canvas.height = bitmapHeight;
      }
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = (now: number) => {
      if (visible) {
        renderFrame(context, width, height, (now - startedAt) / 1000, options, motionPreference.matches);
      }
      animationFrame = requestAnimationFrame(draw);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const intersectionObserver = new IntersectionObserver(entries => {
      const nextVisible = entries[0]?.isIntersecting ?? true;
      if (nextVisible === visible) return;
      const now = performance.now();
      if (nextVisible && pausedAt !== null) {
        startedAt += now - pausedAt;
        pausedAt = null;
      } else if (!nextVisible) {
        pausedAt = now;
      }
      visible = nextVisible;
    });
    intersectionObserver.observe(canvas);

    const handleMotionChange = () => {
      startedAt = performance.now();
    };
    motionPreference.addEventListener('change', handleMotionChange);
    resize();
    animationFrame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      motionPreference.removeEventListener('change', handleMotionChange);
    };
  }, [animationSpeed, gap, initialRotationX, initialRotationY, leftColor, rightColor, size, startFrom, topColor]);

  const classes = ['angee-fractal-scene', className].filter(Boolean).join(' ');
  return (
    <div className={classes} style={style} role="img" aria-label={ariaLabel}>
      <canvas ref={canvasRef} className="angee-fractal-canvas" aria-hidden="true" />
    </div>
  );
};

export default AngeeLogoFractal;
