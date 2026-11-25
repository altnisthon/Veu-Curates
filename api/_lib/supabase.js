// Minimal server-side Supabase client over plain fetch (no SDK needed).
// Uses the service role key, so it must only ever run in Vercel serverless routes.
// Files under api/_lib are not exposed as routes.

const url = () => (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const configured = () => Boolean(url() && key());

async function call(path, { method = 'GET', body, prefer } = {}) {
  const headers = { apikey: key(), Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${url()}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

const insertEvent = (row) => call('/rest/v1/events', { method: 'POST', body: row, prefer: 'return=minimal' });

const deviceFrom = (req) => (/Mobi|Android|iPhone|iPad/i.test(req.headers['user-agent'] || '') ? 'mobile' : 'desktop');

module.exports = { configured, call, insertEvent, deviceFrom };
