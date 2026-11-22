# VEU Curates: build brief

Upgrade the existing VEU Recommends repo into VEU Curates, phase by phase. Start each phase by proposing a short plan and waiting for approval. End each phase with a working preview link.

## Before Phase 1: setup (all free)
1. Rename the app to VEU Curates (title, manifest, metadata, Vercel project name if desired). Keep the existing URL and embed working.
2. Create a Supabase project on the Free plan; run `supabase/schema.sql`; add `SUPABASE_URL`, `SUPABASE_ANON_KEY` (client) and `SUPABASE_SERVICE_ROLE_KEY` (server only) to Vercel.
3. Keep-alive: a daily scheduled ping to a cheap Supabase query so the free project doesn't pause (Vercel Cron or another free scheduler; confirm Hobby limits).
4. Email: Supabase's built-in sender only reaches the project's own team, 2 emails an hour. For real users, connect a free SMTP provider (for example Brevo or Resend free plans) sending from a veu-alchemist.com address. Needs DNS records on the domain. Until that's done, Phase 1 captures email without a magic link (see below).
5. Shared code is already in `src/lib/` and `src/styles/tokens.css`; character photos and masks are in `public/character/`.

## Phase 1: Foundation
- App shell: 5-tab glass tab bar, drifting orb background, "you are here" breadcrumb, page transitions
- **Home**: hero (placeholder until the Soul Cinema hero image is made; it will evolve on scroll later), quote "colour is science. wearing it well is art.", then "How to get started" steps that reveal on scroll (`useScrollReveal`): undertone, looks you like, skin and lip colour, explore products, colour science (Learn more → Learn), closing line, Get started → undertone question
- **Undertone question**: warm / cool / neutral / not sure (not sure starts neutral)
- **Sign-in sheet (soft gate)** at "save your picks": first name, email, Instagram (optional), analysed before (optional), marketing consent unticked by default, privacy link. Stage A (no SMTP yet): store the sign-up in Supabase via a serverless route and copy it to the existing Google Sheet via Apps Script. Stage B (SMTP ready): switch to Supabase magic link sign-in.
- **Lean result**: "You think you lean: Warm", three starter shades, Book a consultation (https://www.veu-alchemist.com/services-1) as the primary button
- **Event logging**: `signup`, `lean_picked`, `booking_clicked` into `events`
- Gate: sign-ups arriving in Supabase and the Sheet

## Phase 2: Shade Studio (core)
- Featured character photo with recolouring (`recolour.js`): full face + zoom to the eye, cheek and lip close-ups (scene cross-fade with scale)
- Skin and Lips sliders + hex inputs (defaults equal her photographed tones)
- Lips / Cheeks / Eyes tabs, shade chips, finish (sheer, satin, matte), look (natural, everyday, bold); no swipes control
- Draggable before/after split on the photo
- Fit score + reason + "The science" panel (`colour.js`, CIEDE2000)
- Like on the stage; dislike opens "why not this one?" (I don't like the colour / too bright for me / too warm or too cool) → Recommend me (3 alternatives)
- Events: `shade_viewed`, `shade_liked`, `shade_disliked`, `recommend_me_used`, `slider_adjusted`
- Gate: previews checked against 20 real swatches; tune `ALPHA` and `LOOK_TARGETS`

## Phase 3: Catalogue and data
- Import the 214 products from `VEU_Alchemist_PCCS_Master_v2.xlsx` into products/shades (rename the "Winter Deep" tab to "Winter Dark" first)
- Swatch research tool in admin (upgrade of the Colour Swatch Library): sample hex from creator swatch frames, tag source and skin depth, combine into true payoff with a confidence level
- Explore (search, filters, best for you), Product detail (pan vs real swatch vs on you, confidence, sources, buy link), suggest a brand
- Live admin dashboard: likes/dislikes with top reasons, clicks, searches, no-result searches, brand requests, audience undertone mix, email list export
- Gate: top 50 shades at medium confidence or higher

## Phase 4: Client skin hex
- Admin form: Ms Eunice enters the client's measured skin hex after the consultation; client gets a link to add it to their account
- Studio starts from the measured skin hex ("measured by VEU"), still adjustable
- Gate: process agreed with Ms Eunice

## Phase 5: Learn and polish
- Learn: colour science lessons (What is colour science?, hue/value/chroma, undertone vs overtone, simultaneous contrast, colour harmony, hex to LCh, ΔE, where seasonal analysis comes from) with progress tracking and "Mark complete"; VEU Neus carousel. Lesson copy needs a fact check by VEU before launch
- PWA install, accessibility pass, copy pass in VEU voice, launch

## Notes for tuning
- `colour.js` now uses CIEDE2000, which gives smaller numbers than the mockup's simple ΔE. `LOOK_TARGETS` were scaled down to match; tune them against real swatches.
- Scoring now follows the user's undertone lean (not a season). Lean hue windows in `LEANS` are first guesses.
- Product hexes in the mockup are placeholders until swatch research fills `payoff_hex`.
