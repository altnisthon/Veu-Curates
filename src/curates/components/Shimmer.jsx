// Studio backdrop: a pearly, iridescent page with a slow holographic sheen, a light sweep,
// twinkling glints and a faint grid. Decorative only; every animation stops under reduced motion.

// Fixed positions (a small seeded scatter) so the glints don't jump between renders.
const GLINTS = Array.from({ length: 34 }, (_, i) => {
  const r = (n) => { const x = Math.sin(i * 9301 + n * 49297) * 233280; return x - Math.floor(x); };
  return { left: `${(r(1) * 96 + 2).toFixed(1)}%`, top: `${(r(2) * 94 + 3).toFixed(1)}%`, size: 8 + Math.round(r(3) * 14), delay: `${(r(4) * 6).toFixed(2)}s`, dur: `${(3 + r(5) * 3).toFixed(2)}s` };
});

export default function Shimmer() {
  return (
    <div className="cu-shimmer" aria-hidden="true">
      <div className="cu-shimmer__iris" />
      <div className="cu-shimmer__iris cu-shimmer__iris--two" />
      <div className="cu-shimmer__dust" />
      <div className="cu-shimmer__dust cu-shimmer__dust--two" />
      <div className="cu-shimmer__grid" />
      <div className="cu-shimmer__sweep" />
      {GLINTS.map((g, i) => (
        <span key={i} className="cu-glint" style={{ left: g.left, top: g.top, width: g.size, height: g.size, animationDelay: g.delay, animationDuration: g.dur }} />
      ))}
    </div>
  );
}
