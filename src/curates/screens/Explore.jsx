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

  return (
    <div className="cu-screen">
      <ScreenHeader trail={[{ label: 'Explore', to: '/explore' }]} />
      <div className="cu-pad cu-gap-l">
        <div className="cu-gap-s">
          <h1>Explore</h1>
          <p className="cu-muted">Lip colours, blushes and eyeshadows. Try any with a colour on the face in Studio.</p>
        </div>

        <div className="cu-gap-s">
          <label className="cu-search">
            <span className="sr-only">Search products</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brand or shade" autoComplete="off" />
          </label>
          <div className="cu-pills cu-pills--start" role="group" aria-label="Filter by area">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" className={`cu-pill-btn${area === f.id ? ' is-on' : ''}`} aria-pressed={area === f.id}
                onClick={() => setParams(f.id === 'all' ? {} : { area: f.id }, { replace: true })}>{f.label}</button>
            ))}
          </div>
          <p className="cu-fine" aria-live="polite">{list.length} products, {tryCount} you can try on. Colours are placeholders until our swatch research is in.</p>
        </div>

        <ul className="cu-explore__list">
          {list.map(({ p, fit }) => (
            <li key={p.id} className="cu-prod cu-prod--static">
              <span className="cu-prod__tile">
                <span className={`cu-prod__swatch${p.hex ? '' : ' cu-prod__swatch--none'}`} style={p.hex ? { background: p.hex } : undefined} />
              </span>
              <span className="cu-prod__text">
                <span className="cu-prod__brand">{p.brand} · {AREA_WORD[p.area]}</span>
                <span className="cu-prod__name">{p.name}</span>
                <span className="cu-prod__shade">{p.shade}{p.price ? ` · ${p.price}` : ''}</span>
                {fit && <span className="cu-prod__verdict cu-prod__verdict--inline">{fit.verdict} for you · {fit.score}</span>}
              </span>
              {fit ? (
                <Link to={`/studio?product=${encodeURIComponent(p.id)}`} className="cu-trybtn">Try on</Link>
              ) : (
                <span className="cu-tag cu-tag--quiet">Swatch soon</span>
              )}
            </li>
          ))}
        </ul>
        {list.length === 0 && <p className="cu-muted">Nothing matches that. Try another brand or shade name.</p>}
      </div>
    </div>
  );
}
