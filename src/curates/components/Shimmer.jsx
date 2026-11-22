// Studio backdrop: minimal holographic page in VEU colours (cream, blush, rose, sand, a touch of olive).
// Two soft layers: drifting brand-colour light, and a pearly sheen that slowly shifts across.
// Decorative only; motion stops under reduced motion.
export default function Shimmer() {
  return (
    <div className="cu-shimmer" aria-hidden="true">
      <div className="cu-shimmer__holo" />
      <div className="cu-shimmer__sheen" />
    </div>
  );
}
