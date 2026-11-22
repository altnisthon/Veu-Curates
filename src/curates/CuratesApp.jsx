import { useEffect, useRef } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import '../styles/tokens.css';
import './curates.css';
import { Orbs, TabBar } from './components/Chrome';
import { PrefsContext, usePrefsState } from './lib/prefs';
import Home from './screens/Home';
import Undertone from './screens/Undertone';
import Result from './screens/Result';
import Studio from './screens/Studio';
import { ComingSoon, Me, Privacy } from './screens/Simple';

const NO_TABBAR = ['/undertone'];

function Shell() {
  const { pathname } = useLocation();
  const scroller = useRef(null);

  useEffect(() => { scroller.current?.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="cu-app">
      <Orbs />
      <main ref={scroller} className={`cu-scroll${NO_TABBAR.includes(pathname) ? ' cu-scroll--full' : ''}`}>
        {/* key on path so each screen gets the entrance transition */}
        <div key={pathname} className="cu-page">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/undertone" element={<Undertone />} />
            <Route path="/result" element={<Result />} />
            <Route path="/learn" element={<ComingSoon tab="learn" />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/explore" element={<ComingSoon tab="explore" />} />
            <Route path="/me" element={<Me />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
      {!NO_TABBAR.includes(pathname) && <TabBar pathname={pathname} />}
    </div>
  );
}

export default function CuratesApp() {
  const prefs = usePrefsState();
  useEffect(() => { document.title = 'VEU Curates'; }, []);
  return (
    <PrefsContext.Provider value={prefs}>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </PrefsContext.Provider>
  );
}
