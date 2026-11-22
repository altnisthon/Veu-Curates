// Product catalogue for Studio and Explore. One source for both screens.
// Today: the existing VEU Recommends list (src/products.js). Lip, blush and eye products only; a product can be
// tried on when its notes carry a measured colour code (94 of them). Phase 3 swaps this for Supabase products and
// shades (swatch research with true payoff) without changing the screens.
// Seasons in the old list are never shown: the app scores against the user's own lean instead.
import { PRODUCTS_DEFAULT } from '../../products';

const AREA_OF = { Lip: 'lips', Blush: 'cheeks', Eye: 'eyes' };
export const AREA_PRODUCT = { lips: 'lip colour', cheeks: 'blush', eyes: 'eyeshadow' };

// Finish guessed from the product name (0 Sheer, 1 Satin, 2 Matte); the user can change it in Studio.
const finishOf = (name) => {
  const n = name.toLowerCase();
  if (/(tint|oil|gloss|sheer|glow|balm|water|jelly|dew|lustreglass)/.test(n)) return 0;
  if (/(matte|velvet|powder|blur|mousse)/.test(n)) return 2;
  return 1;
};

// "028 Actrice (warm vivid coral-red)" -> { shade: "028 Actrice", note: "warm vivid coral-red" }
const splitShade = (s) => {
  const m = String(s || '').match(/^(.*?)\s*\((.*)\)\s*$/);
  return m ? { shade: m[1].trim(), note: m[2].trim() } : { shade: String(s || '').trim(), note: '' };
};

const seen = new Set();
export const CATALOGUE = PRODUCTS_DEFAULT
  .filter((p) => AREA_OF[p.c])
  .map((p) => {
    const hexMatch = String(p.no || '').match(/#[0-9a-f]{6}/i);
    const { shade, note } = splitShade(p.s);
    return {
      id: p.id,
      area: AREA_OF[p.c],
      brand: p.b,
      name: p.n,
      shade,
      note,
      hex: hexMatch ? hexMatch[0].toUpperCase() : null,
      fin: finishOf(p.n),
      price: p.p || '',
      where: p.w || '',
      link: p.l || '',
    };
  })
  .filter((p) => {
    const key = `${p.brand}|${p.name}|${p.shade}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

export const BY_ID = new Map(CATALOGUE.map((p) => [p.id, p]));
export const canTry = (p) => !!p?.hex;
export const tryable = (area) => CATALOGUE.filter((p) => p.area === area && canTry(p));
export const brandsFor = (list) => [...new Set(list.map((p) => p.brand))].sort((a, b) => a.localeCompare(b));

// Loose search across brand, name, shade and the short colour note.
export const matches = (p, q) => {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return `${p.brand} ${p.name} ${p.shade} ${p.note}`.toLowerCase().includes(s);
};
