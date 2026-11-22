# VEU Curates: setup (Phase 1, all free)

The live site runs from the `main` branch. VEU Curates is built on a separate branch, so the chatbot at veu-recommends.vercel.app (and the Squarespace embed) stays exactly as it is until you decide to launch.

On a preview build:
- `/` is VEU Curates
- `/chat` is the existing chatbot, unchanged
- `/admin` is the existing admin panel, unchanged

## 1. Create the Supabase project (about 10 minutes)
1. Go to supabase.com, sign in, then **New project**. Pick the **Free** plan and the **Singapore** region (closest to your users). Save the database password somewhere safe.
2. When it's ready, open **SQL Editor**, then **New query**. Paste all of `supabase/schema.sql` and click **Run**. You should see "Success".
3. Open **Project Settings**, then **API**. Copy:
   - the **Project URL**
   - the **service_role** key (secret: never paste it into the app, chat or Git)

## 2. Add the keys to Vercel, for previews only
In Vercel, open the VEU Curates project, then **Settings**, then **Environment Variables**. Add each of these with **only "Preview" ticked** (not Production), so the live site is untouched:

| Name | Value |
|---|---|
| `SUPABASE_URL` | the Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | the service_role key |

Then redeploy the latest preview (Deployments, the newest preview, the "..." menu, **Redeploy**).

The browser never sees these keys. Everything goes through the app's own `/api` routes.

## 3. Let the founder open the preview
Vercel puts a login wall on preview links by default (Deployment Protection, "Vercel Authentication"). For the founder to open the link without a Vercel account: **Settings**, then **Deployment Protection**, then turn **Vercel Authentication** off.

Preview links are long and unguessable, but anyone who has the link can open it. Turn protection back on after testing if you like.

## 4. Check that sign-ups arrive
1. On the preview, choose an undertone, then on the result screen tap **Save your picks** and submit.
2. In Supabase, open **Table Editor**, then `profiles`. Your row should be there.
3. Open `events`. You should see `lean_picked`, `signup` and, if you tapped it, `booking_clicked`.

## 5. Keeping Supabase awake
Free Supabase projects pause after about a week without activity. `vercel.json` has a daily Vercel Cron job that pings `/api/keepalive`, but **Vercel only runs cron jobs on the live (production) deployment**, so it starts at launch.

Until launch: if the project pauses, open it in Supabase and click **Restore** (free, takes a minute).

Optional: set a `CRON_SECRET` environment variable (any long random string) so only Vercel can call the ping.

## Later
- **Stage B, magic-link sign-in:** connect a free email sender (Brevo or Resend) to Supabase under Auth, then SMTP, sending from a veu-alchemist.com address. This needs DNS records on the domain. Until then no emails are sent, and sign-ups are not email-verified. Don't send marketing emails to this list before Stage B adds a confirmation step.
- **Google Sheet copy of sign-ups:** not set up yet. Planned for later.
- **Privacy copy** (`src/curates/components/PrivacyNote.jsx`): to be reviewed by VEU, including how people should contact you about their data.

## Running it locally
```bash
npm install
```
Create `.env.local` (it's git-ignored) with `SUPABASE_URL=` and `SUPABASE_SERVICE_ROLE_KEY=`. Then:
```bash
npm run dev
```
The dev server also serves the `/api` routes.
