// Shade Studio.
// Step 1: the face stage, area zoom, and "Your face" (skin + lip sliders and hex).
// Step 2: placeholder shades per area, finish, look, fit score with a plain-English reason, and The science.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FINISHES, LEANS, LIP_RAMP, LOOKS, SKIN_RAMP, areaBases, hexToLch, normaliseHex, perceived, rampAt, scoreShade } from '../../lib/colour';
import { ScreenHeader } from '../components/Chrome';
import FaceStage from '../components/FaceStage';
import { leanById, scoringLean } from '../lib/leans';
import { usePrefs } from '../lib/prefs';
import { SHADES, shortName } from '../lib/shades';
import { track } from '../lib/track';

const AREAS = [
  { id: 'lips', label: 'Lips', product: 'lip colour' },
  { id: 'cheeks', label: 'Cheeks', product: 'blush' },
  { id: 'eyes', label: 'Eyes', product: 'eyeshadow' },
];
const AREA_IDS = AREAS.map((a) => a.id);

// Slider defaults equal the featured character's own photographed tones.
const DEFAULT_T = { skin: 40, lips: 50 };
const RAMPS = { skin: SKIN_RAMP, lips: LIP_RAMP };
const DEFAULT_BASES = areaBases(rampAt(SKIN_RAMP, DEFAULT_T.skin), rampAt(LIP_RAMP, DEFAULT_T.lips));
const LOG_DELAY = 800; // ms after the last change before we save and log it

const trackStyle = (stops) => ({ background: `linear-gradient(90deg, ${stops.join(', ')})` });
const isWarm = (h) => h >= LEANS.warm.hue[0] && h <= LEANS.warm.hue[1];

function Segmented({ label, options, value, onChange }) {
  return (
    <div className="cu-seg" role="group" aria-label={label}>
      {options.map((o, i) => (
        <button key={o} type="button" aria-pressed={value === i} className={value === i ? 'is-on' : ''} onClick={() => onChange(i)}>{o}</button>
      ))}
    </div>
  );
}

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
  const [sel, setSel] = useState({ lips: 0, cheeks: 0, eyes: 0 });
  const [finOverride, setFinOverride] = useState({ lips: null, cheeks: null, eyes: null });
  const [sciOpen, setSciOpen] = useState(false);
  const look = prefs.look ?? 1;
  const lean = leanById(prefs.lean);
  const scoring = scoringLean(lean ? lean.id : 'not_sure');
  const pending = useRef({});
  const timer = useRef(null);

  // ---------- the user's face ----------
  const user = {
    skin: face.skinHex || rampAt(SKIN_RAMP, face.skinT),
    lips: face.lipHex || rampAt(LIP_RAMP, face.lipT),
  };
  const bases = areaBases(user.skin, user.lips);

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
  const custom = face.skinHex || face.lipHex || face.skinT !== DEFAULT_T.skin || face.lipT !== DEFAULT_T.lips;

  // ---------- shades ----------
  const finOf = (a) => finOverride[a] ?? SHADES[a][sel[a]].fin;
  const onYou = (a) => perceived(a, SHADES[a][sel[a]].hex, finOf(a), bases[a]);
  // Every area wears its picked shade, so the full face shows the whole look.
  const current = { ...bases, lips: onYou('lips'), cheeks: onYou('cheeks'), eyes: onYou('eyes') };

  const shade = SHADES[area][sel[area]];
  const fin = finOf(area);
  const per = current[area];
  const fit = scoreShade({ area, baseHex: bases[area], perceivedHex: per, lean: scoring, look });
  const P = fit.lch;
  const dL = P[0] - hexToLch(bases[area])[0];
  const leanWord = lean && lean.id !== 'not_sure' ? `your ${lean.id} lean` : 'a neutral start';

  const logView = (a, i, extra = {}) => {
    const s = SHADES[a][i];
    track('shade_viewed', { area: a, shade_key: s.id, brand: s.brand, shade: s.shade, placeholder: true, ...extra });
  };

  const pickArea = (id) => {
    setArea(id);
    setZoomed(true);
    logView(id, sel[id], { from: 'area' });
  };
  const pickShade = (i) => {
    setSel((s) => ({ ...s, [area]: i }));
    setFinOverride((f) => ({ ...f, [area]: null }));
    logView(area, i, { from: 'chip' });
  };
  const pickFinish = (i) => setFinOverride((f) => ({ ...f, [area]: i }));
  const pickLook = (i) => update({ look: i });

  const science = [
    { label: 'Lightness (L)', value: String(Math.round(P[0])), note: 'Higher is lighter, lower is deeper. 0 is black, 100 is white.' },
    { label: 'Chroma (C)', value: String(Math.round(P[1])), note: 'Higher is brighter, lower is more muted.' },
    { label: 'Hue angle (h)', value: `${Math.round(P[2])}°`, note: 'Where the colour sits on the colour wheel. Around 25° to 75° reads warm.' },
    { label: 'Temperature', value: isWarm(P[2]) ? 'Warm' : 'Cool', note: 'Read from the hue angle.' },
    { label: 'Contrast (ΔL)', value: `${dL > 0 ? '+' : ''}${Math.round(dL)}`, note: `How much lighter (+) or darker (−) it looks than your bare ${area === 'lips' ? 'lips' : 'skin'}.` },
    { label: 'Colour shift (ΔE)', value: String(Math.round(fit.dE)), note: 'How different it looks from your bare colour. Under 2 is invisible; over 10 is clearly a new colour.' },
  ];

  return (
    <div className="cu-screen">
      <ScreenHeader trail={[{ label: 'Studio', to: '/studio' }]} />
      <div className="cu-studio">
        <div className="cu-pad-x">
          <h1>Shade Studio</h1>
        </div>

        <div className="cu-pad-x">
          <Segmented label="Show lips, cheeks or eyes" options={AREAS.map((a) => a.label)} value={AREA_IDS.indexOf(area)} onChange={(i) => pickArea(AREA_IDS[i])} />
        </div>

        <div className="cu-pad-x">
          <FaceStage area={area} zoomed={zoomed} onToggleZoom={() => setZoomed((z) => !z)} current={current} defaults={DEFAULT_BASES}
            label={`Wearing ${shade.brand} ${shade.shade} on the ${area}.`} chip={{ hex: per, text: `On you ${per}` }} />
        </div>

        {/* the shade */}
        <section className="cu-pad-x" aria-labelledby="shade-name">
          <div className="glass cu-shadecard">
            <div className="cu-shadecard__head">
              <div className="cu-shadecard__titles">
                <span className="cu-eyebrow">{shade.brand}</span>
                <h2 id="shade-name" className="cu-shadecard__name">{shade.name}</h2>
                <span className="cu-shadecard__sub">{shade.shade} · {FINISHES[fin]}</span>
              </div>
              <span className="cu-tag cu-tag--quiet">Placeholder colour</span>
            </div>

            <div className="cu-chips-scroll" role="group" aria-label={`Choose a ${AREAS.find((a) => a.id === area).product}`}>
              {SHADES[area].map((s, i) => (
                <button key={s.id} type="button" className={`cu-shadechip${sel[area] === i ? ' is-on' : ''}`} aria-pressed={sel[area] === i}
                  aria-label={`${s.brand} ${s.shade}`} onClick={() => pickShade(i)}>
                  {/* neutral tile so the product colour reads true */}
                  <span className="cu-shadechip__tile"><span className="cu-shadechip__swatch" style={{ background: s.hex }} /></span>
                  <span className="cu-shadechip__label">{shortName(s)}</span>
                </button>
              ))}
            </div>

            <div className="cu-fit">
              <div className="cu-fit__row">
                <span className="cu-fit__verdict">{fit.verdict} for {leanWord}</span>
                <span className="cu-fit__score">{fit.score}</span>
              </div>
              <div className="cu-fit__bar" aria-hidden="true"><span style={{ width: `${fit.score}%` }} /></div>
              <p className="cu-fit__reason">{fit.reason}</p>
              <p className="cu-fine">Fit score out of 100: how well this shade, as it looks on you, suits {leanWord} and the look you picked.</p>
              {!lean && <Link to="/undertone" className="cu-link">Pick your undertone for a truer score</Link>}
            </div>
          </div>
        </section>

        {/* application */}
        <section className="cu-pad-x cu-gap-s" aria-labelledby="application">
          <h2 id="application" className="cu-section-label">Application</h2>
          <div className="glass cu-appcard">
            <div className="cu-approw">
              <span className="cu-approw__label">Finish</span>
              <Segmented label="Finish" options={FINISHES} value={fin} onChange={pickFinish} />
            </div>
            <div className="cu-approw">
              <span className="cu-approw__label">Look</span>
              <Segmented label="Look" options={LOOKS} value={look} onChange={pickLook} />
            </div>
          </div>
          <p className="cu-fine cu-pad-note">Finish changes how much colour shows. Look is the effect you're going for, and it shapes the fit score.</p>
        </section>

        {/* your face */}
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

        {/* the science */}
        <section className="cu-pad-x">
          <div className="glass cu-sci">
            <button type="button" className="cu-sci__toggle" aria-expanded={sciOpen} aria-controls="sci-panel" onClick={() => setSciOpen((o) => !o)}>
              <span>The science</span>
              <span className="cu-sci__hint">{sciOpen ? 'Hide' : 'Show'}</span>
            </button>
            {sciOpen && (
              <div id="sci-panel" className="cu-sci__panel">
                <p className="cu-fine">The numbers behind {shortName(shade)} as it looks on you ({per}).</p>
                {science.map((r) => (
                  <div key={r.label} className="cu-sci__row">
                    <div className="cu-sci__top"><span>{r.label}</span><span className="cu-sci__val">{r.value}</span></div>
                    <span className="cu-sci__note">{r.note}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <p className="cu-fine cu-pad-x cu-center">
          Screens aren't colour-calibrated, so previews are close approximations. Product colours here are placeholders until our swatch research is in.
        </p>
      </div>
    </div>
  );
}
