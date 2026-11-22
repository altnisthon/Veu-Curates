// Placeholder tabs (built in later phases), the Me tab and the privacy page.
import { Link } from 'react-router-dom';
import { ScreenHeader } from '../components/Chrome';
import PrivacyNote from '../components/PrivacyNote';
import { leanById } from '../lib/leans';
import { usePrefs } from '../lib/prefs';

const COPY = {
  learn: { label: 'Learn', title: 'Colour science, made simple', text: 'Short lessons on hue, value, chroma and why some shades light you up. Coming soon.' },
  studio: { label: 'Studio', title: 'Try shades on, before you buy', text: "See lips, cheeks and eyes on a real face, matched to your skin and lips. We're putting the finishing touches on it." },
  explore: { label: 'Explore', title: 'Shades shown as they really look', text: 'Products sorted by how they actually swatch, not how they look in the pan. Coming soon.' },
};

export function ComingSoon({ tab }) {
  const c = COPY[tab];
  return (
    <div className="cu-screen">
      <ScreenHeader trail={[{ label: c.label, to: `/${tab}` }]} />
      <div className="cu-pad cu-gap-l">
        <h1>{c.title}</h1>
        <section className="glass cu-card cu-gap-s">
          <span className="cu-tag">Coming soon</span>
          <p className="cu-muted">{c.text}</p>
        </section>
        <Link to="/undertone" className="btn-tint cu-btn">Pick your undertone first</Link>
      </div>
    </div>
  );
}

export function Me() {
  const { prefs } = usePrefs();
  const lean = leanById(prefs.lean);
  return (
    <div className="cu-screen">
      <ScreenHeader trail={[{ label: 'Me', to: '/me' }]} />
      <div className="cu-pad cu-gap-l">
        <h1>{prefs.firstName ? `Hi, ${prefs.firstName}` : 'Me'}</h1>
        <section className="glass cu-card cu-row">
          <div>
            <span className="cu-eyebrow">Your lean</span>
            <p className="cu-strong">{lean ? lean.label : 'Not picked yet'}</p>
          </div>
          <Link to="/undertone" className="cu-link">{lean ? 'Change' : 'Pick'}</Link>
        </section>
        {lean && <Link to="/result" className="btn-tint cu-btn">See your starter shades</Link>}
        <Link to="/privacy" className="cu-link">How we use your details</Link>
      </div>
    </div>
  );
}

export function Privacy() {
  return (
    <div className="cu-screen">
      <ScreenHeader trail={[{ label: 'Me', to: '/me' }, { label: 'Privacy', to: '/privacy' }]} />
      <div className="cu-pad cu-gap-l">
        <h1>How we use your details</h1>
        <section className="glass cu-card"><PrivacyNote /></section>
      </div>
    </div>
  );
}
