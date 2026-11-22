// Soft gate at "Save your picks". Stage A: details are stored via /api/signup (no email is sent).
// Stage B (custom SMTP ready) will add a magic-link sign-in to the same account.
import { useState } from 'react';
import Sheet from './Sheet';
import PrivacyNote from './PrivacyNote';
import { usePrefs } from '../lib/prefs';
import { anonId } from '../lib/track';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function SignUpSheet({ open, onClose, leanWord }) {
  const { prefs, update } = usePrefs();
  const [form, setForm] = useState({ firstName: prefs.firstName || '', email: '', instagram: '', analysedBefore: null, consent: false, website: '' });
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim()) return setError('Add your first name so we know what to call you.');
    if (!EMAIL_RE.test(form.email.trim())) return setError('That email looks off. Mind checking it?');
    setError('');
    setStatus('sending');
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, lean: prefs.lean || null, look: prefs.look ?? null, anonId: anonId() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'failed');
      update({ firstName: form.firstName.trim(), signedUp: true });
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setError(err.message === 'invalid_email' ? 'That email looks off. Mind checking it?' : "We couldn't save that just now. Please try again in a moment.");
    }
  };

  return (
    <Sheet open={open} onClose={onClose} labelledBy="signup-title">
      {status === 'done' ? (
        <div className="cu-sheet__body">
          <h2 id="signup-title" className="cu-sheet__title">Saved, {form.firstName.trim()}</h2>
          <p className="cu-muted">Your {leanWord} lean and starter shades are kept for you. Next up: try them on in Studio.</p>
          <button type="button" className="btn-primary" onClick={onClose}>Done</button>
        </div>
      ) : (
        <form className="cu-sheet__body" onSubmit={submit} noValidate>
          <div>
            <h2 id="signup-title" className="cu-sheet__title">Save your picks</h2>
            <p className="cu-muted">Keep your {leanWord} lean and starter shades, so they're waiting for you next time.</p>
          </div>

          <div className="cu-fields">
            <label className="cu-field">
              <span>First name</span>
              <input type="text" value={form.firstName} onChange={set('firstName')} autoComplete="given-name" maxLength={50} required />
            </label>
            <label className="cu-field">
              <span>Email</span>
              <input type="email" value={form.email} onChange={set('email')} autoComplete="email" inputMode="email" placeholder="name@email.com" maxLength={254} required />
            </label>
            <label className="cu-field">
              <span>Instagram</span>
              <input type="text" value={form.instagram} onChange={set('instagram')} placeholder="Optional" autoCapitalize="none" autoCorrect="off" maxLength={31} />
            </label>
            {/* Honeypot for bots: hidden from people and screen readers. */}
            <label className="cu-hp" aria-hidden="true">Website<input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} /></label>
          </div>

          <div className="cu-fields">
            <div className="cu-field cu-field--row">
              <span id="analysed-label">Had a colour analysis? <span className="cu-optional">Optional</span></span>
              <div className="cu-segment" role="radiogroup" aria-labelledby="analysed-label">
                {[['Yes', true], ['No', false]].map(([label, val]) => (
                  <button key={label} type="button" role="radio" aria-checked={form.analysedBefore === val}
                    className={form.analysedBefore === val ? 'is-on' : ''}
                    onClick={() => set('analysedBefore')(form.analysedBefore === val ? null : val)}>{label}</button>
                ))}
              </div>
            </div>
            <div className="cu-field cu-field--row">
              <span id="consent-label">Send me colour tips and VEU updates</span>
              <button type="button" role="switch" aria-checked={form.consent} aria-labelledby="consent-label"
                className={`cu-switch${form.consent ? ' is-on' : ''}`} onClick={() => set('consent')(!form.consent)}>
                <span />
              </button>
            </div>
          </div>

          {error && <p className="cu-error" role="alert">{error}</p>}

          <button type="submit" className="btn-primary" disabled={status === 'sending'}>
            {status === 'sending' ? 'Saving…' : 'Save my picks'}
          </button>

          <p className="cu-fine">
            Emails only if you switch them on.{' '}
            <button type="button" className="cu-linkbtn" aria-expanded={showPrivacy} onClick={() => setShowPrivacy((v) => !v)}>
              How we use your details
            </button>
          </p>
          {showPrivacy && <PrivacyNote compact />}
        </form>
      )}
    </Sheet>
  );
}
