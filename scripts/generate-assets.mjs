// Generates static brand assets that ship in the demo site:
//
//   public/favicon.svg  — small SVG of the gold logo, transparent background
//   public/og.png       — 1200×630 Open Graph card with logo + title + URL
//
// Uses our own renderScene() / buildSvg() (from dist-lib/) so the OG image
// always matches whatever the live configurator renders. Run after the lib
// build:
//
//   npm run gen:assets
//
// (the npm script chains `npm run build:lib` so dist-lib/ exists.)

import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSvg, renderScene, PRESETS, ROTATIONS } from '../dist-lib/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

if (!fs.existsSync(PUBLIC)) fs.mkdirSync(PUBLIC, { recursive: true });

// ─── Favicon ─────────────────────────────────────────────────────────────────
// Small standalone SVG. Transparent background so it works in light or dark
// browser chrome.
{
  const preset = PRESETS.gold;
  const rot = ROTATIONS[preset.rotation];
  const svg = buildSvg({
    geometry: preset.geometry,
    rotY: rot.rotY,
    rotX: rot.rotX,
    size: 100,
    pad: 20,
    scheme: preset.scheme,
    colors: preset.colors,
    bgMode: 'transparent',
    bgColor: preset.bgColor,
    stroke: preset.stroke,
    strokeWidth: preset.strokeWidth,
  });
  const out = path.join(PUBLIC, 'favicon.svg');
  fs.writeFileSync(out, svg);
  console.log(`✓ ${path.relative(ROOT, out)}  (${svg.length} bytes)`);
}

// ─── OG image ────────────────────────────────────────────────────────────────
{
  const W = 1200, H = 630;

  // Render the actual logo polygons so the OG image is byte-identical to the
  // gold preset on the configurator.
  const preset = PRESETS.gold;
  const rot = ROTATIONS[preset.rotation];
  const { polys, viewBox } = renderScene({
    geometry: preset.geometry,
    rotY: rot.rotY,
    rotX: rot.rotX,
    size: 100,
    pad: 20,
    scheme: preset.scheme,
    colors: preset.colors,
    bgMode: 'transparent',
    bgColor: preset.bgColor,
    stroke: preset.stroke,
    strokeWidth: preset.strokeWidth,
  });

  // Place the logo in the left third, scaled to fit a 380×380 box.
  const LOGO = 380;
  const logoX = 100;
  const logoY = (H - LOGO) / 2;
  const fitScale = LOGO / Math.max(viewBox.w, viewBox.h);
  const tx = logoX + LOGO / 2 - (viewBox.x + viewBox.w / 2) * fitScale;
  const ty = logoY + LOGO / 2 - (viewBox.y + viewBox.h / 2) * fitScale;

  const polyMarkup = polys.map(p =>
    `<polygon points="${p.points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')}" fill="${p.fill}"/>`,
  ).join('\n        ');

  // Text-block geometry on the right half. font-family chain falls back from
  // Inter (if installed system-wide) to whatever sans-serif resvg finds.
  const FONT = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';

  const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="og-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#000000"/>
    </linearGradient>
    <pattern id="og-grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E6B400" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#og-bg)"/>
  <rect width="${W}" height="${H}" fill="url(#og-grid)"/>

  <g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${fitScale.toFixed(4)})">
        ${polyMarkup}
  </g>

  <g font-family='${FONT}'>
    <text x="560" y="270" font-size="72" font-weight="700" fill="#FCD34D">Angee Logo</text>
    <text x="560" y="320" font-size="28" font-weight="400" fill="#cbd5e1">Configurable React components</text>
    <text x="560" y="356" font-size="28" font-weight="400" fill="#cbd5e1">and live SVG configurator.</text>
    <text x="560" y="446" font-size="22" font-weight="500" fill="#E6B400">logo.angee.ai</text>
  </g>
</svg>`;

  const resvg = new Resvg(ogSvg, {
    fitTo: { mode: 'width', value: W },
    background: '#0A0A0F',
    font: {
      loadSystemFonts: true,
      defaultFontFamily: 'Helvetica',
    },
  });
  const png = resvg.render().asPng();
  const out = path.join(PUBLIC, 'og.png');
  fs.writeFileSync(out, png);
  console.log(`✓ ${path.relative(ROOT, out)}  (${(png.length / 1024).toFixed(1)} kB, ${W}×${H})`);

  // Also write the source SVG — useful for previewing / debugging.
  fs.writeFileSync(path.join(PUBLIC, 'og.svg'), ogSvg);
  console.log(`✓ ${path.relative(ROOT, path.join(PUBLIC, 'og.svg'))} (debug)`);
}
