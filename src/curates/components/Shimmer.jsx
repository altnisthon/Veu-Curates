// Studio backdrop: minimal holographic page in VEU colours (cream, blush, rose, sand, a touch of olive).
// Three soft layers: drifting brand light, iridescent foil bands, and a pearly sheen moving the other way.
// Decorative only; motion stops under reduced motion.
export default function Shimmer() {
  return (
    <div className="cu-shimmer" aria-hidden="true">
      <div className="cu-shimmer__holo" />
      <div className="cu-shimmer__foil" />
      <div className="cu-shimmer__sheen" />
    </div>
  );
}
