// iOS-style bottom sheet: backdrop, grabber, Escape / backdrop tap to close, focus moved in and restored.
import { useEffect, useRef } from 'react';

export default function Sheet({ open, onClose, labelledBy, children }) {
  const panel = useRef(null);
  const returnTo = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    returnTo.current = document.activeElement;
    const first = panel.current?.querySelector('input, button, [href], select, textarea');
    first?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panel.current) {
        const items = [...panel.current.querySelectorAll('input, button, [href], select, textarea')].filter((el) => !el.disabled && el.offsetParent !== null);
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
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="cu-sheet-layer">
      <div className="cu-sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div ref={panel} className="cu-sheet" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <span className="cu-sheet__grabber" aria-hidden="true" />
        <button type="button" className="cu-sheet__close" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12" /></svg>
        </button>
        {children}
      </div>
    </div>
  );
}
