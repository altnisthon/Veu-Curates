// api/signup.js
// Stage A sign-up (no email is sent). Creates the person in Supabase Auth without a password or
// confirmation email, then saves their profile. In Stage B the same email signs in by magic link
// and lands on this same account, so nothing needs migrating.

const { configured, call, insertEvent, deviceFrom } = require('./_lib/supabase');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LEANS = ['warm', 'cool', 'neutral', 'not_sure'];

function clean(body) {
  const firstName = String(body.firstName || '').trim().slice(0, 50);
  const email = String(body.email || '').trim().toLowerCase();
  const ig = String(body.instagram || '').trim().replace(/^@+/, '');
  const anonId = typeof body.anonId === 'string' ? body.anonId.slice(0, 64) : null;
  if (!firstName) return { error: 'missing_name' };
  if (email.length > 254 || !EMAIL_RE.test(email)) return { error: 'invalid_email' };
  if (ig && !/^[A-Za-z0-9._]{1,30}$/.test(ig)) return { error: 'invalid_instagram' };
  return {
    firstName,
    email,
    ig: ig || null,
    analysedBefore: typeof body.analysedBefore === 'boolean' ? body.analysedBefore : null,
    consent: body.consent === true,
    lean: LEANS.includes(body.lean) ? body.lean : null,
    look: [0, 1, 2].includes(body.look) ? body.look : null,
    anonId,
  };
}

async function findOrCreateUser(email, firstName) {
  const found = await call('/rest/v1/rpc/user_id_by_email', { method: 'POST', body: { p_email: email } });
  if (found.ok && typeof found.data === 'string') return found.data;

  const created = await call('/auth/v1/admin/users', {
    method: 'POST',
    body: { email, email_confirm: false, user_metadata: { first_name: firstName } },
  });
  if (created.ok && created.data?.id) return created.data.id;

  // Lost a race with a parallel sign-up for the same email: look it up again.
  const retry = await call('/rest/v1/rpc/user_id_by_email', { method: 'POST', body: { p_email: email } });
  if (retry.ok && typeof retry.data === 'string') return retry.data;
  throw new Error(`create user failed: ${created.status}`);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const body = req.body || {};

  // Honeypot: bots fill hidden fields. Pretend it worked.
  if (body.website) return res.status(200).json({ ok: true });

  const input = clean(body);
  if (input.error) return res.status(400).json({ error: input.error });
  if (!configured()) return res.status(503).json({ error: 'not_configured' });

  try {
    const userId = await findOrCreateUser(input.email, input.firstName);
    const now = new Date().toISOString();
    const profile = {
      id: userId,
      email: input.email,
      first_name: input.firstName,
      ig_handle: input.ig,
      analysed_before: input.analysedBefore,
      marketing_consent: input.consent,
      consent_at: input.consent ? now : null,
      anon_id: input.anonId,
      updated_at: now,
    };
    if (input.lean) profile.undertone_lean = input.lean;
    if (input.look !== null) profile.look = input.look;

    const saved = await call('/rest/v1/profiles?on_conflict=id', { method: 'POST', body: profile, prefer: 'resolution=merge-duplicates,return=minimal' });
    if (!saved.ok) throw new Error(`profile save failed: ${saved.status} ${JSON.stringify(saved.data)}`);

    await insertEvent({
      user_id: userId,
      anon_id: input.anonId,
      type: 'signup',
      details: { consent: input.consent, analysed_before: input.analysedBefore, lean: input.lean },
      device: deviceFrom(req),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[signup]', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
};
