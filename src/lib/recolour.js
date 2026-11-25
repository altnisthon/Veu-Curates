// Recolours the featured character photo in the browser using CSS masks + blend modes.
// Each area (skin, lips, cheek, lid) is two stacked layers clipped by an alpha mask PNG:
//   1. a lightness layer (multiply to darken, color-dodge to lighten) that scales the photo's own
//      light and shade, so depth changes look real and the skin texture stays
//   2. a colour layer (mix-blend-mode: color) that swaps hue and saturation but keeps the photo's texture
// The scene wrapper needs `isolation: isolate` so layers blend with the photo only.

import { deltaE2000, hexToLab, hexToRgb, shiftLike } from './colour';

const luma = (hex) => { const [r, g, b] = hexToRgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

// Below this ΔE the target is the photo's own colour, so the layers stay off and the photo is untouched
// (a flat colour layer would otherwise even out the photo's natural variation).
const SAME = 1;
// Most a lightness layer may brighten: 1 / (1 - 0.45) ≈ 1.8x. Enough for the lightest skin on the slider.
const MAX_DODGE = 0.45;

// B = colour currently in the photo for that area, T = target colour, op = colour layer opacity.
export const layerStyles = (B, T, op = 0.9, on = true) => {
  if (!on || !B || !T || deltaE2000(hexToLab(B), hexToLab(T)) < SAME) return { lightness: { opacity: 0 }, colour: { opacity: 0 } };
  const lb = Math.max(0.02, luma(B));
  const r = luma(T) / lb;
  let lightness;
  if (r <= 1) {
    const g = Math.round(255 * r);
    lightness = { background: `rgb(${g},${g},${g})`, mixBlendMode: 'multiply' };
  } else {
    // color-dodge divides by (1 - s), so every pixel is scaled up by the same ratio r: the mirror of
    // multiply. Shading, pores and shine keep their contrast. (Screen squashed contrast and flattened the photo.)
    // Capped so very light targets don't blow out the brightest areas.
    const s = Math.min(MAX_DODGE, 1 - 1 / r);
    const g = Math.round(255 * s);
    lightness = { background: `rgb(${g},${g},${g})`, mixBlendMode: 'color-dodge' };
  }
  return { lightness, colour: { background: T, mixBlendMode: 'color', opacity: op } };
};

// Scenes: the full face plus three close-ups. `sampled` = colours measured from each photo
// (see assets/character/sampled-colours.json). Masks are white PNGs whose alpha marks the area.
export const SCENES = {
  base: { img: 'p_base.jpg', w: 600, h: 804, areas: ['skin', 'lid', 'cheek', 'lips'] },
  lipsc: { img: 'p_lipsc.jpg', w: 800, h: 597, areas: ['skin', 'lips'] },
  cheekc: { img: 'p_cheekc.jpg', w: 800, h: 597, areas: ['skin', 'cheek', 'lips'] },
  eyec: { img: 'p_eyec.jpg', w: 800, h: 597, areas: ['skin', 'lid'] },
};
export const SCENE_FOR_AREA = { lips: 'lipsc', cheeks: 'cheekc', eyes: 'eyec' };
export const maskFile = (scene, area) => `m_${scene}_${area}.png`;

// What each area of one photo should show. `current` = colour per area (skin, lips, cheeks, eyes), bare or
// with products on; `defaults` = the same for her own colouring (slider defaults, no products).
// Each photo's measured colour moves by current - defaults, so close-ups stay consistent with the full
// face and nothing changes until the user does something.
export const sceneTargets = (sampled, current, defaults) => {
  const shift = (key, area) => (sampled[key] ? shiftLike(sampled[key], defaults[area], current[area]) : null);
  return { skin: shift('skin', 'skin'), lips: shift('lips', 'lips'), cheek: shift('cheek', 'cheeks'), lid: shift('lid', 'eyes') };
};

const OPACITY = { skin: 0.85, lips: 0.95, cheek: 0.9, lid: 0.85 };

// Layer styles for every area of one photo.
export const sceneLayers = (sampled, current, defaults) => {
  const t = sceneTargets(sampled, current, defaults);
  const out = {};
  Object.keys(OPACITY).forEach((a) => { if (sampled[a]) out[a] = layerStyles(sampled[a], t[a], OPACITY[a]); });
  return out;
};
