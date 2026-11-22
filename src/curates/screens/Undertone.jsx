import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ScreenHeader } from '../components/Chrome';
import { LEAN_OPTIONS } from '../lib/leans';
import { usePrefs } from '../lib/prefs';
import { track } from '../lib/track';

export default function Undertone() {
  const { prefs, update } = usePrefs();
  const [pick, setPick] = useState(prefs.lean || null);
  const navigate = useNavigate();

  const onContinue = () => {
    if (!pick) return;
    update({ lean: pick });
    track('lean_picked', { lean: pick, source: 'undertone' });
    navigate('/result');
  };

  return (
    <div className="cu-screen">
      <ScreenHeader
        left={<Link to="/" className="cu-cancel">Cancel</Link>}
        trail={[{ label: 'Home', to: '/' }, { label: 'Undertone', to: '/undertone' }]}
      />
      <div className="cu-pad cu-gap-l">
        <div className="cu-gap-s">
          <h1>Do you lean warm, cool or neutral?</h1>
          <p className="cu-muted cu-lead">Go with your gut. It sets where Studio starts, and you can change it any time.</p>
        </div>

        <div className="cu-options" role="radiogroup" aria-label="Undertone lean">
          {LEAN_OPTIONS.map((o) => {
            const on = pick === o.id;
            return (
              <button key={o.id} type="button" role="radio" aria-checked={on} className={`glass cu-option${on ? ' is-on' : ''}`} onClick={() => setPick(o.id)}>
                <span className="cu-option__dots" aria-hidden="true">
                  <span style={{ background: o.c1 }} /><span style={{ background: o.c2 }} />
                </span>
                <span className="cu-option__text">
                  <span className="cu-option__label">{o.label}</span>
                  <span className="cu-option__sub">{o.sub}</span>
                </span>
                <span className="cu-option__check" aria-hidden="true">
                  {on && <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 7.2 2.6 2.6L11 4.4" /></svg>}
                </span>
              </button>
            );
          })}
        </div>

        <p className="cu-fine">Your actual season is found in person at a VEU consultation.</p>

        <button type="button" className="btn-primary" disabled={!pick} onClick={onContinue}>Continue</button>
      </div>
    </div>
  );
}
