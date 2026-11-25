// On-device preferences (lean, look, who signed up on this device).
// Storage can be unavailable (private mode, blocked site data), so every access is guarded
// and the app works without it.

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const KEY = 'veu-curates:prefs';

const read = () => {
  try { return JSON.parse(window.localStorage.getItem(KEY)) || {}; } catch { return {}; }
};
const write = (value) => {
  try { window.localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* storage unavailable */ }
};

export const PrefsContext = createContext(null);

export function usePrefsState() {
  const [prefs, setPrefs] = useState(read);
  const update = useCallback((patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      write(next);
      return next;
    });
  }, []);
  return useMemo(() => ({ prefs, update }), [prefs, update]);
}

export const usePrefs = () => useContext(PrefsContext);
