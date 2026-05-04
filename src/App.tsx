import { useEffect, useState } from 'react';
import { AngeeLogo, AngeeLogoCube } from './components/index.js';
import {
  buildSvg,
  PRESETS,
  PALETTES,
  ROTATIONS,
  type Colors,
  type Scheme,
  type RenderOptions,
  type PresetKey,
  type RotationKey,
} from './lib/index.js';
import type { Geometry } from './lib/geometry.js';

type PresetSelection = PresetKey | 'custom';
type RotationSelection = RotationKey | 'custom';
type Tab = 'static' | 'animated';

interface State {
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

const INITIAL: State = {
  preset: 'gold',
  geometry: 'full',
  rotation: 'rotated',
  rotY: ROTATIONS.rotated.rotY,
  rotX: ROTATIONS.rotated.rotX,
  scheme: '3tone',
  colors: { top: '#FCD34D', right: '#E6B400', left: '#9A7D0A' },
  bgMode: 'color',
  bgColor: '#0A0A0F',
  stroke: '#0A0A0F',
  strokeWidth: 0,
  size: 100,
  pad: 40,
  filename: 'Angee-Logo-Gold',
};

function applyPreset(s: State, key: PresetKey): State {
  const p = PRESETS[key];
  const rot = ROTATIONS[p.rotation];
  return {
    ...s,
    preset: key,
    geometry: p.geometry,
    rotation: p.rotation,
    rotY: rot.rotY,
    rotX: rot.rotX,
    scheme: p.scheme,
    colors: p.colors,
    bgColor: p.bgColor,
    stroke: p.stroke,
    strokeWidth: p.strokeWidth,
    filename: p.filename,
  };
}

function detectRotation(rotY: number, rotX: number): RotationSelection {
  for (const [name, rp] of Object.entries(ROTATIONS) as [RotationKey, typeof ROTATIONS[RotationKey]][]) {
    if (Math.abs(rp.rotY - rotY) < 0.5 && Math.abs(rp.rotX - rotX) < 0.5) return name;
  }
  return 'custom';
}

export default function App() {
  const [s, setS] = useState<State>(INITIAL);
  const [tab, setTab] = useState<Tab>('static');
  const [toast, setToast] = useState<string>('');

  // The render is fast (pure geometry → SVG); skip useMemo, React handles 60fps.
  const renderOpts: RenderOptions = {
    geometry: s.geometry,
    rotY: s.rotY,
    rotX: s.rotX,
    size: s.size,
    pad: s.pad,
    scheme: s.scheme,
    colors: s.colors,
    bgMode: s.bgMode,
    bgColor: s.bgColor,
    stroke: s.stroke,
    strokeWidth: s.strokeWidth,
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 1600);
    return () => clearTimeout(t);
  }, [toast]);

  function patch<K extends keyof State>(key: K, val: State[K]) {
    setS(prev => ({ ...prev, [key]: val, preset: 'custom' }));
  }
  function patchColor(slot: keyof Colors, val: string) {
    setS(prev => ({ ...prev, colors: { ...prev.colors, [slot]: val }, preset: 'custom' }));
  }
  function applyRotation(name: RotationKey) {
    const rp = ROTATIONS[name];
    setS(prev => ({ ...prev, rotation: name, rotY: rp.rotY, rotX: rp.rotX }));
  }
  function patchRotY(val: number) {
    setS(prev => ({ ...prev, rotY: val, rotation: detectRotation(val, prev.rotX) }));
  }
  function patchRotX(val: number) {
    setS(prev => ({ ...prev, rotX: val, rotation: detectRotation(prev.rotY, val) }));
  }

  function download() {
    const svg = buildSvg(renderOpts);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${s.filename || 'Angee-Logo'}.svg`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    setToast('Downloaded');
  }
  async function copy() {
    const svg = buildSvg(renderOpts);
    try {
      await navigator.clipboard.writeText(svg);
      setToast('SVG copied');
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
      setToast('Copy failed — clipboard not available');
    }
  }

  return (
    <div className="app">
      <aside className="controls">
        <h2>Preset</h2>
        <div className="group">
          <label htmlFor="ctl-preset">Preset</label>
          <select
            id="ctl-preset"
            value={s.preset}
            onChange={e => {
              const v = e.target.value as PresetSelection;
              setS(prev => v === 'custom' ? { ...prev, preset: 'custom' } : applyPreset(prev, v));
            }}
          >
            <option value="custom">Custom (no preset)</option>
            <option value="webflow">Webflow — original blue/red, iso</option>
            <option value="gold">Gold — angee 3-tone, rotated iso</option>
            <option value="goldIso">Gold — angee 3-tone, standard iso</option>
            <option value="mono">Mono — single gold, rotated iso</option>
            <option value="shade">Shade — gold gradients, rotated iso</option>
            <option value="star">Star — gold, corner-at-observer</option>
            <option value="corner">Corner — gold, single tripod</option>
          </select>
        </div>

        <h2>Geometry</h2>
        <div className="group">
          <label htmlFor="ctl-geom">Shape</label>
          <select id="ctl-geom" value={s.geometry} onChange={e => patch('geometry', e.target.value as Geometry)}>
            <option value="full">Full assembly (14 cubes — both tripods)</option>
            <option value="tripod1">Single tripod 1 (7 cubes)</option>
            <option value="tripod2">Single tripod 2 (7 cubes)</option>
            <option value="cube">Single cube (1)</option>
          </select>
        </div>

        <h2>Rotation</h2>
        <div className="group">
          <label htmlFor="ctl-rotPreset">Camera preset</label>
          <select
            id="ctl-rotPreset"
            value={s.rotation}
            onChange={e => {
              const v = e.target.value as RotationSelection;
              if (v !== 'custom') applyRotation(v);
            }}
          >
            <option value="iso">Standard isometric (-45° / -35.26°)</option>
            <option value="rotated">Rotated iso (-15° / -30°) — no overlap</option>
            <option value="star">Corner-at-observer (45° / 35.26°)</option>
            <option value="cabinet">Cabinet (-30° / -15°)</option>
            <option value="custom">— Custom —</option>
          </select>
        </div>
        <div className="group">
          <label htmlFor="ctl-rotY">rotateY <span className="v">{s.rotY.toFixed(0)}°</span></label>
          <input id="ctl-rotY" type="range" min={-180} max={180} step={1} value={s.rotY} onChange={e => patchRotY(parseFloat(e.target.value))} />
        </div>
        <div className="group">
          <label htmlFor="ctl-rotX">rotateX <span className="v">{s.rotX.toFixed(0)}°</span></label>
          <input id="ctl-rotX" type="range" min={-89} max={89} step={1} value={s.rotX} onChange={e => patchRotX(parseFloat(e.target.value))} />
        </div>

        <h2>Style</h2>
        <div className="group">
          <label htmlFor="ctl-scheme">Color scheme</label>
          <select id="ctl-scheme" value={s.scheme} onChange={e => patch('scheme', e.target.value as Scheme)}>
            <option value="3tone">3-tone (top / right / left)</option>
            <option value="mono">Monochrome (1 tone)</option>
            <option value="shade">Shaded gradient (light → dark)</option>
          </select>
        </div>
        <div className="group">
          <label>Palette</label>
          <div className="swatches">
            {PALETTES.map(p => (
              <button
                type="button"
                key={p.name}
                className="swatch"
                aria-label={`Apply palette ${p.name}`}
                title={p.name}
                style={{ background: `linear-gradient(135deg, ${p.top} 0% 33%, ${p.right} 33% 67%, ${p.left} 67% 100%)` }}
                onClick={() => setS(prev => ({
                  ...prev,
                  colors: { top: p.top, right: p.right, left: p.left },
                  preset: 'custom',
                }))}
              />
            ))}
          </div>
        </div>
        <div className="group colors">
          <div>
            <label htmlFor="ctl-cTop">Top</label>
            <input id="ctl-cTop" type="color" value={s.colors.top} onChange={e => patchColor('top', e.target.value)} />
          </div>
          <div>
            <label htmlFor="ctl-cRight">Right</label>
            <input id="ctl-cRight" type="color" value={s.colors.right} onChange={e => patchColor('right', e.target.value)} />
          </div>
          <div>
            <label htmlFor="ctl-cLeft">Left</label>
            <input id="ctl-cLeft" type="color" value={s.colors.left} onChange={e => patchColor('left', e.target.value)} />
          </div>
        </div>
        <div className="group">
          <label htmlFor="ctl-cBg">Background</label>
          <div className="row">
            <input id="ctl-cBg" type="color" value={s.bgColor} onChange={e => patch('bgColor', e.target.value)} />
            <select aria-label="Background mode" value={s.bgMode} onChange={e => patch('bgMode', e.target.value as 'color' | 'transparent')}>
              <option value="color">Color</option>
              <option value="transparent">Transparent</option>
            </select>
          </div>
        </div>
        <div className="group">
          <label htmlFor="ctl-stroke">Edge stroke</label>
          <div className="row">
            <input id="ctl-stroke" type="color" value={s.stroke} onChange={e => patch('stroke', e.target.value)} />
            <input aria-label="Stroke width" type="range" min={0} max={3} step={0.1} value={s.strokeWidth} onChange={e => patch('strokeWidth', parseFloat(e.target.value))} />
          </div>
        </div>

        <h2>Layout</h2>
        <div className="group">
          <label htmlFor="ctl-size">Cube edge size <span className="v">{s.size}</span></label>
          <input id="ctl-size" type="range" min={20} max={200} step={2} value={s.size} onChange={e => patch('size', parseFloat(e.target.value))} />
        </div>
        <div className="group">
          <label htmlFor="ctl-pad">Padding <span className="v">{s.pad}</span></label>
          <input id="ctl-pad" type="range" min={0} max={200} step={2} value={s.pad} onChange={e => patch('pad', parseFloat(e.target.value))} />
        </div>
      </aside>

      <main className="preview">
        <div className="tab-bar" role="tablist">
          <button role="tab" aria-selected={tab === 'static'} className={`tab ${tab === 'static' ? 'active' : ''}`} onClick={() => setTab('static')}>Static SVG</button>
          <button role="tab" aria-selected={tab === 'animated'} className={`tab ${tab === 'animated' ? 'active' : ''}`} onClick={() => setTab('animated')}>Animated &lt;AngeeLogoCube /&gt;</button>
        </div>

        {tab === 'static' ? (
          <div className="stage">
            <AngeeLogo
              rotY={s.rotY}
              rotX={s.rotX}
              scheme={s.scheme}
              colors={s.colors}
              geometry={s.geometry}
              size={s.size}
              pad={s.pad}
              bgColor={s.bgMode === 'transparent' ? null : s.bgColor}
              stroke={s.stroke}
              strokeWidth={s.strokeWidth}
              style={{ width: '80%', height: '100%' }}
              role="img"
              aria-label="Angee logo preview"
            />
          </div>
        ) : (
          <div className="animated-stage">
            <AngeeLogoCube
              size={Math.max(40, s.size * 0.6)}
              leftColor={s.colors.left}
              rightColor={s.colors.right}
            />
          </div>
        )}

        <div className="actions">
          <label htmlFor="ctl-filename" style={{ display: 'none' }}>Filename</label>
          <input
            id="ctl-filename"
            type="text"
            className="filename"
            value={s.filename}
            onChange={e => patch('filename', e.target.value)}
            placeholder="Filename (without .svg)"
          />
          <button onClick={download}>Download SVG</button>
          <button onClick={copy} className="secondary">Copy SVG</button>
        </div>
      </main>

      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
