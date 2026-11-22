// "Choose a product" sheet in Studio, following iOS sheet patterns in VEU's soft-futurist look:
// frosted glass sheet with a grabber and Done, a pinned header (title, search, brand capsules, sort segmented
// control) and an inset grouped list with section headers, hairline separators and a checkmark on the pick.
// Lists every product for this area that we have a colour for, scored as it would look on the user.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Sheet from './Sheet';
import { AREA_PRODUCT, brandsFor, matches, tryable } from '../lib/catalogue';

const TITLE = { lips: 'Lip colour', cheeks: 'Blush', eyes: 'Eyeshadow' };
const TONE = { 'Strong match': 'strong', Wearable: 'wearable', 'Not your best': 'low' };

function Row({ p, fit, selected, onPick }) {
  return (
    <li>
      <button type="button" className={`cu-pm__row${selected ? ' is-on' : ''}`} aria-pressed={selected} onClick={() => onPick(p)}
        aria-label={`${p.brand} ${p.name}, ${p.shade}. ${fit.verdict}, fit ${fit.score} out of 100`}>
        {/* neutral tile so the product colour reads true */}
        <span className="cu-pm__tile" aria-hidden="true"><span className="cu-pm__swatch" style={{ background: p.hex }} /></span>
        <span className="cu-pm__text">
          <span className="cu-pm__shade">{p.shade}</span>
          <span className="cu-pm__product">{p.brand} · {p.name}</span>
        </span>
        <span className={`cu-pm__fit cu-pm__fit--${TONE[fit.verdict]}`} aria-hidden="true">{fit.score}</span>
        <span className="cu-pm__check" aria-hidden="true">
          {selected && <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5 6.5 12 13 4.5" /></svg>}
        </span>
      </button>
    </li>
  );
}

function Group({ title, rows, selectedId, onPick }) {
  if (!rows.length) return null;
  return (
    <section className="cu-pm__section">
      <h3 className="cu-pm__label">{title}</h3>
      <ul className="cu-pm__group">
        {rows.map(({ p, fit }) => <Row key={p.id} p={p} fit={fit} selected={p.id === selectedId} onPick={onPick} />)}
      </ul>
    </section>
  );
}

export default function ProductMenu({ open, onClose, area, selectedId, scoreFor, onPick }) {
  const [q, setQ] = useState('');
  const [brand, setBrand] = useState('all');
  const [sort, setSort] = useState('fit');
  const all = useMemo(() => (area ? tryable(area) : []), [area]);
  const brands = useMemo(() => brandsFor(all), [all]);

  const rows = useMemo(() => {
    const r = all.filter((p) => (brand === 'all' || p.brand === brand) && matches(p, q)).map((p) => ({ p, fit: scoreFor(p) }));
    r.sort(sort === 'fit' ? (a, b) => b.fit.score - a.fit.score : (a, b) => `${a.p.brand}${a.p.name}${a.p.shade}`.localeCompare(`${b.p.brand}${b.p.name}${b.p.shade}`));
    return r;
  }, [all, brand, q, sort, scoreFor]);

  // Sections: by fit (best first), or by brand when sorted A to Z.
  const sections = useMemo(() => {
    if (sort === 'fit') {
      return [
        { title: 'Best for you', rows: rows.filter((r) => r.fit.score >= 75) },
        { title: 'More to try', rows: rows.filter((r) => r.fit.score < 75) },
      ];
    }
    const byBrand = new Map();
    rows.forEach((r) => byBrand.set(r.p.brand, [...(byBrand.get(r.p.brand) || []), r]));
    return [...byBrand].map(([title, list]) => ({ title, rows: list }));
  }, [rows, sort]);

  if (!area) return null;
  const what = AREA_PRODUCT[area];

  return (
    <Sheet open={open} onClose={onClose} labelledBy="menu-title" className="cu-sheet--list" showClose={false} focusSelector=".cu-pm__done">
      <div className="cu-pm">
        <header className="cu-pm__head">
          <div className="cu-pm__bar">
            <div>
              <h2 id="menu-title" className="cu-pm__title">{TITLE[area]}</h2>
              <p className="cu-pm__sub">{all.length ? `${all.length} to try on her, scored for you` : 'Coming soon'}</p>
            </div>
            <button type="button" className="cu-pm__done" onClick={onClose}>Done</button>
          </div>

          {all.length > 0 && (
            <>
              <label className="cu-pm__search">
                <span className="sr-only">Search {what}s</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" autoComplete="off" enterKeyHint="search" />
                {q && (
                  <button type="button" className="cu-pm__clear" onClick={() => setQ('')} aria-label="Clear search">
                    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="8" fill="currentColor" /><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  </button>
                )}
              </label>

              <div className="cu-pm__capsules" role="group" aria-label="Filter by brand">
                {['all', ...brands].map((b) => (
                  <button key={b} type="button" className={`cu-pm__capsule${brand === b ? ' is-on' : ''}`} aria-pressed={brand === b} onClick={() => setBrand(b)}>
                    {b === 'all' ? 'All' : b}
                  </button>
                ))}
              </div>

              <div className="cu-seg cu-pm__sort" role="group" aria-label="Sort">
                {[['fit', 'Best for you'], ['brand', 'A to Z']].map(([id, label]) => (
                  <button key={id} type="button" aria-pressed={sort === id} className={sort === id ? 'is-on' : ''} onClick={() => setSort(id)}>{label}</button>
                ))}
              </div>
            </>
          )}
        </header>

        <div className="cu-pm__scroll">
          {all.length === 0 ? (
            <div className="cu-pm__empty">
              <p>{what[0].toUpperCase() + what.slice(1)} swatches are on their way, so there's nothing to try on yet.</p>
              <Link to={`/explore?area=${area}`} className="btn-tint cu-btn" onClick={onClose}>Browse {what}s in Explore</Link>
            </div>
          ) : (
            <>
              {sections.map((s) => <Group key={s.title} title={s.title} rows={s.rows} selectedId={selectedId} onPick={onPick} />)}
              {rows.length === 0 && <p className="cu-pm__none">No {what}s match “{q}”.</p>}
              <p className="cu-pm__foot" aria-live="polite">
                {rows.length} {rows.length === 1 ? 'result' : 'results'}. The score is out of 100: how well each one, as it looks on you, suits your lean.
                Colours are placeholders until our swatch research is in.
              </p>
            </>
          )}
        </div>
      </div>
    </Sheet>
  );
}
