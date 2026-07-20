export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

const BLACK: Rgb = { r: 0, g: 0, b: 0 };

/** Expand a three-digit hex color while leaving all other values untouched. */
export function expandHex(hex: string): string {
  const value = hex.trim();
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return `#${value.slice(1).split('').map(char => char + char).join('')}`;
  }
  return value;
}

/** Parse #rgb / #rrggbb, returning the supplied fallback for other CSS colors. */
export function parseHexColor(hex: string, fallback: Rgb = BLACK): Rgb {
  const match = /^#([0-9a-f]{6})$/i.exec(expandHex(hex));
  if (!match) return fallback;
  const integer = Number.parseInt(match[1], 16);
  return { r: integer >> 16, g: (integer >> 8) & 255, b: integer & 255 };
}

export function rgbToRgba(color: Rgb, alpha: number, shade = 1): string {
  const channel = (value: number) => Math.round(Math.max(0, Math.min(255, value * shade)));
  return `rgba(${channel(color.r)}, ${channel(color.g)}, ${channel(color.b)}, ${alpha})`;
}

export function hexToRgba(hex: string, alpha: number): string {
  return rgbToRgba(parseHexColor(hex), alpha);
}

/** Opaque equivalent of drawing the color at `factor` opacity over black. */
export function mixHexWithBlack(hex: string, factor: number): string {
  const color = parseHexColor(hex);
  return `rgb(${Math.round(color.r * factor)}, ${Math.round(color.g * factor)}, ${Math.round(color.b * factor)})`;
}

/** Lighten / darken a hex color by a multiplier (<1 darkens, >1 lightens). */
export function shadeHex(hex: string, factor: number): string {
  const color = parseHexColor(hex);
  const adjust = (channel: number) => factor < 1
    ? Math.round(channel * factor)
    : Math.round(channel + (255 - channel) * (factor - 1));
  return `#${[color.r, color.g, color.b]
    .map(channel => Math.max(0, Math.min(255, adjust(channel))).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function hslToHex(hue: number, saturation: number, lightness: number): string {
  const saturationNormal = saturation / 100;
  const lightnessNormal = lightness / 100;
  const k = (n: number) => (n + hue / 30) % 12;
  const amplitude = saturationNormal * Math.min(lightnessNormal, 1 - lightnessNormal);
  const channel = (n: number) => {
    const value = lightnessNormal - amplitude * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return Math.round(255 * value).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

export function hexToHue(hex: string): number {
  const color = parseHexColor(hex);
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 0;

  let hue: number;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  return (hue * 60 + 360) % 360;
}
