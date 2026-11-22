// Tone wheel maths for "Your face". A point on the wheel (x, y inside the unit circle) is a skin or lip colour:
//   x: cool (-1) to warm (+1)  = hue angle, from rosy/berry to golden/brick
//   y: light (-1) to deep (+1) = lightness
//   chroma follows lightness along a curve through her own measured colour, so mid tones are richest.
// Ranges are centred on the featured character's measured tones, so her colouring is a point on the wheel
// and the default knob position shows the photo unchanged.
import { hexToLch, lchToHex } from '../../lib/colour';

// Her own colouring (sampled from the full-face photo).
export const HER = { skin: '#BC896F', lips: '#9E5954' };

const WHEELS = {
  // hue: [cool, warm] degrees; light/deep: lightness at the top and bottom; chroma: [L, C] points (light to deep)
  skin: { hue: [38, 72], light: 88, deep: 24, chroma: [[88, 14], [61.4, 27], [24, 17]] },
  lips: { hue: [8, 42], light: 80, deep: 24, chroma: [[80, 18], [45.7, 31.7], [24, 19]] },
};

const lerp = (a, b, t) => a + (b - a) * t;

const chromaAt = (pts, L) => {
  // piecewise linear through the points (sorted light to deep, so L decreasing)
  if (L >= pts[0][0]) return pts[0][1];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [L1, C1] = pts[i], [L2, C2] = pts[i + 1];
    if (L <= L1 && L >= L2) return lerp(C1, C2, (L1 - L) / (L1 - L2));
  }
  return pts[pts.length - 1][1];
};

// Keep a point inside the circle.
export const clampToDisc = ({ x, y }) => {
  const r = Math.hypot(x, y);
  return r <= 1 ? { x, y } : { x: x / r, y: y / r };
};

export const wheelToHex = (part, { x, y }) => {
  const w = WHEELS[part];
  const h = lerp(w.hue[0], w.hue[1], (x + 1) / 2);
  const L = lerp(w.light, w.deep, (y + 1) / 2);
  return lchToHex([L, chromaAt(w.chroma, L), h]);
};

// Where a colour sits on the wheel (for her default, or a typed colour code), clamped to the circle.
export const hexToWheel = (part, hex) => {
  const w = WHEELS[part];
  const [L, , h] = hexToLch(hex);
  const x = ((h - w.hue[0]) / (w.hue[1] - w.hue[0])) * 2 - 1;
  const y = ((w.light - L) / (w.light - w.deep)) * 2 - 1;
  return clampToDisc({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
};

// Plain-English reading of a point.
export const describe = ({ x, y }) => ({
  undertone: x < -0.33 ? 'Cool' : x > 0.33 ? 'Warm' : 'Neutral',
  depth: y < -0.33 ? 'Light' : y > 0.33 ? 'Deep' : 'Medium',
});
