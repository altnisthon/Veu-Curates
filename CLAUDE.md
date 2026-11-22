# VEU Curates

Mobile-first colour science app for VEU Alchemist (Singapore colour analysis and beauty brand). It shows people the shade they would actually see on their own lips, cheeks and eyelids, explains why with colour science, and learns what they like. It upgrades the existing app in this repo (formerly "VEU Recommends", the chatbot at veu-recommends.vercel.app, embedded at veu-alchemist.com/veu-curates). The product is now called **VEU Curates** everywhere.

## Source of truth
- Spec doc: https://claude.ai/artifact/8znSLZoQY8YjM2vky3vzz8
- Clickable mockup (8 screens): https://claude.ai/artifact/2UGZqn6YL2mfPtEJrvZhso
- Mockup source for reference: `design/mockup-reference/*.dc.html` (a custom canvas format, not React; port the layout, copy and logic, don't copy the markup)
- Build plan: `BUILD_BRIEF.md`

## Non-negotiables
- The app companions the VEU consultation; it never replaces it. **No season quiz and no selfie-based analysis.** Users pick an undertone lean (warm / cool / neutral / not sure). Their season is found in person.
- The only consultation data in the app is the **skin hex Ms Eunice measures in person**. The printed booklet stays the full result; don't rebuild it in the app.
- Product colours come from real swatches (true payoff), not pan or bottle photos.
- Every number shown gets a plain-English line next to it.
- Free tiers only (Vercel Hobby, Supabase Free, free email provider). Flag anything that would cost money before adding it.

## Stack
- React + Vite, delivered as a PWA; still embeddable on Squarespace
- Vercel (Hobby) for hosting and serverless API routes
- Supabase Free: Postgres + Auth (magic link) + analytics events. Schema in `supabase/schema.sql`
- Upstash Redis: existing catalogue cache; keep working during migration, retire once products live in Supabase
- Anthropic API for any AI features (current model in the existing code)
- Colour maths runs on the device: `src/lib/colour.js`; photo recolouring: `src/lib/recolour.js`

## Design system (soft futurism on iOS structure)
- Tokens in `src/styles/tokens.css`. Cream page, drifting blurred orbs (blush, rose, olive), frosted glass cards, floating glass tab bar, pill buttons
- Colours: crimson #932D28 (accent), #D75C61, #F1BAB3; greens #154327 / #81A357; cream #FDF8F5, sand #E8E3D8
- Type: Cormorant Garamond for headlines, Montserrat for body
- iOS principles: one primary action per screen, bottom sheets for quick tasks, 44px touch targets, 5-tab bar (Home, Learn, Studio, Explore, Me), a "you are here" breadcrumb on every screen
- Respect prefers-reduced-motion everywhere
- Copy: VEU voice, short, big-sister, second person, no em dashes, proper English (not Singlish)
- Product swatches always sit on neutral backgrounds so they read true

## The featured character (Shade Studio)
- Southeast Asian woman, sleek centre-parted slicked-back brownish-black bun, generated in Higgsfield
- Full-res originals (portrait + eye, cheek and lip close-ups) are kept outside the repo in the handoff zip to keep the repo light
- `public/character/`: resized photos used in the app; `public/character/masks/`: alpha masks per area per photo; `public/character/sampled-colours.json`: measured base colours per photo
- Slider defaults equal her photographed tones (skin ramp index 2, lip ramp index 2), so nothing shifts until the user slides
- Don't regenerate or alter her; ask first

## Known gotchas from the existing app
- Upstash can return double-encoded JSON: if a response value is a string, JSON.parse it again
- Squarespace serves www.veu-alchemist.com via a 301, so CSP `frame-ancestors` must allow both the bare and www domains
- Browser calls to the Google Sheets API fail on CORS: write through a Vercel serverless route (or the existing Apps Script web app)
- Use a separate Upstash database per project
- Frontend-only changes never touch stored data

## Free-plan constraints (Supabase)
- 500 MB database per project, 50,000 monthly active users, 2 active projects
- Free projects pause after about a week of low activity: add a daily keep-alive ping
- The built-in auth email only sends to the project's team and only 2 emails an hour: magic links for real users need custom SMTP from a free email provider
- No automatic backups on Free: export important tables (email list, events roll-ups) on a schedule

## Ways of working
- Nisa prefers to see the plan before building and confirms architecture decisions upfront
- Build feature by feature; show a working preview after each step
- Keep the existing admin panel at /admin (password protected) working throughout
