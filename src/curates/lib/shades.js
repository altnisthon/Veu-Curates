// Placeholder shades for Shade Studio until the real catalogue lands in Supabase (Phase 3).
// Products and shade names are real; the hex values are mockup placeholders, not swatch research,
// so the app labels them as placeholder colours. fin = default finish index (0 Sheer, 1 Satin, 2 Matte).

export const PLACEHOLDER = true;

export const SHADES = {
  lips: [
    { id: 'lips-1', brand: 'Romand', name: 'Juicy Lasting Tint', shade: '04 Coral Sunrise', hex: '#E5584A', fin: 0 },
    { id: 'lips-2', brand: 'Peripera', name: 'Water Bare Tint', shade: 'CR701 Coral Petal', hex: '#EE7B6B', fin: 0 },
    { id: 'lips-3', brand: 'MAC', name: 'Lustreglass Sheer-Shine Lipstick', shade: 'Dial Up Warmth', hex: '#E8906E', fin: 0 },
    { id: 'lips-4', brand: 'Dior', name: 'Addict Lip Glow Oil', shade: '004 Coral', hex: '#F07A62', fin: 0 },
    { id: 'lips-5', brand: 'Dior', name: 'Rouge Dior On Stage', shade: '028 Actrice', hex: '#D8432F', fin: 2 },
  ],
  cheeks: [
    { id: 'cheeks-1', brand: 'Rare Beauty', name: 'Soft Pinch Liquid Blush', shade: 'Joy', hex: '#F0684F', fin: 1 },
    { id: 'cheeks-2', brand: 'HERORANGE', name: 'Liquid Blush Stick', shade: '05 Coral Jelly', hex: '#F2836E', fin: 0 },
    { id: 'cheeks-3', brand: 'Patrick Ta', name: 'Double-Take Blush', shade: "She's Coral", hex: '#EB8A6A', fin: 2 },
    { id: 'cheeks-4', brand: 'Sephora Collection', name: 'Blush & Go', shade: 'Puff', hex: '#F29A8B', fin: 1 },
  ],
  eyes: [
    { id: 'eyes-1', brand: '3CE', name: 'Multi Eye Color Palette', shade: 'Soft Petal', hex: '#D9957A', fin: 1 },
    { id: 'eyes-2', brand: 'Judydoll', name: 'Six-Color Eyeshadow Palette', shade: '02 Champagne Gold', hex: '#D9AE72', fin: 0 },
    { id: 'eyes-3', brand: 'NARS', name: 'Total Seduction Eyeshadow Stick', shade: 'Warm Taupe', hex: '#A07E66', fin: 1 },
    { id: 'eyes-4', brand: 'Ace Beauté', name: 'Whimsical Bloom Palette', shade: 'Rusty Orange', hex: '#C2653C', fin: 2 },
  ],
};

// Shade name without a leading code ("04 Coral Sunrise" -> "Coral Sunrise"), for the small chip label.
export const shortName = (s) => s.shade.replace(/^[A-Z]*\d+\s+/, '');
