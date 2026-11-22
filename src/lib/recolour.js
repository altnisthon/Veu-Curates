// Recolours the featured character photo in the browser using CSS masks + blend modes.
// Each area (skin, lips, cheek, lid) is two stacked layers clipped by an alpha mask PNG:
//   1. a lightness layer (multiply to darken, screen to lighten) so depth changes look real
//   2. a colour layer (mix-blend-mode: color) that swaps hue and saturation but keeps the photo's texture
// The scene wrapper needs `isolation: isolate` so layers blend with the photo only.

import { deltaE2000, hexToLab, hexToRgb, shiftLike } from './colour';

const luma = (hex) => { const [r, g, b] = hexToRgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

// Below this ΔE the target is the photo's own colour, so the layers stay off and the photo is untouched
// (a flat colour layer would otherwise even out the photo's natural variation).
const SAME = 1;

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
    const s = Math.min(1, (lb * r - lb) / Math.max(0.02, 1 - lb));
    const g = Math.round(255 * s);
    lightness = { background: `rgb(${g},${g},${g})`, mixBlendMode: 'screen' };
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

// The user's skin and lips as they should appear in one scene. `defaults` are the slider defaults
// (the full-face photo's own tones); each scene's measured colour moves by the user's change from them.
export const sceneTargets = (sampled, user, defaults) => ({
  skin: shiftLike(sampled.skin, defaults.skin, user.skin),
  lips: sampled.lips ? shiftLike(sampled.lips, defaults.lips, user.lips) : null,
});

// Build every layer's style for one scene.
// bases = areaBases(userSkin, userLip) from colour.js; looks = perceived colour per area with products on.
// variant 'after' shows products; 'before' shows the user's bare colouring (for the before/after split).
export const sceneLayers = ({ sampled, bases, looks, variant }) => {
  const after = variant === 'after';
  return {
    skin: layerStyles(sampled.skin, bases.skin, 0.85, true),
    lips: layerStyles(sampled.lips, after ? looks.lips : bases.lips, 0.95, true),
    cheek: layerStyles(bases.cheeks, looks.cheeks, 0.9, after),
    lid: layerStyles(bases.eyes, looks.eyes, 0.85, after),
  };
};
