// VEU Curates colour engine.
// Pure functions, no dependencies. Runs on the device so previews update instantly.
// Ported from the mockup's Shade Studio logic; ΔE upgraded to CIEDE2000 as the spec asks.

// ---------- conversions ----------
export const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

export const rgbToHex = (rgb) =>
  '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();

const toLinear = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const fromLinear = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255;

export const hexToLab = (hex) => {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  let y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = f(x); y = f(y); z = f(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};

export const labToLch = ([L, a, b]) => {
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return [L, Math.hypot(a, b), h];
};

export const hexToLch = (hex) => labToLch(hexToLab(hex));

// Inverse of hexToLab (same D65 white). Out-of-gamut values are clipped.
export const labToHex = ([L, a, b]) => {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const inv = (t) => (t * t * t > 0.008856 ? t * t * t : (t - 16 / 116) / 7.787);
  const x = inv(fx) * 0.95047, y = inv(fy), z = inv(fz) * 1.08883;
  const lin = [
    3.2406 * x - 1.5372 * y - 0.4986 * z,
    -0.9689 * x + 1.8758 * y + 0.0415 * z,
    0.0557 * x - 0.204 * y + 1.057 * z,
  ];
  return rgbToHex(lin.map((v) => fromLinear(Math.max(0, Math.min(1, v)))));
};

export const lchToHex = ([L, C, h]) => {
  const r = (h * Math.PI) / 180;
  return labToHex([L, C * Math.cos(r), C * Math.sin(r)]);
};

// Move `hex` by the same Lab step as fromHex -> toHex.
// Each photo was measured separately, so a close-up's skin is not exactly the full face's skin.
// Shifting each photo by the user's change keeps every scene consistent and unchanged at the defaults.
export const shiftLike = (hex, fromHex, toHex) => {
  const [h, f, t] = [hex, fromHex, toHex].map(hexToLab);
  return labToHex(h.map((v, i) => v + t[i] - f[i]));
};

// Accepts "#abc123", "abc123", "#abc" or "abc". Returns "#ABC123" or null.
export const normaliseHex = (input) => {
  let h = String(input || '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.split('').map((c) => c + c).join('');
  return /^[0-9a-f]{6}$/i.test(h) ? `#${h.toUpperCase()}` : null;
};

// ---------- blending ----------
// Mix in linear RGB so pigment over skin behaves physically. t = product opacity (0-1).
export const mixLinear = (baseHex, topHex, t) => {
  const A = hexToRgb(baseHex).map(toLinear);
  const B = hexToRgb(topHex).map(toLinear);
  return rgbToHex(A.map((v, i) => fromLinear(v * (1 - t) + B[i] * t)));
};

// Position along a ramp of stops, t = 0-100. Used by the skin and lip sliders.
export const rampAt = (stops, t) => {
  const p = (t / 100) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(p));
  return mixLinear(stops[i], stops[i + 1], p - i);
};

// ---------- CIEDE2000 ----------
export const deltaE2000 = (lab1, lab2) => {
  const [L1, a1, b1] = lab1, [L2, a2, b2] = lab2;
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cb, 7) / (Math.pow(Cb, 7) + Math.pow(25, 7))));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h = (a, b) => { if (a === 0 && b === 0) return 0; const v = Math.atan2(b, a) * deg; return v < 0 ? v + 360 : v; };
  const h1p = h(a1p, b1), h2p = h(a2p, b2);
  const dLp = L2 - L1, dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) { dhp = h2p - h1p; if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360; }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
  const Lbp = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  let hbp = h1p + h2p;
  if (C1p * C2p !== 0) { hbp = Math.abs(h1p - h2p) > 180 ? (h1p + h2p + (h1p + h2p < 360 ? 360 : -360)) / 2 : (h1p + h2p) / 2; }
  const T = 1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad) + 0.32 * Math.cos((3 * hbp + 6) * rad) - 0.2 * Math.cos((4 * hbp - 63) * rad);
  const dTheta = 30 * Math.exp(-Math.pow((hbp - 275) / 25, 2));
  const Rc = 2 * Math.sqrt(Math.pow(Cbp, 7) / (Math.pow(Cbp, 7) + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lbp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbp - 50, 2));
  const Sc = 1 + 0.045 * Cbp, Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt(Math.pow(dLp / Sl, 2) + Math.pow(dCp / Sc, 2) + Math.pow(dHp / Sh, 2) + Rt * (dCp / Sc) * (dHp / Sh));
};

// ---------- app constants (tune against real swatches) ----------
export const FINISHES = ['Sheer', 'Satin', 'Matte'];
export const ALPHA = { lips: [0.42, 0.7, 0.9], cheeks: [0.28, 0.45, 0.6], eyes: [0.35, 0.55, 0.75] };
export const LOOKS = ['Natural', 'Everyday', 'Bold'];
export const LOOK_TARGETS = { lips: [[3, 9], [9, 18], [18, 40]], cheeks: [[2, 6], [6, 12], [12, 25]], eyes: [[2, 6], [6, 12], [12, 25]] };
// Undertone lean targets: hue-angle window that reads as that lean, plus a soft lightness/chroma centre per area.
export const LEANS = {
  warm: { hue: [25, 75] },
  cool: { hue: [345, 25] },
  neutral: { hue: [15, 45] },
};
export const AREA_TARGET = { lips: { L: 55, C: 45 }, cheeks: { L: 66, C: 38 }, eyes: { L: 60, C: 30 } };

// Slider ramps. Index 2 equals the featured character's own sampled tone, so the default slider position = the photo.
export const SKIN_RAMP = ['#F3D7C4', '#E4B89D', '#BC896F', '#9A6A50', '#6E4A36', '#4A2F22']; // default t = 40
export const LIP_RAMP = ['#E8B9B2', '#C98A84', '#9E5954', '#7A3F3B', '#56302D']; // default t = 50

// Derived base colours for each area from the user's skin and lips.
export const areaBases = (skinHex, lipHex) => ({
  skin: skinHex,
  lips: lipHex,
  cheeks: mixLinear(skinHex, '#E3907E', 0.16),
  eyes: mixLinear(skinHex, '#7A5646', 0.1),
});

// What the user would see: product (true payoff hex) over their own colour.
export const perceived = (area, productHex, finishIndex, baseHex) =>
  mixLinear(baseHex, productHex, ALPHA[area][finishIndex]);

const inHueWindow = (h, [a, b]) => (a <= b ? h >= a && h <= b : h >= a || h <= b);
const hueDistance = (h, [a, b]) => {
  if (inHueWindow(h, [a, b])) return 0;
  const d = (x, y) => Math.min(Math.abs(x - y), 360 - Math.abs(x - y));
  return Math.min(d(h, a), d(h, b));
};

// Fit score 0-100 with a one-line plain-English reason.
export const scoreShade = ({ area, baseHex, perceivedHex, lean = 'warm', look = 1, prefs = null }) => {
  const P = hexToLch(perceivedHex);
  const dE = deltaE2000(hexToLab(baseHex), hexToLab(perceivedHex));
  const t = AREA_TARGET[area];
  const undertone = 100 - hueDistance(P[2], LEANS[lean].hue) * 2.2 - Math.abs(P[0] - t.L) * 0.6 - Math.abs(P[1] - t.C) * 0.5;
  const [lo, hi] = LOOK_TARGETS[area][look];
  const lookFit = dE < lo ? 100 - (lo - dE) * 6 : dE > hi ? 100 - (dE - hi) * 4 : 100;
  let score = undertone * 0.6 + lookFit * 0.4;
  if (prefs) score += prefs.adjust(P); // learned like/dislike nudges, bounded by the caller
  score = Math.max(0, Math.min(100, Math.round(score)));
  const warm = inHueWindow(P[2], LEANS.warm.hue);
  const chroma = P[1] > 50 ? 'bright' : P[1] > 30 ? 'clear' : 'soft';
  const targets = LOOK_TARGETS[area];
  const effect = dE < targets[0][1] ? 'close to your natural colour' : dE < targets[1][1] ? 'reads as everyday colour' : 'reads bold';
  const verdict = score >= 75 ? 'Strong match' : score >= 55 ? 'Wearable' : 'Not your best';
  return {
    score, verdict, dE, lch: P,
    reason: `${warm ? 'Warm' : 'Cool'} and ${chroma}, ${effect}.`,
    science: { L: Math.round(P[0]), C: Math.round(P[1]), h: Math.round(P[2]), dE: Math.round(dE) },
  };
};

// "Recommend me" after a dislike. reason: 'colour' | 'bright' | 'temp'
export const recommendAfterDislike = ({ candidates, current, reason, warm }) => {
  const cur = hexToLch(current.perceivedHex);
  const others = candidates.filter((c) => c.id !== current.id).map((c) => ({ c, Q: hexToLch(c.perceivedHex) }));
  const sorted =
    reason === 'bright' ? others.sort((a, b) => a.Q[1] - b.Q[1])
    : reason === 'temp' ? others.sort((a, b) => (warm ? a.Q[2] - b.Q[2] : b.Q[2] - a.Q[2]))
    : others.sort((a, b) => Math.abs(b.Q[2] - cur[2]) - Math.abs(a.Q[2] - cur[2]));
  return sorted.slice(0, 3).map((o) => o.c);
};
