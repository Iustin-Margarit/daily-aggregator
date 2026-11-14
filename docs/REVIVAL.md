# Revival log

The record of the November 2026 rebuild: what was wrong, what was done and what is left. Details of
every change are in [CHANGELOG.md](../CHANGELOG.md); how to run and deploy is in the
[README](../README.md). Keep this file up to date at the end of each work session.

## Where it started

A 2025 student project ("Personalized News Aggregator"), written mostly by Gemini 2.5 through a set
of AI rule books. In November 2026 it could not even be set up:

- the production build failed and a fresh clone did not build (a Python `.gitignore` rule hid `lib/`);
- the ~70 migrations failed on a new database;
- ingestion lived in a Supabase Edge Function that was unreachable through the middleware;
- articles had no summaries or images, pagination duplicated and skipped stories;
- **any user could make themselves admin**, and several database functions trusted a user id sent
  from the browser.

## What was done, in order

| Date | Version | Round |
|---|---|---|
| 2026-11-12 | 2.0.0 | **Revival.** Next 14 → 15.5, React 19. Migrations squashed into three baseline files. Ingestion moved into the app (`lib/ingestion`, `npm run ingest`, `/api/cron/ingest`, admin button, auto-refresh). Every page rewritten. Security holes above closed. Unit tests and ESLint 9. |
| 2026-11-12 | 2.1.0 | **Speed + newspaper design.** The slowness came from 12000-pixel publisher images (now resized through the publishers' CDNs) and from dev mode (now Turbopack). Whole UI restyled as "The Daily Aggregator". Photos in colour. Feed split into pages of 30. |
| 2026-11-13 | 2.1.0 | **Saved stories simplified** for readers of all ages: tags, folder colours, bulk actions and the "space left" quota removed. Menus made non-modal (a dialog opened from a menu used to freeze the page). Wording: no "subscribe/subscriber". |
| 2026-11-13 | 2.2.0 | **Security hardening.** Column-level privileges on top of RLS, SSRF-safe fetching of feeds and images, Content Security Policy with nonces, HSTS, open-redirect fixes, reserved usernames, rate limits on letters and folders, password required to delete an account, no account enumeration at sign-up, `npm audit` clean for production, Dependabot. |
| 2026-11-13 | - | **Cloud database rebuilt.** The hosted project (still on the 2025 schema) was backed up, reset with `supabase db reset --linked` and loaded with the new migrations plus 827 fresh articles. The old 2025 dumps are in `C:\Practica\AgregatorStiri-cloud-backup-2025` (outside the repo). |
| 2026-11-13 | 2.2.1 | **Security, round two** (first migration after the baseline). Account deletion only through the server after the password check; new tables/functions locked by default; letter authors' account ids hidden; GraphQL off. Cloud checked read-only first: RLS on everywhere, only the intended functions callable, no 2025 storage buckets left, no secrets in git history (only public anon keys). |
| 2026-11-13 | 2.3.0 | **Tooling before the redesign.** Tailwind CSS 4, `tw-animate-css`, lucide 1.x, minor updates. Node 22.12+ required (machine on Node 26); latest Supabase packages; Node 20 polyfill removed. |
| 2026-11-13 | 2.4.0 | **Next.js 16 and Supabase CLI v3.** `middleware.ts` → `proxy.ts`, native ESLint flat config, Turbopack by default. CLI v3 (`--remote` for the cloud), config updated, local Postgres pinned to 15 like the cloud. Browser walkthroughs (reader, visitor, admin) and the security checks pass. |
| 2026-11-13 | 2.5.0 | **Sign-in review + "Continue with Google".** The email/password flow was reviewed (no account enumeration, safe redirects, PKCE, server-side password checks: sound). Added the Google button (shown only when Google is on in Supabase), Google-only accounts in Settings and account deletion, clearer error messages, the 72-byte password limit. Google itself is not switched on yet: it needs the owner's Google Cloud client (`docs/GOOGLE_SIGN_IN.md`). |
| 2026-11-13 | 2.6.0 | **"Old press" redesign** (third round after owner feedback: "too boxy, harsh, crowded"). Soft paper cards with rounded corners on real newsprint, Fraunces + Jost, muted section inks, one header on every page (bottom tab bar on phones), a front page with one row of chips + Filters dialog, a masthead card with matching clock and moon tiles, Penfield month woodcuts (almanac), Penfield and Steinlen colour plates, Steinlen kittens, sections as postage stamps, navy-and-gilt night edition. The owner may want the street strip changed later. |
| 2026-11-13 | - | **Clean-up.** Deleted the 2025 AI rule books and their helpers (`.clinerules`, `.cursor`, `.roo`, `.windsurf`, `.kilocode`, `project_rules`, `memory`, `.github/copilot-instructions.md`, `tools/`, `requirements.txt`, `.conda`), the 2025 school presentation files, the Gemini-era specs in `Architecture/`, the old `debug/` scripts and other leftovers. Added `CLAUDE.md` and this log. |
| 2026-11-13 | unreleased | **"Nocturnal broadsheet".** Printed controls instead of SaaS pills (ledger tabs, ticket-stub buttons, wax seals, postmarks), the masthead's ears and star chart. Then, after owner feedback ("fix the alignment, make the whole page feel 19th-century"): one 1360px broadsheet width on every page, the sheet lying on a dark desk by lamplight, the department ribbon, scrollwork dividers, a telegraph key and press by the section heads, illuminated initials, archival photo plates, Endorse / Clip story with an ink-stamp flash and a snip, printer's fists instead of arrows, the story page as a three-column spread, a hansom cab, chimney smoke and guttering gas flames in the street, a shooting star in the moon's dial. Then Settings as the Reader's Ledger (wax-seal inks, antique fields, printed menus), a reading room (clock, street, photos, columns), the page turn, the walnut desk by candlelight with stacked sheets, a ribbon bookmark and a brass scrollbar. |
| 2026-11-14 | unreleased | **A personal paper, not a social network** (owner's decision). Letters to the editor and Endorse (likes) removed with their public counts, in the app and in the database (migration `20261114080823_remove_letters_and_likes`, applied locally after a `pg_dump`; the owner's account had no likes or letters). Story actions are now Clip story and More (Share on the story page). "For you" learns from sections and saved stories. The night edition lies on wet cobbles (ambientCG PavingStones119), evenly lit, instead of the walnut desk; the ribbon bookmark is gone. Then a polish round: the motto set along the ribbon's arch, a stronger magnifier in the search fields, engraved tab icons (broadsheet, quill, Penny Black, press) instead of the ✦ and the phone bar's modern icons, brighter section stamps with a clear hover lift. |
| 2026-11-14 | unreleased | **Crisper pages and quiet extras.** Pages of 16 (front page: lead, 3 in the sidebar, 4 rows of 3) then 15, with a "Continued on page N" slip filling any empty grid slots; an "On this day" almanac box from Wikipedia under "In other news" (cached half a day); an optional Sound ticket on the banner (rain and a pocket watch, Web Audio, off by default); reading time counted from the publisher's page at ingestion; muted words in Settings; Print clipping on saved stories. Migration `20261114085132_reading_time_and_muted_keywords` applied locally after a `pg_dump`. |
| 2026-11-14 | unreleased | **Ready for a free live site.** Audit for Vercel Hobby + Supabase free: secrets (gitignore `.env*`, history and browser bundle checked: no secrets), daily cron that writes to Postgres (keeps Supabase awake) and prunes old articles. **No sign-up wall**: visitors read, search, choose sections (cookie) and clip (browser storage, with folders, notes, Print clipping); signing in moves both into the account. Vintage favicon (blackletter D) and Open Graph / Twitter preview card. Honest error states when the database is unreachable, plus `global-error`. Fix migration `20261114090647_anon_feed_muted_keywords` (anon feed), applied locally; cloud push awaits the owner. |

## Decisions worth remembering

- **No Edge Functions.** Ingestion runs inside Next.js so there is one thing to deploy. Scheduling is
  Vercel Cron (daily, Hobby plan limit), GitHub Actions (every 2 h) or the automatic refresh when
  someone opens the feed and the last run is older than 60 minutes.
- **The database is the security boundary.** Pages check permissions too, but RLS, column grants,
  triggers (role protection, reserved names, rate limits) and `auth.uid()` inside every function are
  what actually protect the data. Anything new must follow the same pattern.
- **Images** are resized through each publisher's CDN (`lib/images.ts`) rather than through Next's
  image optimiser, which would cost Vercel quota and be slower.
- **Saved stories cap**: no visible quota, only a silent safety cap of 1000 in the database.
- **Local Postgres is 15, like the cloud.** `config.toml` said 17 but CLI v2 had silently used the
  cloud's version cached by `supabase link`, so the local data volume is Postgres 15. Since 2.4.0
  `major_version = 15` says so explicitly. A move to 17 would be a cloud upgrade first (Supabase
  dashboard), then a local dump/restore.
- **New tables and functions start locked** (since 2.2.1). A migration that adds one must also
  `grant` exactly what `anon` / `authenticated` need (and enable RLS on tables), or the app
  gets "permission denied".
- **Password checks** for changing the password and deleting the account happen on the server.
  The delete itself needs the service key; the password change relies on Supabase's
  "Secure password change" setting, which only demands re-authentication for sessions older
  than 24 hours.
- **Artwork.** Public-domain and CC0 pictures only; every file and its source is in
  `docs/ASSETS.md`. Good sources that work from this machine: Wikimedia Commons (public-domain
  scans; use the API and `thumb.wikimedia.org` sizes 500/960/1280px), freesvg.org (CC0 SVGs; the
  page must be visited first for its cookie) and ambientCG (CC0 textures). The Art Institute of
  Chicago image server sits behind a bot check: do not work around it, find the same work on
  Commons. Line art becomes a WebP **mask** in `public/engravings` (darkness as transparency,
  trimmed) and is added with its pixel size to `components/site/engraving.tsx`; colour plates
  go to `public/plates` as plain WebP; small interface ornaments (frame corners, seal, postmark,
  globe, magnifier, moth, pigeon, star) go to `public/ornaments` and `components/site/ornament.tsx`. Text on a poster (a real magazine name, for example) is
  painted out before use. The street banner (`components/site/street-theatre.tsx`) is a paper theatre
  of such prints: Hollar's skyline, Fiske railings, a Larousse lantern on a Fiske post, and Edouart's
  cut-paper people; the cut-outs were made with a script that selects each figure from a point on its
  body and warns when a cut touches the crop edge (a clipped hand or head). The hansom cab is line art
  made solid: enclosed areas are filled from the outside in, with extra "this is sky" points where the
  reins close off pockets, and the near wheel is a separate piece (kept as drawn) that turns. Only the
  cobbles, the smoke and the flames are generated.
- **One page width.** Every page uses the `container` column (at most 1360px) and the sheet is exactly
  that wide; inner pages fill it with a margin column (Saved: folders; Sections: the count and the
  buttons; the story page: the dateline, with the reading column at about 72 characters). New pages
  should do the same rather than a narrow centred column.
- **Photographs** get an archival look (a little faded and warm, dark edges) that clears to full
  colour when the reader points at the story or focuses it (owner's request, replacing "photos in
  normal colour"). Touch screens cannot point, so they get only a light touch of it.
- **Ambient motion** (the street, the moon's stars and shooting star, the candlelight, the page
  turn) uses transform and opacity only, pauses off screen, stops for reduced motion, and the
  street's Pause button stills the town and the sky.
- **Reading preferences live on the device, not in the database** (clock, street banner, photos,
  columns; `lib/reader-prefs.ts`): cookies printed as `data-*` on `<html>` by the root layout, so
  the page is right before any script runs and no migration was needed. Like the edition, they do
  not follow the reader to another device. Moving them to `profiles` later would need a migration
  with column grants (see the hard rules in CLAUDE.md).
- **Page width**: `--page-max` is 1360px, 1440px on monitors from 1680px; the container and the
  sheet both use it.
- **Known limit**: the feed fetcher checks DNS before connecting but does not pin the address, so
  DNS rebinding is not caught. Low risk, because responses are never shown to users. Documented in
  `lib/ingestion/safe-fetch.ts`.

## Current state (2026-11-14)

- `npm run check`: typecheck, lint and 62 tests pass. Browser walkthroughs (reader and admin) pass
  on a production build with no CSP violations. The "nocturnal broadsheet" round was checked on a
  production build in both editions (reader pages, the visitor landing page, Pause, reduced motion)
  and from 390 to 1920 px wide with no sideways scrolling.
- Local stack: the owner's account (`ggg`, not admin), about 1600 articles.
- Cloud: new schema, 33 sources, 827 articles, **no accounts yet**. Not deployed to Vercel yet.
- Nothing has been committed; the owner reviews and pushes by hand.

## To do

### Before going online (the owner said: not yet, more changes first)

- [x] Migration `20261113095910_security_round_two` pushed to the cloud (2026-11-13, verified).
- [x] **Secure password change** switched on in the cloud project (2026-11-13).
- [x] Migration `20261114080823_remove_letters_and_likes` pushed to the cloud (2026-11-14, verified:
      the new `get_feed` answers, `likes` is gone).
- [x] Migration `20261114085132_reading_time_and_muted_keywords` pushed to the cloud (2026-11-14).
- [x] Migration `20261114090647_anon_feed_muted_keywords` pushed to the cloud (2026-11-14, verified:
      `get_feed` answers for visitors, who see no muted words).
- [ ] In Vercel, set `CRON_SECRET` (the daily cron refuses to run without it, and the cron is what
      keeps the free Supabase project from pausing).
- [ ] Create the Vercel project; in *Settings > General > Node.js Version* pick 24.x or newer (the
      project needs 22.12+). Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY` and a long random `CRON_SECRET`.
- [ ] GitHub repository secrets `APP_URL` and `CRON_SECRET` if the Actions schedule is wanted.
- [ ] Sign up on the live site, then promote the account:
      `select public.promote_to_admin('you@example.com');` in the Supabase SQL editor.
- [ ] Optional: CAPTCHA in *Authentication > Attack Protection* if spam sign-ups appear.

### Sign-in setup (postponed by the owner on 2026-11-13; do before going online, in this order)

The code for all of this is done (2.5.0); only dashboard and Google Cloud work is left.

1. [ ] Set up **custom SMTP** (for example Resend or Brevo, both have free plans). Supabase's
       built-in mailer only sends a handful of emails per hour, which is not enough for real sign-ups.
2. [ ] Switch **Confirm email** on (*Authentication > Sign In / Providers > Email*). It is off in
       the cloud right now.
3. [ ] Set **Site URL** and **Redirect URLs** to the real domain (*Authentication > URL Configuration*).
4. [ ] Paste the email templates from `supabase/templates` (*Authentication > Email Templates*).
5. [ ] **Google sign-in**, only **after** step 2 (otherwise a stranger can pre-register someone's
       address with a password and keep access once that person uses Google): create the Google
       Cloud OAuth client and switch Google on in the dashboard, following
       [GOOGLE_SIGN_IN.md](GOOGLE_SIGN_IN.md). The button then appears by itself.
6. [ ] Test on the live site: sign up with email (confirmation email arrives), password reset,
       Google with a new account, and Google with an address that already has an account.

### Very last step, after everything else is finished (the owner's choice)

Kept for the end on purpose: the password is still needed for cloud work until then.

- [ ] **Reset the database password** (it was shared in chats three times): *Project Settings > Database >
      Reset database password*.
- [ ] If wanted, rotate the API keys (*Project Settings > API Keys*).
- [ ] Put the new values in `.env.cloud.local` (and in Vercel / GitHub secrets if keys were rotated).

### Later

- [ ] The owner's next round of feature and design changes (not specified yet).
- [ ] Before the first feature that adds a table: turn the database security checks from the
      2026-11-13 session (account deletion, locked-by-default grants) into a local
      `npm run test:db` against the local stack.
- [ ] When going online: a GitHub Actions workflow that runs `npm run check` on every push. The
      owner keeps the project local (commits, no pushes) until everything is finished.
- [ ] During the redesign: clear the remaining 7 lint warnings (3 fixed in 2.6.0, 2 in the Settings rewrite) (`npm run lint`; React hook rules new in
      Next.js 16, plus `window.location.href` in `app/error.tsx`), then set
      `react-hooks/set-state-in-effect` and `react-hooks/refs` back to errors in `eslint.config.mjs`.
- [ ] **Upgrades** (checked 2026-11-13, see "Upgrade plan" below).
- [ ] Remove the old `AgregatorStiri` Docker volumes from the 2025 local stack (Docker Desktop >
      Volumes) once nothing is needed from them.
- [ ] Free-tier note: the hosted project pauses after about a week without traffic; "Restore" in the
      dashboard brings it back with its data.

## Upgrade plan (checked 2026-11-13)

In this order; each step is one session, followed by `npm run check` and a browser walkthrough.

1. ✅ *Done in 2.3.0.* **Safe minor updates now** (no code changes expected): Radix UI packages, `tailwind-merge`,
   `fast-xml-parser` (it parses untrusted feeds, so keep it current), `autoprefixer`, `ws`,
   `dotenv` 17.x, TypeScript 5.9.
2. ✅ *Done in 2.3.0.* **Tailwind CSS 3 → 4 and `lucide-react` 0.x → 1.x before the UI redesign**, so the new design is
   written once, in the new style (Tailwind 4 moves the config into CSS; lucide 1 renames some icons).
3. ✅ *Done in 2.3.0.* **Node 20 → Node 22.12+** (`engines`; the machine runs Node 26),
   `@supabase/supabase-js` 2.119, `@supabase/ssr` 0.12.7, `@types/node` 22 (the lowest supported
   Node, so code cannot use newer APIs by accident). WebSocket polyfill and `ws` removed.
4. ✅ *Done in 2.4.0.* **Next.js 15 → 16** with `eslint-config-next` 16 (`proxy.ts`; CSP nonce rechecked).
5. ✅ *Done in 2.4.0.* **Supabase CLI 2.26.9 → 3.1**.
6. **Wait**: ESLint 10 (until `eslint-config-next` supports it), TypeScript 7 (new compiler; let the
   tooling catch up), `dotenv` 18.

## Open questions for the owner

- None right now.
