// Scroll-reveal for the Home guide. Uses IntersectionObserver (more reliable than the mockup's
// scroll-position estimates, which is what hid the closing line in an early mockup).
// Usage: const ref = useScrollReveal(); <section ref={ref} className="reveal">…</section>
// CSS lives in tokens.css (.reveal / .reveal.is-visible) and respects prefers-reduced-motion.

import { useEffect, useRef } from 'react';

export function useScrollReveal({ threshold = 0.2, rootMargin = '0px 0px -10% 0px', once = true } = {}) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.classList.add('is-visible'); return; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { el.classList.add('is-visible'); if (once) io.disconnect(); }
      else if (!once) el.classList.remove('is-visible');
    }, { threshold, rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin, once]);
  return ref;
}
