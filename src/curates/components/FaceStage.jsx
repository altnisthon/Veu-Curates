// The featured character, floating on the page and recoloured live.
// Full face: her cut-out head (m_base_person.png, made with macOS Vision and faded at the shoulders).
// Close-ups: a soft oval window. The visible photo cross-fades with a scale, like zooming in.
// Drag sideways (or use the arrow keys) to swivel her in 3D; she eases back to centre on release.
// Each area is two masked layers from recolour.js (lightness, then colour) over the photo.
import { useEffect, useRef, useState } from 'react';
import { SCENES, SCENE_FOR_AREA, maskFile, sceneLayers } from '../../lib/recolour';
import sampledColours from '../../../public/character/sampled-colours.json';

const BASE = '/character/';
const AREA_LABEL = { lips: 'Lips', cheeks: 'Cheeks', eyes: 'Eyes' };
const MAX_TURN = 20; // degrees either way
const KEY_STEP = 8;

const maskUrl = (url) => ({
  WebkitMaskImage: url, maskImage: url,
  WebkitMaskSize: '100% 100%', maskSize: '100% 100%',
  WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
});
const areaMask = (scene, area) => maskUrl(`url(${BASE}masks/${maskFile(scene, area)})`);
const PERSON_MASK = maskUrl(`url(${BASE}masks/m_base_person.png)`);

function Scene({ id, visible, current, defaults }) {
  const s = SCENES[id];
  const layers = sceneLayers(sampledColours[id], current, defaults);
  const portrait = id === 'base';
  return (
    <div className={`scene cu-scene cu-scene--${portrait ? 'portrait' : 'close'}${visible ? ' is-on' : ''}`} aria-hidden="true">
      <div className="cu-scene__frame" style={portrait ? PERSON_MASK : undefined}>
        <img src={`${BASE}${s.img}`} alt="" width={s.w} height={s.h} draggable="false" />
        {s.areas.filter((a) => layers[a]).map((a) => (
          <div key={a}>
            <div className="cu-scene__layer" style={{ ...areaMask(id, a), ...layers[a].lightness }} />
            <div className="cu-scene__layer" style={{ ...areaMask(id, a), ...layers[a].colour }} />
          </div>
        ))}
        {/* light sheen that slides as she turns, for the holographic feel */}
        <div className="cu-scene__sheen" />
      </div>
    </div>
  );
}

const clamp = (v) => Math.max(-MAX_TURN, Math.min(MAX_TURN, v));

// current / defaults: colour per area { skin, lips, cheeks, eyes }. chip: { hex, text } shown bottom left.
export default function FaceStage({ area, zoomed, onToggleZoom, current, defaults, label, chip }) {
  const visible = zoomed ? SCENE_FOR_AREA[area] : 'base';
  const where = zoomed ? `a close-up of the ${AREA_LABEL[area].toLowerCase()}` : 'the full face';
  const [turn, setTurn] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hinted, setHinted] = useState(false);
  const drag = useRef(null);
  const back = useRef(null);

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
    <div className={`cu-stage${dragging ? ' is-dragging' : ''}`} style={{ '--turn': `${turn}deg`, '--shift': `${turn * 0.6}px`, '--halo': `${-turn * 0.8}px`, '--sheen': `${50 - turn * 2.2}%` }}
      tabIndex={0} aria-label={`Face preview. Use the left and right arrow keys to turn her head.`}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={onKeyDown}>
      <div className="cu-stage__halo" aria-hidden="true" />
      <div className="cu-stage__float">
        <div className="cu-stage__tilt">
          <div className="cu-stage__scenes" role="img" aria-label={`Model showing ${where}. ${label}`}>
            {Object.keys(SCENES).map((id) => <Scene key={id} id={id} visible={id === visible} current={current} defaults={defaults} />)}
          </div>
        </div>
      </div>

      <div className="cu-stage__top">
        <span className="cu-stage__tag" aria-hidden="true">{AREA_LABEL[area].toUpperCase()} · ON YOU</span>
        <button type="button" className="cu-stage__btn" onClick={onToggleZoom}>{zoomed ? 'Full face' : 'Zoom in'}</button>
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
