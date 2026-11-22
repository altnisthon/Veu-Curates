// "Choose a product" sheet in Studio: every product for this area that we have a colour for.
// Search, brand filter, and a sort by fit (as it would look on you) or by brand.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Sheet from './Sheet';
import { AREA_PRODUCT, brandsFor, matches, tryable } from '../lib/catalogue';

export default function ProductMenu({ open, onClose, area, selectedId, scoreFor, onPick }) {
  const [q, setQ] = useState('');
  const [brand, setBrand] = useState('all');
  const [sort, setSort] = useState('fit');
  const all = useMemo(() => (area ? tryable(area) : []), [area]);
  const brands = useMemo(() => brandsFor(all), [all]);

  const list = useMemo(() => {
    const rows = all.filter((p) => (brand === 'all' || p.brand === brand) && matches(p, q)).map((p) => ({ p, fit: scoreFor(p) }));
    rows.sort(sort === 'fit' ? (a, b) => b.fit.score - a.fit.score : (a, b) => `${a.p.brand}${a.p.name}${a.p.shade}`.localeCompare(`${b.p.brand}${b.p.name}${b.p.shade}`));
    return rows;
  }, [all, brand, q, sort, scoreFor]);

  if (!area) return null;
  const what = AREA_PRODUCT[area];
  return (
    <Sheet open={open} onClose={onClose} labelledBy="menu-title">
      <div className="cu-sheet__body cu-menu">
        <div>
          <h2 id="menu-title" className="cu-sheet__title">Choose a {what}</h2>
          <p className="cu-muted">{all.length ? `${all.length} to try on. Colours are placeholders until our swatch research is in.` : ''}</p>
        </div>

        {all.length === 0 ? (
          <div className="cu-gap-s">
            <p className="cu-muted">{what[0].toUpperCase() + what.slice(1)} swatches are coming soon, so there's nothing to try on yet.</p>
            <Link to="/explore?area=eyes" className="btn-tint cu-btn" onClick={onClose}>Browse eyeshadows in Explore</Link>
          </div>
        ) : (
          <>
            <div className="cu-menu__controls">
              <label className="cu-search">
                <span className="sr-only">Search {what}s</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brand or shade" autoComplete="off" />
              </label>
              <div className="cu-menu__row">
                <label className="cu-select">
                  <span className="sr-only">Brand</span>
                  <select value={brand} onChange={(e) => setBrand(e.target.value)}>
                    <option value="all">All brands</option>
                    {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </label>
                <label className="cu-select">
                  <span className="sr-only">Sort</span>
                  <select value={sort} onChange={(e) => setSort(e.target.value)}>
                    <option value="fit">Best for you</option>
                    <option value="brand">Brand A to Z</option>
                  </select>
                </label>
              </div>
            </div>

            <p className="cu-fine" aria-live="polite">{list.length} {list.length === 1 ? 'result' : 'results'}</p>
            <ul className="cu-menu__list">
              {list.map(({ p, fit }) => (
                <li key={p.id}>
                  <button type="button" className={`cu-prod${p.id === selectedId ? ' is-on' : ''}`} aria-pressed={p.id === selectedId} onClick={() => onPick(p)}>
                    {/* neutral tile so the product colour reads true */}
                    <span className="cu-prod__tile"><span className="cu-prod__swatch" style={{ background: p.hex }} /></span>
                    <span className="cu-prod__text">
                      <span className="cu-prod__brand">{p.brand}</span>
                      <span className="cu-prod__name">{p.name}</span>
                      <span className="cu-prod__shade">{p.shade}</span>
                    </span>
                    <span className="cu-prod__fit" title="Fit score out of 100">
                      <span className="cu-prod__score">{fit.score}</span>
                      <span className="cu-prod__verdict">{fit.verdict}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {list.length === 0 && <p className="cu-muted">Nothing matches that. Try another brand or shade name.</p>}
          </>
        )}
      </div>
    </Sheet>
  );
}
