// Explore: every lip colour, blush and eyeshadow we list. Ones we have a colour for can be tried on in Studio
// (opens Studio zoomed in, wearing it). Sorted with try-on products first, best fit for the user's face and lean.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { areaBases, perceived, scoreShade } from '../../lib/colour';
import { ScreenHeader } from '../components/Chrome';
import { CATALOGUE, canTry, matches } from '../lib/catalogue';
import { scoringLean } from '../lib/leans';
import { usePrefs } from '../lib/prefs';
import { userTones } from '../lib/tone';
import { track } from '../lib/track';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'lips', label: 'Lips' },
  { id: 'cheeks', label: 'Cheeks' },
  { id: 'eyes', label: 'Eyes' },
];
const AREA_WORD = { lips: 'Lip', cheeks: 'Blush', eyes: 'Eyeshadow' };

export default function Explore() {
  const { prefs } = usePrefs();
  const [params, setParams] = useSearchParams();
  const area = FILTERS.some((f) => f.id === params.get('area')) ? params.get('area') : 'all';
  const [q, setQ] = useState('');
  const searchTimer = useRef(null);

  const bases = useMemo(() => { const t = userTones(prefs.tone); return areaBases(t.skin, t.lips); }, [prefs.tone]);
  const lean = scoringLean(prefs.lean || 'not_sure');

  const list = useMemo(() => {
    const rows = CATALOGUE.filter((p) => (area === 'all' || p.area === area) && matches(p, q)).map((p) => ({
      p,
      fit: canTry(p) ? scoreShade({ area: p.area, baseHex: bases[p.area], perceivedHex: perceived(p.area, p.hex, p.fin, bases[p.area]), lean, look: prefs.look ?? 1 }) : null,
    }));
    rows.sort((a, b) => (b.fit ? 1 : 0) - (a.fit ? 1 : 0) || (b.fit?.score ?? 0) - (a.fit?.score ?? 0) || a.p.brand.localeCompare(b.p.brand));
    return rows;
  }, [area, q, bases, lean, prefs.look]);

  // Log searches once the user stops typing.
  useEffect(() => {
    if (!q.trim()) return undefined;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => track(list.length ? 'search' : 'search_no_results', { q: q.trim().slice(0, 60), area, results: list.length }), 1000);
    return () => clearTimeout(searchTimer.current);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const tryCount = list.filter((r) => r.fit).length;

  const tryRows = list.filter((r) => r.fit);
  const soonRows = list.filter((r) => !r.fit);
  const TONE = { 'Strong match': 'strong', Wearable: 'wearable', 'Not your best': 'low' };

  const row = ({ p, fit }) => (
    <li key={p.id}>
      <div className="cu-grow cu-grow--static">
        <span className="cu-gtile" aria-hidden="true">
          <span className={`cu-gswatch${p.hex ? '' : ' cu-prod__swatch--none'}`} style={p.hex ? { background: p.hex } : undefined} />
        </span>
        <span className="cu-gtext">
          <span className="cu-gtitle">{p.shade}</span>
          <span className="cu-gsub">{p.brand} · {p.name}</span>
          <span className="cu-gsub cu-gsub--meta">{AREA_WORD[p.area]}{p.price ? ` · ${p.price}` : ''}</span>
        </span>
        {fit ? (
          <>
            <span className={`cu-fitcap cu-fitcap--${TONE[fit.verdict]}`} title={`${fit.verdict}, fit ${fit.score} out of 100`}>{fit.score}</span>
            <Link to={`/studio?product=${encodeURIComponent(p.id)}`} className="cu-trybtn" aria-label={`Try ${p.brand} ${p.shade} on in Studio`}>Try</Link>
          </>
        ) : (
          <span className="cu-soon">Soon</span>
        )}
      </div>
    </li>
  );

  return (
    <div className="cu-screen">
      <ScreenHeader trail={[{ label: 'Explore', to: '/explore' }]} />
      <div className="cu-explore">
        <div className="cu-pad-x cu-gap-s">
          <h1>Explore</h1>
          <p className="cu-muted">Lip colours, blushes and eyeshadows. Try any with a swatch on her face in Studio.</p>
        </div>

        <div className="cu-explore__controls">
          <label className="cu-isearch">
            <span className="sr-only">Search products</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brand or shade" autoComplete="off" enterKeyHint="search" />
            {q && (
              <button type="button" className="cu-isearch__clear" onClick={() => setQ('')} aria-label="Clear search">
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="8" fill="currentColor" /><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            )}
          </label>
          <div className="cu-capsules" role="group" aria-label="Filter by area">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" className={`cu-capsule${area === f.id ? ' is-on' : ''}`} aria-pressed={area === f.id}
                onClick={() => setParams(f.id === 'all' ? {} : { area: f.id }, { replace: true })}>{f.label}</button>
            ))}
          </div>
        </div>

        <div className="cu-pad-x">
          {tryRows.length > 0 && (
            <section>
              <h2 className="cu-glabel">Try on her · best for you first</h2>
              <ul className="cu-group">{tryRows.map(row)}</ul>
            </section>
          )}
          {soonRows.length > 0 && (
            <section>
              <h2 className="cu-glabel">Swatch coming soon</h2>
              <ul className="cu-group">{soonRows.map(row)}</ul>
            </section>
          )}
          {list.length === 0 && <p className="cu-pm__none">Nothing matches “{q}”. Try another brand or shade name.</p>}
          <p className="cu-gfoot" aria-live="polite">
            {list.length} products, {tryCount} you can try on. The score is out of 100: how well each one, as it looks on you, suits your lean.
            Colours are placeholders until our swatch research is in.
          </p>
        </div>
      </div>
    </div>
  );
}
