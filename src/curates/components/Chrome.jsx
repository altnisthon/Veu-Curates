// App chrome: background orbs, "you are here" breadcrumb, screen header, floating glass tab bar.
import { Link, NavLink } from 'react-router-dom';
import { usePrefs } from '../lib/prefs';

export function Orbs() {
  return (
    <div className="cu-orbs" aria-hidden="true">
      <div className="orb orb--blush" />
      <div className="orb orb--rose" />
      <div className="orb orb--olive" />
      <div className="cu-orb-sand" />
    </div>
  );
}

const Pin = () => (
  <svg width="12" height="14" viewBox="0 0 12 14" fill="none" stroke="#932D28" strokeWidth="1.6" aria-hidden="true">
    <path d="M6 13s4.5-4.2 4.5-7.5a4.5 4.5 0 0 0-9 0C1.5 8.8 6 13 6 13z" />
    <circle cx="6" cy="5.5" r="1.6" />
  </svg>
);

// trail: [{ label, to }]; the last item is the current page.
export function Breadcrumb({ trail, onDark = false }) {
  return (
    <nav aria-label="You are here" className={`cu-crumb${onDark ? ' cu-crumb--dark' : ''}`}>
      <Pin />
      <span className="sr-only">You are here:</span>
      {trail.map((item, i) => {
        const last = i === trail.length - 1;
        return (
          <span key={item.label} className="cu-crumb__item">
            {last ? <span aria-current="page" className="cu-crumb__current">{item.label}</span> : <Link to={item.to}>{item.label}</Link>}
            {!last && <span aria-hidden="true" className="cu-crumb__sep">›</span>}
          </span>
        );
      })}
    </nav>
  );
}

export function MeButton() {
  const { prefs } = usePrefs();
  const initial = prefs.firstName ? prefs.firstName.trim()[0].toUpperCase() : null;
  return (
    <Link to="/me" className="cu-me" aria-label="Me">
      {initial || (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5" />
        </svg>
      )}
    </Link>
  );
}

export function ScreenHeader({ trail, left = null }) {
  return (
    <header className="cu-header">
      {left}
      <div className="cu-header__row">
        <div className="cu-header__titles">
          <span className="cu-brand">VEU Curates</span>
          <Breadcrumb trail={trail} />
        </div>
        <MeButton />
      </div>
    </header>
  );
}

const TABS = [
  { to: '/', label: 'Home', end: true, match: ['/', '/undertone', '/result'], d: <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" /> },
  { to: '/learn', label: 'Learn', d: <><path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z" /><path d="M12 6v13.5" /></> },
  { to: '/studio', label: 'Studio', d: <path d="M12 3.5c3 4 6 7.2 6 10.5a6 6 0 0 1-12 0c0-3.3 3-6.5 6-10.5z" /> },
  { to: '/explore', label: 'Explore', d: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></> },
  { to: '/me', label: 'Me', match: ['/me', '/privacy'], d: <><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5" /></> },
];

export function TabBar({ pathname }) {
  return (
    <nav aria-label="Tabs" className="cu-tabbar">
      {TABS.map((t) => {
        const active = t.match ? t.match.includes(pathname) : pathname.startsWith(t.to);
        return (
          <NavLink key={t.to} to={t.to} end={t.end} className={`cu-tab${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{t.d}</svg>
            <span>{t.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
