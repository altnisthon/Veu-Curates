import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ScreenHeader } from '../components/Chrome';
import SignUpSheet from '../components/SignUpSheet';
import { leanById, resultFor } from '../lib/leans';
import { usePrefs } from '../lib/prefs';
import { track } from '../lib/track';

export const BOOKING_URL = 'https://www.veu-alchemist.com/services-1';

export default function Result() {
  const { prefs } = usePrefs();
  const [sheet, setSheet] = useState(false);
  const lean = leanById(prefs.lean);
  if (!lean) return <Navigate to="/undertone" replace />;
  const r = resultFor(lean.id);
  const notSure = lean.id === 'not_sure';

  return (
    <div className="cu-screen">
      <ScreenHeader trail={[{ label: 'Home', to: '/' }, { label: 'Undertone', to: '/undertone' }, { label: 'Your lean', to: '/result' }]} />
      <div className="cu-pad cu-gap-l">
        <div className="cu-gap-s">
          <span className="cu-eyebrow">{notSure ? 'Not sure yet? No problem' : 'You think you lean'}</span>
          <div className="cu-lean-title">
            <h1>{notSure ? 'Neutral, for now' : lean.label}</h1>
            <span className="cu-tag">Your pick</span>
          </div>
        </div>

        <div className="cu-strip" aria-hidden="true">{r.strip.map((c) => <span key={c} style={{ background: c }} />)}</div>

        <p className="cu-lead">{notSure ? "We'll start you neutral, right in the middle. Studio will help you see which way you lean." : r.blurb}</p>

        <section aria-labelledby="start-with" className="cu-gap-s">
          <h2 id="start-with">Start with</h2>
          <ul className="cu-starters">
            {r.starters.map((s) => (
              <li key={s.name} className="cu-starter">
                {/* Neutral tile so the colour reads true. */}
                <span className="cu-starter__tile"><span className="cu-starter__swatch" style={{ background: s.hex }} /></span>
                <span className="cu-starter__text">
                  <span className="cu-starter__name">{s.name}</span>
                  <span className="cu-starter__line">{s.line}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="cu-gap-s">
          <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn-primary cu-btn"
            onClick={() => track('booking_clicked', { from: 'result', lean: lean.id })}>
            Book a consultation
          </a>
          <Link to="/studio" className="btn-tint cu-btn">Try {r.word} shades</Link>
          <p className="cu-fine cu-center">
            Your lean is a starting point. Your season is found in person at a VEU consultation. <Link to="/explore">Shop {r.word} shades</Link>
          </p>
        </div>

        <section className="glass cu-save">
          {prefs.signedUp ? (
            <p className="cu-muted"><strong>Saved for {prefs.firstName}.</strong> Your lean and starter shades are kept for next time.</p>
          ) : (
            <>
              <div>
                <h3>Keep these for later</h3>
                <p className="cu-muted">Save your lean and starter shades so they're here next time.</p>
              </div>
              <button type="button" className="cu-textbtn" onClick={() => setSheet(true)}>Save your picks</button>
            </>
          )}
        </section>
      </div>
      <SignUpSheet open={sheet} onClose={() => setSheet(false)} leanWord={r.word} />
    </div>
  );
}
