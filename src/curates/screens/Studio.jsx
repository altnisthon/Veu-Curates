// Shade Studio, Phase 2 step 1: the face stage, area zoom, and "Your face" (skin + lip sliders and hex).
// Shades, finish and look arrive in step 2.
import { useEffect, useRef, useState } from 'react';
import { LIP_RAMP, SKIN_RAMP, normaliseHex, rampAt } from '../../lib/colour';
import { ScreenHeader } from '../components/Chrome';
import FaceStage from '../components/FaceStage';
import { usePrefs } from '../lib/prefs';
import { track } from '../lib/track';

const AREAS = [
  { id: 'lips', label: 'Lips' },
  { id: 'cheeks', label: 'Cheeks' },
  { id: 'eyes', label: 'Eyes' },
];

// Slider defaults equal the featured character's own photographed tones.
const DEFAULT_T = { skin: 40, lips: 50 };
const RAMPS = { skin: SKIN_RAMP, lips: LIP_RAMP };
const DEFAULTS = { skin: rampAt(SKIN_RAMP, DEFAULT_T.skin), lips: rampAt(LIP_RAMP, DEFAULT_T.lips) };
const LOG_DELAY = 800; // ms after the last change before we save and log it

const trackStyle = (stops) => ({ background: `linear-gradient(90deg, ${stops.join(', ')})` });

function ColourRow({ part, label, t, hex, overridden, onSlide, onHex }) {
  const [text, setText] = useState(hex);
  useEffect(() => { setText(hex); }, [hex]);
  const commit = () => {
    const h = normaliseHex(text);
    if (h && h !== hex) onHex(h); else setText(hex);
  };
  return (
    <div className="cu-facerow">
      <div className="cu-facerow__top">
        <span className="cu-facerow__dot" style={{ background: hex }} aria-hidden="true" />
        <label htmlFor={`${part}-range`} className="cu-facerow__label">{label}</label>
        <input type="text" className="cu-facerow__hex" value={text} spellCheck="false" autoCapitalize="characters" maxLength={7}
          aria-label={`${label} colour code`} onChange={(e) => setText(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); e.currentTarget.blur(); } }} />
      </div>
      <input id={`${part}-range`} type="range" className="cu-range" min="0" max="100" step="1" value={t}
        style={trackStyle(RAMPS[part])} aria-valuetext={overridden ? `Custom colour ${hex}` : hex}
        onChange={(e) => onSlide(Number(e.target.value))} />
    </div>
  );
}

export default function Studio() {
  const { prefs, update } = usePrefs();
  const saved = prefs.face || {};
  const [face, setFace] = useState({
    skinT: saved.skinT ?? DEFAULT_T.skin, lipT: saved.lipT ?? DEFAULT_T.lips,
    skinHex: saved.skinHex ?? null, lipHex: saved.lipHex ?? null,
  });
  const [area, setArea] = useState('lips');
  const [zoomed, setZoomed] = useState(false);
  const pending = useRef({});
  const timer = useRef(null);

  const user = {
    skin: face.skinHex || rampAt(SKIN_RAMP, face.skinT),
    lips: face.lipHex || rampAt(LIP_RAMP, face.lipT),
  };

  // Save to the device and log once the user pauses, not on every pixel of a drag.
  const schedule = (next, part, via) => {
    pending.current[part] = via;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      update({ face: next });
      const skin = next.skinHex || rampAt(SKIN_RAMP, next.skinT);
      const lips = next.lipHex || rampAt(LIP_RAMP, next.lipT);
      Object.entries(pending.current).forEach(([p, how]) => track('slider_adjusted', { part: p, via: how, skin, lips }));
      pending.current = {};
    }, LOG_DELAY);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const change = (part, via, patch) => {
    const next = { ...face, ...patch };
    setFace(next);
    schedule(next, part, via);
  };

  const pickArea = (id) => {
    setArea(id);
    setZoomed(true);
  };

  const custom = face.skinHex || face.lipHex || face.skinT !== DEFAULT_T.skin || face.lipT !== DEFAULT_T.lips;

  return (
    <div className="cu-screen">
      <ScreenHeader trail={[{ label: 'Studio', to: '/studio' }]} />
      <div className="cu-studio">
        <div className="cu-pad-x">
          <h1>Shade Studio</h1>
        </div>

        <div className="cu-pad-x">
          <div className="cu-seg" role="group" aria-label="Show lips, cheeks or eyes">
            {AREAS.map((a) => (
              <button key={a.id} type="button" aria-pressed={area === a.id} className={area === a.id ? 'is-on' : ''} onClick={() => pickArea(a.id)}>{a.label}</button>
            ))}
          </div>
        </div>

        <div className="cu-pad-x">
          <FaceStage area={area} zoomed={zoomed} onToggleZoom={() => setZoomed((z) => !z)} user={user} defaults={DEFAULTS} />
        </div>

        <section className="cu-pad-x cu-gap-s" aria-labelledby="your-face">
          <h2 id="your-face" className="cu-section-label">Your face</h2>
          <div className="glass cu-facecard">
            <ColourRow part="skin" label="Skin" t={face.skinT} hex={user.skin} overridden={!!face.skinHex}
              onSlide={(t) => change('skin', 'slider', { skinT: t, skinHex: null })}
              onHex={(h) => change('skin', 'hex', { skinHex: h })} />
            <ColourRow part="lips" label="Lips" t={face.lipT} hex={user.lips} overridden={!!face.lipHex}
              onSlide={(t) => change('lips', 'slider', { lipT: t, lipHex: null })}
              onHex={(h) => change('lips', 'hex', { lipHex: h })} />
          </div>
          <p className="cu-fine cu-pad-note">
            Slide until the face looks like you. VEU clients will start from the skin colour measured at their consultation.
          </p>
          {custom && (
            <button type="button" className="cu-textbtn cu-pad-note"
              onClick={() => change('both', 'reset', { skinT: DEFAULT_T.skin, lipT: DEFAULT_T.lips, skinHex: null, lipHex: null })}>
              Reset to her colouring
            </button>
          )}
        </section>

        <section className="cu-pad-x">
          <div className="glass cu-card cu-gap-s">
            <span className="cu-tag">Coming next</span>
            <p className="cu-muted">Try lip, blush and eyeshadow shades on this face, with a fit score for each.</p>
          </div>
        </section>

        <p className="cu-fine cu-pad-x cu-center">Screens aren't colour-calibrated, so previews are close approximations.</p>
      </div>
    </div>
  );
}
