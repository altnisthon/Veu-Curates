// Shade Studio.
// On entry: her bare face and "Your face" (a tone wheel for skin and lips: cool to warm, light to deep).
// Tapping Lips, Cheeks or Eyes zooms in and brings out the shades for that area: placeholder shades, finish,
// look, fit score with a plain-English reason, and The science. Only areas the user has opened wear makeup.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FINISHES, LEANS, LOOKS, areaBases, hexToLch, normaliseHex, perceived, scoreShade } from '../../lib/colour';
import { ScreenHeader } from '../components/Chrome';
import FaceStage from '../components/FaceStage';
import ToneWheel from '../components/ToneWheel';
import { leanById, scoringLean } from '../lib/leans';
import { usePrefs } from '../lib/prefs';
import { SHADES, shortName } from '../lib/shades';
import { HER, describe, hexToWheel, wheelToHex } from '../lib/tone';
import { track } from '../lib/track';

const AREAS = [
  { id: 'lips', label: 'Lips', product: 'lip colour' },
  { id: 'cheeks', label: 'Cheeks', product: 'blush' },
  { id: 'eyes', label: 'Eyes', product: 'eyeshadow' },
];

// The default is the featured character's own photographed colouring, so nothing changes until the user does.
const DEFAULT_BASES = areaBases(HER.skin, HER.lips);
const LOG_DELAY = 800; // ms after the last change before we save and log it
const EMPTY_TONE = { skin: null, lips: null, skinHex: null, lipHex: null };
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

// The readout under the wheel: swatch, plain-English reading and an editable colour code.
function ToneReadout({ label, hex, pos, onHex }) {
  const [text, setText] = useState(hex);
  useEffect(() => { setText(hex); }, [hex]);
  const commit = () => {
    const h = normaliseHex(text);
    if (h && h !== hex) onHex(h); else setText(hex);
  };
  const words = describe(pos);
  return (
    <div className="cu-facerow__top cu-tone__readout">
      <span className="cu-facerow__dot" style={{ background: hex }} aria-hidden="true" />
      <span className="cu-facerow__label">{label} <span className="cu-tone__words">{words.undertone} · {words.depth}</span></span>
      <input type="text" className="cu-facerow__hex" value={text} spellCheck="false" autoCapitalize="characters" maxLength={7}
        aria-label={`${label} colour code`} onChange={(e) => setText(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); e.currentTarget.blur(); } }} />
    </div>
  );
}

export default function Studio() {
  const { prefs, update } = usePrefs();
  const [face, setFace] = useState({ ...EMPTY_TONE, ...(prefs.tone || {}) });
  const [wheelPart, setWheelPart] = useState('skin');
  const [area, setArea] = useState(null); // nothing picked yet: no shades, no makeup
  const [opened, setOpened] = useState({ lips: false, cheeks: false, eyes: false });
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
  const toneOf = (f, part) => {
    const hex = part === 'skin' ? f.skinHex : f.lipHex;
    return hex || (f[part] ? wheelToHex(part, f[part]) : HER[part]);
  };
  const user = { skin: toneOf(face, 'skin'), lips: toneOf(face, 'lips') };
  const posOf = (part) => face[part] || hexToWheel(part, user[part]);
  const bases = areaBases(user.skin, user.lips);

  // Save to the device and log once the user pauses, not on every pixel of a drag.
  const schedule = (next, part, via) => {
    pending.current[part] = via;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      update({ tone: next });
      const skin = toneOf(next, 'skin');
      const lips = toneOf(next, 'lips');
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
  const custom = !!(face.skinHex || face.lipHex || face.skin || face.lips);

  // ---------- shades ----------
  const finOf = (a) => finOverride[a] ?? SHADES[a][sel[a]].fin;
  const onYou = (a) => perceived(a, SHADES[a][sel[a]].hex, finOf(a), bases[a]);
  // Areas the user has opened wear their picked shade, so the full face builds up the whole look.
  const current = { ...bases };
  ['lips', 'cheeks', 'eyes'].forEach((a) => { if (opened[a]) current[a] = onYou(a); });

  // Everything below only exists once an area is picked.
  const shade = area && SHADES[area][sel[area]];
  const fin = area && finOf(area);
  const per = area ? current[area] : user.skin;
  const fit = area && scoreShade({ area, baseHex: bases[area], perceivedHex: per, lean: scoring, look });
  const P = fit ? fit.lch : [0, 0, 0];
  const dL = area ? P[0] - hexToLch(bases[area])[0] : 0;
  const leanWord = lean && lean.id !== 'not_sure' ? `your ${lean.id} lean` : 'a neutral start';

  const logView = (a, i, extra = {}) => {
    const s = SHADES[a][i];
    track('shade_viewed', { area: a, shade_key: s.id, brand: s.brand, shade: s.shade, placeholder: true, ...extra });
  };

  const pickArea = (id) => {
    setArea(id);
    setOpened((o) => ({ ...o, [id]: true }));
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

  const science = !area ? [] : [
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
          <h1 className="cu-studio-title">Shade <em>Studio</em></h1>
        </div>

        <div className="cu-pad-x">
          <div className="cu-pills" role="group" aria-label="Show lips, cheeks or eyes">
            {AREAS.map((a) => (
              <button key={a.id} type="button" className={`cu-pill-btn${area === a.id ? ' is-on' : ''}`} aria-pressed={area === a.id} onClick={() => pickArea(a.id)}>{a.label}</button>
            ))}
          </div>
          {!area && <p className="cu-fine cu-center cu-studio-hint">Tap lips, cheeks or eyes to see shades on her.</p>}
        </div>

        <div className="cu-pad-x">
          <FaceStage area={area} zoomed={zoomed} onToggleZoom={() => setZoomed((z) => !z)} current={current} defaults={DEFAULT_BASES}
            label={area ? `Wearing ${shade.brand} ${shade.shade} on the ${area}.` : 'Bare face, matched to your skin and lips.'}
            chip={area ? { hex: per, text: `On you ${per}` } : { hex: user.skin, text: `Skin ${user.skin}` }} />
        </div>

        {area && (<>
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
        </>)}

        {/* your face */}
        <section className="cu-pad-x cu-gap-s" aria-labelledby="your-face">
          <h2 id="your-face" className="cu-section-label">Your face</h2>
          <div className="glass cu-facecard cu-tone">
            <Segmented label="Choose skin or lips" options={['Skin', 'Lips']} value={wheelPart === 'skin' ? 0 : 1} onChange={(i) => setWheelPart(i ? 'lips' : 'skin')} />
            <ToneWheel key={wheelPart} part={wheelPart} label={wheelPart === 'skin' ? 'Skin' : 'Lips'} pos={posOf(wheelPart)}
              onChange={(p) => change(wheelPart, 'wheel', wheelPart === 'skin' ? { skin: p, skinHex: null } : { lips: p, lipHex: null })} />
            <ToneReadout label={wheelPart === 'skin' ? 'Skin' : 'Lips'} hex={user[wheelPart]} pos={posOf(wheelPart)}
              onHex={(h) => change(wheelPart, 'hex', wheelPart === 'skin' ? { skinHex: h, skin: null } : { lipHex: h, lips: null })} />
          </div>
          <p className="cu-fine cu-pad-note">
            Drag across the wheel: left is cooler, right is warmer, up is lighter, down is deeper. Stop where the face looks like you.
            VEU clients will start from the skin colour measured at their consultation.
          </p>
          {custom && (
            <button type="button" className="cu-textbtn cu-pad-note" onClick={() => change('both', 'reset', { ...EMPTY_TONE })}>
              Reset to her colouring
            </button>
          )}
        </section>

        {/* the science */}
        {area && (
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
        )}

        <p className="cu-fine cu-pad-x cu-center">
          Screens aren't colour-calibrated, so previews are close approximations. Product colours here are placeholders until our swatch research is in.
        </p>
      </div>
    </div>
  );
}
