// The featured character, floating on the page and recoloured live.
// Full face: her cut-out head (m_base_person.png, made with macOS Vision and faded at the shoulders).
// Zoom: picking an area moves a camera into that spot on her face (pan + scale) in one continuous move on the
// single high-resolution photo (p_base_hd.jpg, upscaled with Higgsfield), so the detail stays the same all the
// way in. Switching areas pans across her face; Full face zooms back out. The view softens into an oval when zoomed.
// Drag sideways (or use the arrow keys) to swivel her in 3D; she eases back to centre on release.
// Each area is two masked layers from recolour.js (lightness, then colour) over the photo.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SCENES, maskFile, sceneLayers } from '../../lib/recolour';
import sampledColours from '../../../public/character/sampled-colours.json';

const BASE = '/character/';
const AREA_LABEL = { lips: 'Lips', cheeks: 'Cheeks', eyes: 'Eyes' };
const MAX_TURN = 20; // degrees either way
const KEY_STEP = 8;
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
function Face({ current, defaults, camera }) {
  const id = 'base';
  const s = SCENES[id];
  const layers = sceneLayers(sampledColours[id], current, defaults);
  const [hdReady, setHdReady] = useState(false);
  return (
    <div className="cu-scene cu-scene--portrait is-on" aria-hidden="true" style={{ transform: camera }}>
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

const clamp = (v) => Math.max(-MAX_TURN, Math.min(MAX_TURN, v));

// current / defaults: colour per area { skin, lips, cheeks, eyes }. chip: { hex, text } shown bottom left.
export default function FaceStage({ area, zoomed, onToggleZoom, current, defaults, label, chip }) {
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

  // Ease back to centre a moment after the last keyboard turn.
  const settleSoon = () => { clearTimeout(back.current); back.current = setTimeout(() => setTurn(0), 1600); };
  useEffect(() => () => clearTimeout(back.current), []);

  const onPointerDown = (e) => {
    if (e.target.closest('button')) return;
    drag.current = { x: e.clientX, y: e.clientY, w: e.currentTarget.offsetWidth, id: e.pointerId, active: false };
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
    setTurn(clamp((dx / d.w) * MAX_TURN * 2.2));
  };
  const endDrag = () => {
    if (drag.current?.active) { setDragging(false); setTurn(0); }
    drag.current = null;
  };
  const onKeyDown = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    setHinted(true);
    setTurn((t) => clamp(t + (e.key === 'ArrowLeft' ? -KEY_STEP : KEY_STEP)));
    settleSoon();
  };

  return (
    <div className={`cu-stage${dragging ? ' is-dragging' : ''}${zoomed ? ' is-zoomed' : ''}`} style={{ '--halo': `${-turn * 0.8}px` }}
      tabIndex={0} aria-label={`Face preview. Use the left and right arrow keys to turn her head.`}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={onKeyDown}>
      <div className="cu-stage__halo" aria-hidden="true" />
      <div className="cu-stage__float">
        {/* 3D only while she's turned: a 3D layer is drawn as a flat picture, which would blur the zoom */}
        <div className="cu-stage__tilt" style={{ transform: turn || dragging ? `perspective(560px) translateX(${turn * 0.6}px) rotateY(${turn}deg) rotateX(${-turn * 0.08}deg)` : 'none' }}>
          <div ref={scenesRef} className="cu-stage__scenes" role="img" aria-label={`Model showing ${where}. ${label}`}>
            <Face current={current} defaults={defaults} camera={camera} />
          </div>
        </div>
      </div>

      <div className="cu-stage__top">
        <span className="cu-stage__tag" aria-hidden="true">{area ? `${AREA_LABEL[area].toUpperCase()} · ON YOU` : 'YOUR FACE'}</span>
        {area && <button type="button" className="cu-stage__btn" onClick={onToggleZoom}>{zoomed ? 'Full face' : 'Zoom in'}</button>}
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
