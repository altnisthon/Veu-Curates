// iOS-style bottom sheet: backdrop, grabber, Escape / backdrop tap to close, focus moved in and restored.
// Options: `className` adds a variant (e.g. a tall list sheet), `showClose={false}` hides the corner close button
// when the content has its own (e.g. Done), `focusSelector` picks what gets focus on open (so a search field
// doesn't pop the keyboard up straight away).
import { useEffect, useRef } from 'react';

const FOCUSABLE = 'input, button, [href], select, textarea';

export default function Sheet({ open, onClose, labelledBy, children, className = '', showClose = true, focusSelector = FOCUSABLE }) {
  const panel = useRef(null);
  const returnTo = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    returnTo.current = document.activeElement;
    const first = panel.current?.querySelector(focusSelector) || panel.current?.querySelector(FOCUSABLE);
    first?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panel.current) {
        const items = [...panel.current.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled && el.offsetParent !== null);
        if (!items.length) return;
        const [a, z] = [items[0], items[items.length - 1]];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      returnTo.current?.focus?.();
    };
  }, [open, onClose, focusSelector]);

  if (!open) return null;
  return (
    <div className="cu-sheet-layer">
      <div className="cu-sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div ref={panel} className={`cu-sheet ${className}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <span className="cu-sheet__grabber" aria-hidden="true" />
        {showClose && (
          <button type="button" className="cu-sheet__close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12" /></svg>
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
