// api/event.js
// Analytics events from the browser. Only known event types, small payloads.
// Events are anonymous (anon_id); sign-ups link an anon_id to a profile.

const { configured, insertEvent, deviceFrom } = require('./_lib/supabase');

const TYPES = new Set([
  'lean_picked', 'booking_clicked',
  // later phases
  'shade_viewed', 'shade_liked', 'shade_disliked', 'recommend_me_used', 'slider_adjusted',
  'product_clicked', 'search', 'search_no_results', 'brand_suggested', 'lesson_completed',
]);
const MAX_DETAILS = 2000; // bytes of JSON

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { type, details, anonId } = req.body || {};
  if (!TYPES.has(type)) return res.status(400).json({ error: 'unknown_type' });

  let safeDetails = details && typeof details === 'object' && !Array.isArray(details) ? details : null;
  if (safeDetails && JSON.stringify(safeDetails).length > MAX_DETAILS) safeDetails = { truncated: true };

  if (!configured()) return res.status(204).end(); // analytics must never break the app

  const r = await insertEvent({
    anon_id: typeof anonId === 'string' ? anonId.slice(0, 64) : null,
    type,
    shade_id: Number.isInteger(safeDetails?.shade_id) ? safeDetails.shade_id : null,
    product_id: Number.isInteger(safeDetails?.product_id) ? safeDetails.product_id : null,
    details: safeDetails,
    device: deviceFrom(req),
  }).catch((e) => ({ ok: false, status: 0, data: e.message }));
  if (!r.ok) console.error('[event]', r.status, r.data);
  return res.status(204).end();
};
