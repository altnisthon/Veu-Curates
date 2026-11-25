// Undertone leans as shown in the app. "Not sure" starts neutral.
// Starter shades are illustrative colour directions (no brand), shown on neutral tiles.

export const LEAN_OPTIONS = [
  { id: 'warm', label: 'Warm', sub: 'Golden, peachy, coral', c1: '#F2A65A', c2: '#F26B4E' },
  { id: 'cool', label: 'Cool', sub: 'Pink, rosy, berry', c1: '#E58FB0', c2: '#B03A6A' },
  { id: 'neutral', label: 'Neutral', sub: 'A bit of both', c1: '#E9A08E', c2: '#C9736E' },
  { id: 'not_sure', label: 'Not sure', sub: "We'll start you neutral", c1: '#D9D3CF', c2: '#B9B1AC' },
];

export const leanById = (id) => LEAN_OPTIONS.find((o) => o.id === id) || null;

// The lean used for scoring: "not sure" behaves as neutral.
export const scoringLean = (id) => (id === 'not_sure' ? 'neutral' : id);

export const LEAN_RESULT = {
  warm: {
    word: 'warm',
    blurb: 'Warm undertones tend to glow in golden, peachy and coral shades. Studio will start you there.',
    strip: ['#F6C08A', '#F2A65A', '#F08A5D', '#F26B4E', '#D9553C', '#B8862E'],
    starters: [
      { name: 'Coral lips', hex: '#E0614A', line: 'A warm orange-red that brightens the face.' },
      { name: 'Peach blush', hex: '#F0A07E', line: 'Soft and sunny, like a natural flush.' },
      { name: 'Golden shimmer', hex: '#C99A4E', line: 'A gold sheen that picks up warm light.' },
    ],
  },
  cool: {
    word: 'cool',
    blurb: 'Cool undertones tend to come alive in pink, rosy and berry shades. Studio will start you there.',
    strip: ['#F2B8CC', '#E58FB0', '#D46A92', '#B03A6A', '#8E2F5A', '#9C8AB0'],
    starters: [
      { name: 'Berry lips', hex: '#9E3459', line: 'A blue-leaning red that looks crisp and fresh.' },
      { name: 'Rosy blush', hex: '#E38BA3', line: 'A clear pink that reads as a healthy glow.' },
      { name: 'Mauve shimmer', hex: '#A1849A', line: 'A soft grey-violet sheen for the lids.' },
    ],
  },
  neutral: {
    word: 'neutral',
    blurb: 'Neutral undertones sit between warm and cool, so soft rosy-peach shades are an easy place to start.',
    strip: ['#F1C2B3', '#E9A08E', '#D98577', '#C9736E', '#B05E5E', '#C8AE8E'],
    starters: [
      { name: 'Rose lips', hex: '#BE5F66', line: 'A balanced rose, not too pink, not too orange.' },
      { name: 'Rosy peach blush', hex: '#E7A08F', line: 'Half peach, half pink, easy on most skin.' },
      { name: 'Champagne shimmer', hex: '#D2B999', line: 'A soft beige sheen that suits most lids.' },
    ],
  },
};

export const resultFor = (leanId) => LEAN_RESULT[scoringLean(leanId)] || LEAN_RESULT.neutral;
