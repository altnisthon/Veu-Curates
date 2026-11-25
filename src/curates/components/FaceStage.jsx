// The featured character, floating on the page and recoloured live.
// Full face: her cut-out head (m_base_person.png, made with macOS Vision and faded at the shoulders).
// Zoom: picking an area moves a camera into that spot on her face (pan + scale) in one continuous move on the
// single high-resolution photo (p_base_hd.jpg, upscaled with Higgsfield), so the detail stays the same all the
// way in. Switching areas pans across her face; Full face zooms back out. The view softens into an oval when zoomed.
// Turntable: drag sideways (or use the arrow keys) to turn her head from one side profile to the other. 13 photos,
// every 15 degrees (front = her original photo; the others made with Higgsfield from her photo and a 3D guide), and
// the two nearest cross-fade, so the turn is continuous. She stays where you leave her; zooming turns her to face you.
// Each area is two masked layers from recolour.js (lightness, then colour) over the photo, on every angle: each
// turned photo has its own masks and measured colours (public/character/turn, src/curates/lib/turnFrames.json).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SCENES, maskFile, sceneLayers } from '../../lib/recolour';
import sampledColours from '../../../public/character/sampled-colours.json';
import TURN_FRAMES from '../lib/turnFrames.json';

const BASE = '/character/';
const AREA_LABEL = { lips: 'Lips', cheeks: 'Cheeks', eyes: 'Eyes' };
const MAX_TURN = 90; // degrees either way: side profiles
const STEP = 15; // degrees between photos (and per arrow key)
const DRAG_DEG = 200; // degrees turned by dragging the full width of the stage
const TURN_BASE = '/character/turn/';
// angle -> turned photo meta ({ name, skin, lips, cheek, lid }); 0 is the front photo
const FRAME_AT = Object.fromEntries(TURN_FRAMES.map((f) => [f.angle, f]));
// Where the camera points on her face (fractions of the photo) and how far it zooms. Measured from the area masks.
const FOCUS = {
  lips: { x: 0.484, y: 0.58, scale: 3.4 },
  cheeks: { x: 0.63, y: 0.48, scale: 2.6 },
  eyes: { x: 0.61, y: 0.345, scale: 3.2 },
};
const PORTRAIT_ASPECT = SCENES.base.w / SCENES.base.h;
const HD_IMG = 'p_base_hd.jpg';
const HD_W = 2400, HD_H = 3216; // same framing as p_base.jpg (600 x 804), four times the pixels

// Camera transform for the full-face scene (origin top left): scale, then move the focus point to the centre.
const cameraFor = (area, size) => {
  if (!area || !size.w) return 'translate(0px, 0px) scale(1)';
  const f = FOCUS[area];
  const fw = size.h * PORTRAIT_ASPECT, left = (size.w - fw) / 2; // the photo fills the height, centred
  const px = left + f.x * fw, py = f.y * size.h;
  return `translate(${size.w / 2 - px * f.scale}px, ${size.h / 2 - py * f.scale}px) scale(${f.scale})`;
};

const maskUrl = (url) => ({
  WebkitMaskImage: url, maskImage: url,
  WebkitMaskSize: '100% 100%', maskSize: '100% 100%',
  WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
});
const areaMask = (scene, area) => maskUrl(`url(${BASE}masks/${maskFile(scene, area)})`);
const PERSON_MASK = maskUrl(`url(${BASE}masks/m_base_person.png)`);

// Her full face, recoloured. Masks and measured colours are the same as the 600px original (same framing).
function Face({ current, defaults, camera, opacity = 1 }) {
  const id = 'base';
  const s = SCENES[id];
  const layers = sceneLayers(sampledColours[id], current, defaults);
  const [hdReady, setHdReady] = useState(false);
  return (
    <div className="cu-scene cu-scene--portrait is-on" aria-hidden="true" style={{ transform: camera, opacity, visibility: opacity > 0 ? 'visible' : 'hidden' }}>
      <div className="cu-scene__frame" style={PERSON_MASK}>
        {/* the small original shows at once; the sharp one (about 900 KB) fades in over it when loaded */}
        <img src={`${BASE}${s.img}`} alt="" width={s.w} height={s.h} draggable="false" />
        <img src={`${BASE}${HD_IMG}`} alt="" width={HD_W} height={HD_H} draggable="false" decoding="async"
          className={`cu-scene__hd${hdReady ? ' is-ready' : ''}`} onLoad={() => setHdReady(true)} />
        {s.areas.filter((a) => layers[a]).map((a) => (
          <div key={a}>
            <div className="cu-scene__layer" style={{ ...areaMask(id, a), ...layers[a].lightness }} />
            <div className="cu-scene__layer" style={{ ...areaMask(id, a), ...layers[a].colour }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// One turned photo with its own cut-out and makeup masks, cross-faded by `opacity`.
// Every angle stays mounted (hidden at opacity 0) so its photo and masks are decoded before you turn to it.
function TurnFrame({ frame, opacity, top, current, defaults }) {
  const n = frame.name;
  const on = opacity > 0.001;
  const layers = on ? sceneLayers({ skin: frame.skin, lips: frame.lips, cheek: frame.cheek, lid: frame.lid }, current, defaults) : {};
  const mask = (k) => maskUrl(`url(${TURN_BASE}m_${n}_${k}.png)`);
  return (
    <div className="cu-scene cu-scene--turn" aria-hidden="true" style={{ opacity, zIndex: top ? 2 : 1 }}>
      <div className="cu-scene__frame">
        {/* cut-out baked into the photo (transparent WebP), so it paints the moment it shows */}
        <img src={`${TURN_BASE}c_${n}.webp`} alt="" width={900} height={1206} draggable="false" />
        {['skin', 'cheek', 'lid', 'lips'].filter((a) => layers[a]).map((a) => (
          <div key={a}>
            <div className="cu-scene__layer" style={{ ...mask(a), ...layers[a].lightness }} />
            <div className="cu-scene__layer" style={{ ...mask(a), ...layers[a].colour }} />
          </div>
        ))}
      </div>
    </div>
  );
}

const clamp = (v) => Math.max(-MAX_TURN, Math.min(MAX_TURN, v));
const sideOf = (deg) => (deg < 0 ? 'left' : 'right');

// current / defaults: colour per area { skin, lips, cheeks, eyes }. chip: { hex, text } shown bottom left.
// Refresh pill: resets the user's skin and lip colours to hers. Tooltip on hover/focus; a short confirmation on tap.
// It stays up for a moment after a reset (when there's nothing left to reset) so the confirmation can be seen.
function ResetPill({ onReset }) {
  const [done, setDone] = useState(false);
  const t = useRef(null);
  const last = useRef(onReset);
  if (onReset) last.current = onReset;
  useEffect(() => () => clearTimeout(t.current), []);
  if (!onReset && !done) return null;
  return (
    <span className="cu-reset">
      <button type="button" className="cu-reset__btn" aria-label="Reset colours to her own" aria-describedby="reset-tip" disabled={!onReset}
        onClick={() => { last.current?.(); setDone(true); clearTimeout(t.current); t.current = setTimeout(() => setDone(false), 1600); }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" />
        </svg>
      </button>
      <span id="reset-tip" role="tooltip" className={`cu-tip cu-tip--below${done ? ' is-open' : ''}`}>{done ? 'Colours reset' : 'Reset colours to her own'}</span>
    </span>
  );
}

// onReset: shown as a refresh pill when the user has changed her colouring (null hides it).
export default function FaceStage({ area, zoomed, onToggleZoom, current, defaults, label, chip, onReset = null }) {
  const where = zoomed && area ? `a close-up of the ${AREA_LABEL[area].toLowerCase()}` : 'the full face';
  const [turn, setTurn] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hinted, setHinted] = useState(false);
  const drag = useRef(null);
  const back = useRef(null);
  const scenesRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = scenesRef.current;
    if (!el) return undefined;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const camera = cameraFor(zoomed && area ? area : null, size);

  // Load every angle in the background, nearest to the front first. An angle only shows once its photo and
  // masks are in, so she never blinks out while one is still loading.
  const [ready, setReady] = useState(() => new Set([0]));
  useEffect(() => {
    let live = true;
    const load = (src) => { const i = new Image(); i.src = src; return i.decode().catch(() => {}); };
    [...TURN_FRAMES].sort((a, b) => Math.abs(a.angle) - Math.abs(b.angle)).forEach((f) => {
      Promise.all([`${TURN_BASE}c_${f.name}.webp`, ...['skin', 'lips', 'cheek', 'lid'].map((k) => `${TURN_BASE}m_${f.name}_${k}.png`)].map(load))
        .then(() => { if (live) setReady((r) => new Set(r).add(f.angle)); });
    });
    return () => { live = false; };
  }, []);
  // nearest loaded angle on the way back to the front
  const shown = (deg) => { let d = deg; while (d !== 0 && !ready.has(d)) d -= Math.sign(d) * STEP; return d; };

  // Turn smoothly to a given angle (used to face the user before zooming in).
  const anim = useRef(0);
  const aim = useRef(0); // where the current animation is heading, so quick key presses add up
  const turnTo = (target, ms = 380) => {
    cancelAnimationFrame(anim.current); anim.current = 0;
    aim.current = target;
    const from = turnRef.current, start = performance.now();
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (still || from === target) { setTurn(target); return; }
    const step = (now) => {
      const k = Math.min(1, (now - start) / ms), e = 1 - (1 - k) ** 3;
      setTurn(from + (target - from) * e);
      anim.current = k < 1 ? requestAnimationFrame(step) : 0;
    };
    anim.current = requestAnimationFrame(step);
  };
  const turnRef = useRef(0);
  turnRef.current = turn;
  useEffect(() => { if (zoomed) turnTo(0); }, [zoomed, area]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { cancelAnimationFrame(anim.current); clearTimeout(back.current); }, []);

  // Which two photos to show, and how far between them.
  // Two neighbouring photos only blend in a short window halfway between them, so you rarely see a double image.
  const pos = (turn + MAX_TURN) / STEP;
  const i0 = Math.min(Math.floor(pos), Math.round((2 * MAX_TURN) / STEP) - 1), raw = pos - i0;
  const angleAt = (i) => i * STEP - MAX_TURN;
  const k = Math.max(0, Math.min(1, (raw - 0.4) / 0.2)), mix = k * k * (3 - 2 * k);
  const a0 = shown(angleAt(i0)), a1 = shown(angleAt(i0 + 1));
  // One photo stays solid and the other fades over it. The front photo always sits at the bottom of the stack,
  // so when it is one of the pair it is the solid one and the turned photo fades over it instead.
  const blend = a0 === a1 ? 0 : Math.min(mix, 1 - mix) * 2; // 0 at a photo, 1 halfway
  let lower = mix < 0.5 ? a0 : a1, upper = lower === a0 ? a1 : a0, upperOp = blend;
  if (upper === 0 && lower !== 0) { upper = lower; lower = 0; upperOp = 1 - blend; }
  const op = (deg) => (deg === lower ? 1 : deg === upper && upper !== lower ? upperOp : 0);

  const onPointerDown = (e) => {
    if (e.target.closest('button') || zoomed) return; // zoomed in: she faces you
    cancelAnimationFrame(anim.current); anim.current = 0;
    drag.current = { x: e.clientX, y: e.clientY, w: e.currentTarget.offsetWidth, id: e.pointerId, active: false, from: turn };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.active) {
      if (Math.abs(dx) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) { drag.current = null; return; } // vertical: let the page scroll
      d.active = true;
      setDragging(true);
      setHinted(true);
      try { e.currentTarget.setPointerCapture(d.id); } catch { /* keep turning without capture */ }
    }
    // like spinning a globe: drag right and her face turns to the right (positive angles look right)
    setTurn(clamp(d.from + (dx / d.w) * DRAG_DEG));
  };
  const endDrag = () => {
    if (drag.current?.active) { setDragging(false); turnTo(clamp(Math.round(turnRef.current / STEP) * STEP), 220); } // settles on the nearest angle
    drag.current = null;
  };
  const onKeyDown = (e) => {
    if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || zoomed) return;
    e.preventDefault();
    setHinted(true);
    const dir = e.key === 'ArrowLeft' ? -1 : 1;
    const from = anim.current ? aim.current : turn;
    turnTo(clamp(Math.round(from / STEP) * STEP + dir * STEP), 260);
  };

  return (
    <div className={`cu-stage${dragging ? ' is-dragging' : ''}${zoomed ? ' is-zoomed' : ''}`} style={{ '--halo': `${-turn * 0.8}px` }}
      tabIndex={0} aria-label={`Face preview, ${Math.abs(Math.round(turn)) < 1 ? 'facing you' : `turned ${Math.abs(Math.round(turn))} degrees to the ${sideOf(turn)}`}. Use the left and right arrow keys to turn her head.`}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={onKeyDown}>
      <div className="cu-stage__halo" aria-hidden="true" />
      <div className="cu-stage__float">
        <div className="cu-stage__tilt">
          <div ref={scenesRef} className="cu-stage__scenes" role="img" aria-label={`Model showing ${where}. ${label}`}>
            {/* the front photo stays mounted so its sharp version never reloads */}
            <Face current={current} defaults={defaults} camera={camera} opacity={op(0)} />
            {TURN_FRAMES.filter((f) => ready.has(f.angle)).map((f) => (
              <TurnFrame key={f.angle} frame={f} opacity={op(f.angle)} top={f.angle === upper && upper !== lower} current={current} defaults={defaults} />
            ))}
          </div>
        </div>
      </div>

      <div className="cu-stage__top">
        <span className="cu-stage__tag" aria-hidden="true">{area ? `${AREA_LABEL[area].toUpperCase()} · ON YOU` : 'YOUR FACE'}</span>
        <span className="cu-stage__actions">
          <ResetPill onReset={onReset} />
          {area && <button type="button" className="cu-stage__btn" onClick={onToggleZoom}>{zoomed ? 'Full face' : 'Zoom in'}</button>}
        </span>
      </div>
      <div className="cu-stage__bottom" aria-hidden="true">
        <span className="cu-stage__chip">
          <span className="cu-stage__dot" style={{ background: chip.hex }} />
          <span className="cu-stage__hex">{chip.text}</span>
        </span>
        {!hinted && <span className="cu-stage__hint">Drag to turn</span>}
      </div>
    </div>
  );
}
