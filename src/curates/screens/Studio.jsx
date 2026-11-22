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

// The readout under the wheel: swatch, plain-English reading, and an editable colour code with an info tooltip
// explaining that people can type their own hex code (for example the one from their VEU consultation).
function ToneReadout({ label, hex, pos, onHex }) {
  const [text, setText] = useState(hex);
  const [tip, setTip] = useState(false);
  const tipRef = useRef(null);
  useEffect(() => { setText(hex); }, [hex]);
  useEffect(() => {
    if (!tip) return undefined;
    const close = (e) => { if (e.type === 'keydown' ? e.key === 'Escape' : !tipRef.current?.contains(e.target)) setTip(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, [tip]);
  const commit = () => {
    const h = normaliseHex(text);
    if (h && h !== hex) onHex(h); else setText(hex);
  };
  const words = describe(pos);
  const id = `hex-tip-${label.toLowerCase()}`;
  return (
    <div className="cu-tone__readout">
      <span className="cu-tone__dot" style={{ background: hex }} aria-hidden="true" />
      <span className="cu-tone__name">{label}<span className="cu-tone__words">{words.undertone} · {words.depth}</span></span>
      <div className="cu-tone__code" ref={tipRef}>
        <input type="text" className="cu-tone__hex" value={text} spellCheck="false" autoCapitalize="characters" maxLength={7} inputMode="text"
          aria-label={`${label} colour code`} aria-describedby={id} onChange={(e) => setText(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); e.currentTarget.blur(); } }} />
        <button type="button" className="cu-tone__info" aria-label="About colour codes" aria-expanded={tip} aria-controls={id} onClick={() => setTip((t) => !t)}>
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="10" cy="6.4" r="1.1" fill="currentColor" /><path d="M10 9v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
        <div id={id} role="tooltip" className={`cu-tip${tip ? ' is-open' : ''}`}>
          <strong>Know your exact colour?</strong>
          Tap the code and type your own hex, like #C68D6E, then press return. VEU clients can use the {label.toLowerCase()} code from their consultation.
        </div>
      </div>
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
            <>
              <div className="glass cu-phead">
                <span className="cu-gtile cu-gtile--lg" aria-hidden="true"><span className="cu-gswatch cu-gswatch--lg" style={{ background: shade.hex }} /></span>
                <div className="cu-phead__text">
                  <span className="cu-eyebrow">{shade.brand}</span>
                  <h2 id="shade-name" className="cu-phead__name">{shade.name}</h2>
                  <span className="cu-phead__sub">{shade.shade} · {FINISHES[fin]}</span>
                  <span className="cu-tag cu-tag--quiet cu-phead__tag">Placeholder colour</span>
                </div>
                <button type="button" className="cu-capsule cu-capsule--tint" onClick={() => setMenuOpen(true)}>Change</button>
              </div>

              <h3 className="cu-glabel">Fit for {leanWord}</h3>
              <div className="cu-group">
                <div className="cu-gcell cu-fitcell">
                  <div className="cu-fit__row">
                    <span className={`cu-fit__verdict cu-fit__verdict--${fit.score >= 75 ? 'strong' : fit.score >= 55 ? 'wearable' : 'low'}`}>{fit.verdict}</span>
                    <span className="cu-fit__score">{fit.score}</span>
                  </div>
                  <div className="cu-fit__bar" aria-hidden="true"><span style={{ width: `${fit.score}%` }} /></div>
                  <p className="cu-fit__reason">{fit.reason}</p>
                </div>
              </div>
              <p className="cu-gfoot">
                Fit score out of 100: how well this shade, as it looks on you, suits {leanWord} and the look you picked.
                {!lean && <> <Link to="/undertone">Pick your undertone</Link> for a truer score.</>}
              </p>

              {shade.link && (
                <ul className="cu-group cu-group--spaced">
                  <li>
                    <a href={shade.link} target="_blank" rel="noopener noreferrer" className="cu-grow cu-grow--link"
                      onClick={() => track('product_clicked', { product_key: shade.id, brand: shade.brand, shade: shade.shade, from: 'studio' })}>
                      <span className="cu-gtext">
                        <span className="cu-gtitle">Where to buy</span>
                        <span className="cu-gsub">{[shade.price, shade.where].filter(Boolean).join(' · ')}</span>
                      </span>
                      <svg className="cu-chev" width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m1 1 6 6-6 6" /></svg>
                    </a>
                  </li>
                </ul>
              )}
            </>
          ) : (
            <div className="glass cu-choose">
              <span className="cu-choose__icon" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5c3 4 6 7.2 6 10.5a6 6 0 0 1-12 0c0-3.3 3-6.5 6-10.5z" /></svg>
              </span>
              <h2 id="shade-name" className="cu-choose__title">Choose a {AREA_PRODUCT[area]}</h2>
              <p className="cu-choose__text">
                {tryable(area).length
                  ? `${tryable(area).length} to try on her, sorted by how well each suits you.`
                  : `${AREA_PRODUCT[area][0].toUpperCase() + AREA_PRODUCT[area].slice(1)} swatches are on their way, so there's nothing to try on yet.`}
              </p>
              {tryable(area).length
                ? <button type="button" className="btn-primary cu-btn" onClick={() => setMenuOpen(true)}>Choose a product</button>
                : <Link to={`/explore?area=${area}`} className="btn-tint cu-btn">Browse {AREA_PRODUCT[area]}s in Explore</Link>}
            </div>
          )}
        </section>

        {shade && (
        <section className="cu-pad-x" aria-labelledby="application">
          <h3 id="application" className="cu-glabel">Application</h3>
          <ul className="cu-group">
            <li className="cu-gcell cu-gcell--row">
              <span className="cu-gcell__label">Finish</span>
              <Segmented label="Finish" options={FINISHES} value={fin} onChange={pickFinish} />
            </li>
            <li className="cu-gcell cu-gcell--row">
              <span className="cu-gcell__label">Look</span>
              <Segmented label="Look" options={LOOKS} value={look} onChange={pickLook} />
            </li>
          </ul>
          <p className="cu-gfoot">Finish changes how much colour shows. Look is the effect you're going for, and it shapes the fit score.</p>
        </section>
        )}
        </>)}

        {/* your face */}
        <section className="cu-pad-x" aria-labelledby="your-face">
          <h3 id="your-face" className="cu-glabel">Your face</h3>
          <div className="cu-group cu-tone">
            <Segmented label="Choose skin or lips" options={['Skin', 'Lips']} value={wheelPart === 'skin' ? 0 : 1} onChange={(i) => setWheelPart(i ? 'lips' : 'skin')} />
            <ToneWheel key={wheelPart} part={wheelPart} label={wheelPart === 'skin' ? 'Skin' : 'Lips'} pos={posOf(wheelPart)}
              onChange={(p) => change(wheelPart, 'wheel', wheelPart === 'skin' ? { skin: p, skinHex: null } : { lips: p, lipHex: null })} />
            <ToneReadout label={wheelPart === 'skin' ? 'Skin' : 'Lips'} hex={user[wheelPart]} pos={posOf(wheelPart)}
              onHex={(h) => change(wheelPart, 'hex', wheelPart === 'skin' ? { skinHex: h, skin: null } : { lipHex: h, lips: null })} />
          </div>
          <p className="cu-gfoot">
            Drag across the wheel: left is cooler, right is warmer, up is lighter, down is deeper. Stop where the face looks like you.
            VEU clients will start from the skin colour measured at their consultation.
          </p>
          {custom && (
            <button type="button" className="cu-textbtn cu-gfoot-btn" onClick={() => change('both', 'reset', { ...EMPTY_TONE })}>
              Reset to her colouring
            </button>
          )}
        </section>

        {/* the science */}
        {shade && (
        <section className="cu-pad-x">
          <div className="cu-group cu-group--spaced">
            <button type="button" className="cu-grow cu-disclosure" aria-expanded={sciOpen} aria-controls="sci-panel" onClick={() => setSciOpen((o) => !o)}>
              <span className="cu-gtext"><span className="cu-gtitle">The science</span><span className="cu-gsub">The numbers behind {shade.shade} on you</span></span>
              <svg className="cu-chev" width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m1 1 6 6-6 6" /></svg>
            </button>
            {sciOpen && (
              <ul id="sci-panel" className="cu-sci-list">
                {science.map((r) => (
                  <li key={r.label} className="cu-gcell cu-sci-row">
                    <div className="cu-sci__top"><span>{r.label}</span><span className="cu-sci__val">{r.value}</span></div>
                    <span className="cu-sci__note">{r.note}</span>
                  </li>
                ))}
              </ul>
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
