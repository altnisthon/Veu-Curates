// Tone wheel: every point is a skin (or lip) colour. Left to right: cool to warm. Top to bottom: light to deep.
// Drag the knob (or use the arrow keys) to set undertone and depth together.
import { useEffect, useRef } from 'react';
import { clampToDisc, describe, wheelToHex } from '../lib/tone';

const SIZE = 232; // CSS px
const STEP = 0.05;

export default function ToneWheel({ part, label, pos, onChange, onRelease }) {
  const canvas = useRef(null);
  const disc = useRef(null);
  const dragging = useRef(false);

  // Paint the wheel once per part: one colour per pixel, from the same maths the face uses.
  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const n = Math.round(SIZE * dpr);
    cv.width = n; cv.height = n;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(n, n);
    const cache = new Map();
    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i < n; i += 1) {
        const x = (i / (n - 1)) * 2 - 1, y = (j / (n - 1)) * 2 - 1;
        const r = Math.hypot(x, y);
        if (r > 1) continue;
        // quantise to keep it quick; the steps are far below what the eye can see
        const key = `${Math.round(x * 60)},${Math.round(y * 60)}`;
        let hex = cache.get(key);
        if (!hex) { hex = wheelToHex(part, { x: Math.round(x * 60) / 60, y: Math.round(y * 60) / 60 }); cache.set(key, hex); }
        const k = (j * n + i) * 4;
        img.data[k] = parseInt(hex.slice(1, 3), 16);
        img.data[k + 1] = parseInt(hex.slice(3, 5), 16);
        img.data[k + 2] = parseInt(hex.slice(5, 7), 16);
        img.data[k + 3] = r > 0.985 ? Math.round(255 * (1 - r) / 0.015) : 255; // soft edge
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [part]);

  const fromEvent = (e) => {
    const rect = disc.current.getBoundingClientRect();
    return clampToDisc({ x: ((e.clientX - rect.left) / rect.width) * 2 - 1, y: ((e.clientY - rect.top) / rect.height) * 2 - 1 });
  };
  const onPointerDown = (e) => {
    dragging.current = true;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* fine without capture */ }
    onChange(fromEvent(e));
  };
  const onPointerMove = (e) => { if (dragging.current) onChange(fromEvent(e)); };
  const onPointerUp = () => { if (dragging.current) { dragging.current = false; onRelease?.(); } };
  const onKeyDown = (e) => {
    const d = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] }[e.key];
    if (!d) return;
    e.preventDefault();
    onChange(clampToDisc({ x: pos.x + d[0], y: pos.y + d[1] }));
    onRelease?.();
  };

  const words = describe(pos);
  const hex = wheelToHex(part, pos);
  return (
    <div className="cu-wheel">
      <span className="cu-wheel__axis cu-wheel__axis--top" aria-hidden="true">Light</span>
      <div className="cu-wheel__row">
        <span className="cu-wheel__axis" aria-hidden="true">Cool</span>
        <div ref={disc} className="cu-wheel__disc" style={{ width: SIZE, height: SIZE }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvas} className="cu-wheel__canvas" style={{ width: SIZE, height: SIZE }} aria-hidden="true" />
          <span className="cu-wheel__cross" aria-hidden="true" />
          <span role="slider" tabIndex={0} className="cu-wheel__knob"
            aria-label={`${label} tone. Left and right arrows: cooler or warmer. Up and down arrows: lighter or deeper.`}
            aria-valuetext={`${words.undertone}, ${words.depth.toLowerCase()}, ${hex}`}
            style={{ left: `${((pos.x + 1) / 2) * 100}%`, top: `${((pos.y + 1) / 2) * 100}%`, background: hex }}
            onKeyDown={onKeyDown} />
        </div>
        <span className="cu-wheel__axis" aria-hidden="true">Warm</span>
      </div>
      <span className="cu-wheel__axis cu-wheel__axis--bottom" aria-hidden="true">Deep</span>
    </div>
  );
}
