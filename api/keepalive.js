// api/keepalive.js
// Daily ping so the Supabase Free project doesn't pause after a quiet week.
// Run by Vercel Cron (see vercel.json). Vercel only runs cron jobs on the production deployment.

const { configured, call } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
  // If CRON_SECRET is set in Vercel, only Vercel Cron (which sends it) can trigger this.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.status(401).end();
  if (!configured()) return res.status(503).json({ ok: false, error: 'not_configured' });

  const r = await call('/rest/v1/products?select=id&limit=1');
  return res.status(r.ok ? 200 : 502).json({ ok: r.ok, at: new Date().toISOString() });
};
