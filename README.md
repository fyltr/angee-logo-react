# @angee/logo-react

Angee logo as configurable React components, plus a live configurator at **[logo.angee.ai](https://logo.angee.ai)**.

Two components:

- **`<AngeeLogo />`** — pure static SVG. Configurable rotation, color scheme, geometry, palette. Use anywhere a logo goes.
- **`<AngeeLogoCube />`** — animated CSS-3D version. The 14 sub-cubes rotate / slide apart in real time. Drop-in replacement for a static logo when you want motion.

The configurator app exposes every prop both components accept and lets you download the rendered SVG.

---

## Run the configurator locally

```bash
git clone https://github.com/fyltr/angee-logo-react.git
cd angee-logo-react
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Use the components in another React project

```bash
npm install github:fyltr/angee-logo-react
# (once published) npm install @angee/logo-react
```

The `prepare` script builds the library bundle on install, so no extra setup is required.

### Static SVG logo

```tsx
import { AngeeLogo } from '@angee/logo-react';

<AngeeLogo preset="gold" width={160} />
```

Or with custom props:

```tsx
<AngeeLogo
  rotation="rotated"           // 'iso' | 'rotated' | 'star' | 'cabinet'
  scheme="3tone"               // '3tone' | 'mono' | 'shade'
  colors={{ top: '#FCD34D', right: '#E6B400', left: '#9A7D0A' }}
  geometry="full"              // 'full' | 'tripod1' | 'tripod2' | 'cube'
  size={120}
  bgColor={null}               // null = transparent
/>
```

All `<svg>` props (`className`, `style`, `width`, `aria-label`, …) pass through.

### Animated 3D cube

```tsx
import { AngeeLogoCube } from '@angee/logo-react';
import '@angee/logo-react/style.css';

<AngeeLogoCube
  size={120}
  animationSpeed={20}      // seconds per full rotation
  animationType="rotate"   // 'rotate' | 'slide' | 'rotate-slide' | 'none'
  leftColor="#0033ff"
  rightColor="#ff2200"
/>
```

All CSS class names are prefixed `angee-` so they don't collide with consumer styles.

### Headless: just the SVG string

If you need the SVG markup outside React (server-rendering, build pipeline, design tooling):

```ts
import { buildSvg, PRESETS, ROTATIONS } from '@angee/logo-react';

const preset = PRESETS.gold;
const rot = ROTATIONS[preset.rotation];

const svgString = buildSvg({
  geometry: preset.geometry,
  rotY: rot.rotY,
  rotX: rot.rotX,
  size: 100,
  pad: 40,
  scheme: preset.scheme,
  colors: preset.colors,
  bgMode: 'color',
  bgColor: preset.bgColor,
  stroke: preset.stroke,
  strokeWidth: preset.strokeWidth,
});
```

---

## Built-in presets

| Preset    | Rotation              | Scheme         | Notes                                                |
| --------- | --------------------- | -------------- | ---------------------------------------------------- |
| `webflow` | standard iso          | shade (b/r)    | Original DjangoFlow blue / red look.                 |
| `gold`    | rotated iso (-15/-30) | 3-tone gold    | Default. Both tripods visible, no full-cover overlap.|
| `goldIso` | standard iso          | 3-tone gold    | Same colors, classic 30°/30° iso.                    |
| `mono`    | rotated iso           | mono           | Single gold tone with hairline strokes.              |
| `shade`   | rotated iso           | shade          | Heavy gradient lighting.                             |
| `star`    | corner-at-observer    | 3-tone gold    | Looking down body diagonal — 6-pointed star pattern. |
| `corner`  | standard iso          | 3-tone gold    | Single tripod (7 cubes), angee-cube style.           |

## Built-in rotations

| Key       | rotateY | rotateX | What you get                                              |
| --------- | ------- | ------- | --------------------------------------------------------- |
| `iso`     | -45°    | -35.26° | Classic 30°/30° isometric.                                |
| `rotated` | -15°    | -30°    | Off-iso so diagonally-opposite cubes don't fully cover.   |
| `star`    | +45°    | +35.26° | Look down body diagonal — one corner points at observer.  |
| `cabinet` | -30°    | -15°    | Flatter, side-on look.                                    |

---

## Build outputs

| Command            | Builds                                                              |
| ------------------ | ------------------------------------------------------------------- |
| `npm run dev`      | Configurator dev server.                                            |
| `npm run build`    | Configurator SPA → `dist/`. Deploys to `logo.angee.ai`.             |
| `npm run build:lib`| Library bundle → `dist-lib/` (ESM + CJS + `.d.ts` + `style.css`).   |
| `npm run build:all`| Library, then configurator.                                         |
| `npm run typecheck`| `tsc -b --noEmit` across app, node, lib project refs.               |

## Deployment

The configurator deploys to Firebase Hosting at `logo.angee.ai`.

```bash
# One-time setup after cloning
firebase use --add                                     # pick the angee Firebase project
firebase target:apply hosting angee-logo <site-id>     # site-id from Firebase console

npm run deploy                                         # build + firebase deploy
```

The custom domain `logo.angee.ai` is mapped in Firebase console → Hosting → Custom domains.

---

## Project structure

```
src/
├── lib/
│   ├── geometry.ts     # cube positions, face definitions
│   ├── projection.ts   # CSS-equivalent rotateY / rotateX projection
│   ├── render.ts       # painter's-order polygon assembly + buildSvg()
│   └── presets.ts      # named presets & palettes
├── components/
│   ├── AngeeLogo.tsx        # static SVG component
│   ├── AngeeLogoCube.tsx    # animated CSS-3D component
│   └── AngeeLogoCube.css    # all classes prefixed `angee-`
├── App.tsx             # configurator UI
├── main.tsx            # demo entry
└── index.ts            # library entry
```

## License

MIT.
