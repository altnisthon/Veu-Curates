// Shade Studio.
// On entry: her bare face and "Your face" (a tone wheel for skin and lips: cool to warm, light to deep).
// Tapping Lips, Cheeks or Eyes zooms in; the user then chooses a product from the menu (or arrives from Explore
// with one picked). Then: fit score with a plain-English reason, finish, look and The science.
// Only areas with a chosen product wear makeup.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FINISHES, LEANS, LOOKS, areaBases, hexToLch, normaliseHex, perceived, scoreShade } from '../../lib/colour';
import { ScreenHeader } from '../components/Chrome';
import FaceStage from '../components/FaceStage';
import ProductMenu from '../components/ProductMenu';
import ToneWheel from '../components/ToneWheel';
import { leanById, scoringLean } from '../lib/leans';
import { usePrefs } from '../lib/prefs';
import { AREA_PRODUCT, BY_ID, canTry, tryable } from '../lib/catalogue';
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
  const [zoomed, setZoomed] = useState(false);
  // chosen product id per area; saved on the device so the look survives a trip to Explore and back
  const [sel, setSel] = useState(() => {
    const saved = prefs.picks || {};
    const ok = (id) => (BY_ID.get(id)?.hex ? id : null);
    return { lips: ok(saved.lips), cheeks: ok(saved.cheeks), eyes: ok(saved.eyes) };
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [params, setParams] = useSearchParams();
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

  // ---------- products ----------
  const productOf = (a) => (sel[a] ? BY_ID.get(sel[a]) : null);
  const finOf = (a) => finOverride[a] ?? productOf(a).fin;
  const onYou = (a) => perceived(a, productOf(a).hex, finOf(a), bases[a]);
  // Areas with a chosen product wear it, so the full face builds up the whole look.
  const current = { ...bases };
  ['lips', 'cheeks', 'eyes'].forEach((a) => { if (productOf(a)) current[a] = onYou(a); });

  // Everything below only exists once an area is picked, and the fit once a product is chosen.
  const shade = area ? productOf(area) : null;
  const fin = shade ? finOf(area) : null;
  const per = shade ? current[area] : area ? bases[area] : user.skin;
  const fit = shade && scoreShade({ area, baseHex: bases[area], perceivedHex: per, lean: scoring, look });
  const P = fit ? fit.lch : [0, 0, 0];
  const dL = fit ? P[0] - hexToLch(bases[area])[0] : 0;
  const leanWord = lean && lean.id !== 'not_sure' ? `your ${lean.id} lean` : 'a neutral start';

  // Fit for any product as it would look on this face (for the menu), at its own default finish.
  const scoreFor = useCallback((p) => scoreShade({
    area: p.area, baseHex: bases[p.area], perceivedHex: perceived(p.area, p.hex, p.fin, bases[p.area]), lean: scoring, look,
  }), [bases.lips, bases.cheeks, bases.eyes, scoring, look]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (p, from) => {
    const next = { ...sel, [p.area]: p.id };
    setSel(next);
    update({ picks: next });
    setFinOverride((f) => ({ ...f, [p.area]: null }));
    track('shade_viewed', { area: p.area, product_key: p.id, brand: p.brand, shade: p.shade, placeholder: true, from });
  };

  // Arriving from Explore (/studio?product=ID): zoom into that area wearing the product.
  useEffect(() => {
    const p = BY_ID.get(params.get('product'));
    if (!p || !canTry(p)) return;
    setArea(p.area);
    setZoomed(true);
    choose(p, 'explore');
    setParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pickArea = (id) => {
    setArea(id);
    setZoomed(true);
  };
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const pickFinish = (i) => setFinOverride((f) => ({ ...f, [area]: i }));
  const pickLook = (i) => update({ look: i });

  const science = !fit ? [] : [
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
  {!area && <p className="cu-fine cu-center cu-studio-hint">Tap lips, cheeks or eyes, then choose a product to try on her.</p>}
        </div>

        <div className="cu-pad-x">
          <FaceStage area={area} zoomed={zoomed} onToggleZoom={() => setZoomed((z) => !z)} current={current} defaults={DEFAULT_BASES}
            label={shade ? `Wearing ${shade.brand} ${shade.shade} on the ${area}.` : 'Bare face, matched to your skin and lips.'}
            chip={shade ? { hex: per, text: `On you ${per}` } : { hex: user.skin, text: `Skin ${user.skin}` }} />
        </div>

        {area && (<>
        {/* the product */}
        <section className="cu-pad-x" aria-labelledby="shade-name">
          {shade ? (
            <div className="glass cu-shadecard">
              <div className="cu-shadecard__head">
                <span className="cu-prod__tile cu-prod__tile--lg"><span className="cu-prod__swatch" style={{ background: shade.hex }} /></span>
                <div className="cu-shadecard__titles">
                  <span className="cu-eyebrow">{shade.brand}</span>
                  <h2 id="shade-name" className="cu-shadecard__name">{shade.name}</h2>
                  <span className="cu-shadecard__sub">{shade.shade} · {FINISHES[fin]}</span>
                </div>
              </div>
              <div className="cu-shadecard__actions">
                <span className="cu-tag cu-tag--quiet">Placeholder colour</span>
                {shade.price && <span className="cu-fine">{shade.price}{shade.where ? ` · ${shade.where}` : ''}</span>}
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
              <div className="cu-shadecard__buttons">
                <button type="button" className="btn-tint cu-btn" onClick={() => setMenuOpen(true)}>Try another {AREA_PRODUCT[area]}</button>
                {shade.link && (
                  <a href={shade.link} target="_blank" rel="noopener noreferrer" className="cu-link cu-center"
                    onClick={() => track('product_clicked', { product_key: shade.id, brand: shade.brand, shade: shade.shade, from: 'studio' })}>
                    Where to buy
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="glass cu-card cu-gap-s">
              <h2 id="shade-name" className="cu-shadecard__name">Choose a {AREA_PRODUCT[area]}</h2>
              <p className="cu-muted">
                {tryable(area).length
                  ? `Pick from ${tryable(area).length} ${AREA_PRODUCT[area]}s and see it on her, sorted by how well it suits you.`
                  : `${AREA_PRODUCT[area][0].toUpperCase() + AREA_PRODUCT[area].slice(1)} swatches are coming soon, so there's nothing to try on yet.`}
              </p>
              {tryable(area).length
                ? <button type="button" className="btn-primary cu-btn" onClick={() => setMenuOpen(true)}>Choose a product</button>
                : <Link to={`/explore?area=${area}`} className="btn-tint cu-btn">Browse {AREA_PRODUCT[area]}s in Explore</Link>}
            </div>
          )}
        </section>

        {shade && (<>
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
        {shade && (
        <section className="cu-pad-x">
          <div className="glass cu-sci">
            <button type="button" className="cu-sci__toggle" aria-expanded={sciOpen} aria-controls="sci-panel" onClick={() => setSciOpen((o) => !o)}>
              <span>The science</span>
              <span className="cu-sci__hint">{sciOpen ? 'Hide' : 'Show'}</span>
            </button>
            {sciOpen && (
              <div id="sci-panel" className="cu-sci__panel">
                <p className="cu-fine">The numbers behind {shade.shade} as it looks on you ({per}).</p>
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
        <ProductMenu open={menuOpen} onClose={closeMenu} area={area} selectedId={area ? sel[area] : null} scoreFor={scoreFor}
          onPick={(p) => { choose(p, 'menu'); setMenuOpen(false); }} />
      </div>
    </div>
  );
}
