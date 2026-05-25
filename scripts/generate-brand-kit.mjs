// Generates the complete Angee brand kit into public/brand/ (Vite copies
// public/ → dist/ on `npm run build`, so the kit ships at logo.angee.ai/brand/).
//
// Layout produced:
//
//   public/brand/
//     svg/<Preset>.svg                  one transparent SVG per preset
//     png/<Preset>-{1024,512,256}.png   transparent PNG raster, per preset
//     favicon/favicon.svg               gold logo, transparent
//     favicon/favicon-{16,32,48,180,512}.png
//     favicon/favicon.ico               16+32+48 packed
//     favicon/apple-touch-icon.png      180×180
//     og.png / og.svg                   1200×630 social card
//     manifest.json                     machine-readable index of everything
//     README.txt                        human-readable index
//
// Everything is rendered through our own buildSvg()/renderScene() (from
// dist-lib/) so the kit is byte-consistent with the live configurator. Run:
//
//   npm run gen:brand        (chains build:lib so dist-lib/ exists)

import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSvg, renderScene, PRESETS, ROTATIONS } from '../dist-lib/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BRAND = path.join(ROOT, 'public', 'brand');

// ─── helpers ───────────────────────────────────────────────────────────────

function fresh(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function write(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  const kb = data.length / 1024;
  console.log(`✓ ${path.relative(ROOT, file)}  (${kb < 1 ? data.length + ' B' : kb.toFixed(1) + ' kB'})`);
}

/** Full styling options for a preset, at a given canvas size, transparent bg. */
function presetOpts(preset, { size = 100, pad = 20 } = {}) {
  const rot = ROTATIONS[preset.rotation];
  return {
    geometry: preset.geometry,
    rotY: rot.rotY,
    rotX: rot.rotX,
    size,
    pad,
    scheme: preset.scheme,
    colors: preset.colors,
    bgMode: 'transparent',
    bgColor: preset.bgColor,
    stroke: preset.stroke,
    strokeWidth: preset.strokeWidth,
  };
}

/** Rasterize an SVG string to a PNG buffer, fitting to `width` px. */
function rasterize(svg, width, background) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    ...(background ? { background } : {}),
    font: { loadSystemFonts: true, defaultFontFamily: 'Helvetica' },
  });
  return resvg.render().asPng();
}

/** Square SVG (viewBox 0 0 100 100) with the logo centered and uniformly
 *  scaled to fit an 80-unit box — used for favicons / app icons. */
function squareSvg(preset, { boxFrac = 0.8 } = {}) {
  const opts = presetOpts(preset, { size: 100, pad: 0 });
  const { polys, viewBox } = renderScene(opts);
  const S = 100, box = S * boxFrac;
  const scale = box / Math.max(viewBox.w, viewBox.h);
  const tx = S / 2 - (viewBox.x + viewBox.w / 2) * scale;
  const ty = S / 2 - (viewBox.y + viewBox.h / 2) * scale;

  const defs = opts.scheme === 'shade'
    ? buildSvg(opts).match(/<defs>[\s\S]*?<\/defs>/)?.[0] ?? ''
    : '';

  const tags = polys.map(p => {
    const pts = p.points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
    const stroke = preset.strokeWidth > 0
      ? ` stroke="${preset.stroke}" stroke-width="${preset.strokeWidth}" stroke-linejoin="round"`
      : '';
    return `<polygon points="${pts}" fill="${p.fill}"${stroke}/>`;
  }).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  ${defs}
  <g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scale.toFixed(4)})">
    ${tags}
  </g>
</svg>`;
}

/** Pack PNG buffers into a single .ico container. Each entry stores the PNG
 *  verbatim (valid for all modern browsers). */
function buildIco(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);      // reserved
  header.writeUInt16LE(1, 2);      // type: icon
  header.writeUInt16LE(count, 4);  // image count

  const dir = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  const dirEntries = entries.map((e, i) => {
    const base = i * 16;
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, base + 0); // width
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, base + 1); // height
    dir.writeUInt8(0, base + 2);   // palette
    dir.writeUInt8(0, base + 3);   // reserved
    dir.writeUInt16LE(1, base + 4);  // color planes
    dir.writeUInt16LE(32, base + 6); // bits per pixel
    dir.writeUInt32LE(e.png.length, base + 8);  // size
    dir.writeUInt32LE(offset, base + 12);        // offset
    offset += e.png.length;
    return e.png;
  });

  return Buffer.concat([header, dir, ...dirEntries]);
}

// ─── 1. per-preset SVG + PNG ─────────────────────────────────────────────────

fresh(BRAND);

const presetEntries = [];
for (const [key, preset] of Object.entries(PRESETS)) {
  const name = preset.filename;

  // SVG — tight crop, native aspect ratio, transparent.
  const svg = buildSvg(presetOpts(preset));
  write(path.join(BRAND, 'svg', `${name}.svg`), svg);

  // PNG raster at three useful sizes, transparent.
  const pngFiles = [];
  for (const w of [1024, 512, 256]) {
    const png = rasterize(svg, w);
    const file = `${name}-${w}.png`;
    write(path.join(BRAND, 'png', file), png);
    pngFiles.push(`png/${file}`);
  }

  presetEntries.push({
    key,
    name,
    geometry: preset.geometry,
    rotation: preset.rotation,
    scheme: preset.scheme,
    colors: preset.colors,
    svg: `svg/${name}.svg`,
    png: pngFiles,
  });
}

// ─── 2. favicons / app icons (gold preset) ───────────────────────────────────

const FAV = path.join(BRAND, 'favicon');
const faviconSvg = squareSvg(PRESETS.gold);
write(path.join(FAV, 'favicon.svg'), faviconSvg);

const icoSources = [];
for (const s of [16, 32, 48, 180, 512]) {
  const png = rasterize(faviconSvg, s);
  write(path.join(FAV, `favicon-${s}.png`), png);
  if ([16, 32, 48].includes(s)) icoSources.push({ size: s, png });
}
write(path.join(FAV, 'apple-touch-icon.png'), rasterize(faviconSvg, 180));
write(path.join(FAV, 'favicon.ico'), buildIco(icoSources));

// ─── 3. OG social card (1200×630, gold preset) ───────────────────────────────

const ogSvg = (() => {
  const W = 1200, H = 630;
  const { polys, viewBox } = renderScene(presetOpts(PRESETS.gold));
  const LOGO = 380, logoX = 100, logoY = (H - LOGO) / 2;
  const fitScale = LOGO / Math.max(viewBox.w, viewBox.h);
  const tx = logoX + LOGO / 2 - (viewBox.x + viewBox.w / 2) * fitScale;
  const ty = logoY + LOGO / 2 - (viewBox.y + viewBox.h / 2) * fitScale;
  const polyMarkup = polys.map(p =>
    `<polygon points="${p.points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')}" fill="${p.fill}"/>`,
  ).join('\n        ');
  const FONT = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
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
})();
write(path.join(BRAND, 'og.svg'), ogSvg);
write(path.join(BRAND, 'og.png'), rasterize(ogSvg, 1200, '#0A0A0F'));

// ─── 4. manifest + README ─────────────────────────────────────────────────────

const manifest = {
  name: 'Angee brand kit',
  generated: new Date().toISOString(),
  homepage: 'https://logo.angee.ai',
  presets: presetEntries,
  favicon: {
    svg: 'favicon/favicon.svg',
    ico: 'favicon/favicon.ico',
    png: [16, 32, 48, 180, 512].map(s => `favicon/favicon-${s}.png`),
    appleTouchIcon: 'favicon/apple-touch-icon.png',
  },
  og: { svg: 'og.svg', png: 'og.png', width: 1200, height: 630 },
};
write(path.join(BRAND, 'manifest.json'), JSON.stringify(manifest, null, 2));

const readme = `Angee brand kit
===============
Generated ${manifest.generated} — https://logo.angee.ai

svg/        One transparent SVG per logo variant (vector, scales to any size).
png/        Transparent PNG raster at 1024 / 512 / 256 px per variant.
favicon/    favicon.svg, favicon.ico (16+32+48), favicon-{16,32,48,180,512}.png,
            apple-touch-icon.png (180×180).
og.{svg,png} 1200×630 Open Graph / social-share card.
manifest.json  Machine-readable index of every file above.

Variants:
${presetEntries.map(e => `  - ${e.name}  (${e.scheme}, ${e.rotation})`).join('\n')}

Suggested <head> wiring:
  <link rel="icon" href="/brand/favicon/favicon.ico" sizes="any">
  <link rel="icon" type="image/svg+xml" href="/brand/favicon/favicon.svg">
  <link rel="apple-touch-icon" href="/brand/favicon/apple-touch-icon.png">
`;
write(path.join(BRAND, 'README.txt'), readme);

console.log(`\nBrand kit written to ${path.relative(ROOT, BRAND)}/  — runs into dist/brand/ on \`npm run build\`.`);
