// Fire-and-forget analytics. Events go through /api/event so the database key stays on the server.
// Never blocks or breaks the UI.

const ANON_KEY = 'veu-curates:anon';

export function anonId() {
  try {
    let id = window.localStorage.getItem(ANON_KEY);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function track(type, details = {}) {
  try {
    const body = JSON.stringify({ type, details, anonId: anonId() });
    // keepalive lets the request finish when the user is leaving the page (e.g. Book a consultation).
    fetch('/api/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch { /* ignore */ }
}
