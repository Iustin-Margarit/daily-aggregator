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
| 2026-11-13 | - | **Clean-up.** Deleted the 2025 AI rule books and their helpers (`.clinerules`, `.cursor`, `.roo`, `.windsurf`, `.kilocode`, `project_rules`, `memory`, `.github/copilot-instructions.md`, `tools/`, `requirements.txt`, `.conda`), the 2025 school presentation files, the Gemini-era specs in `Architecture/`, the old `debug/` scripts and other leftovers. Added `CLAUDE.md` and this log. |

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
- **Known limit**: the feed fetcher checks DNS before connecting but does not pin the address, so
  DNS rebinding is not caught. Low risk, because responses are never shown to users. Documented in
  `lib/ingestion/safe-fetch.ts`.

## Current state (2026-11-13)

- `npm run check`: typecheck, lint and 54 tests pass. Browser walkthroughs (reader and admin) pass
  on a production build with no CSP violations.
- Local stack: the owner's account (`ggg`, not admin), about 1600 articles.
- Cloud: new schema, 33 sources, 827 articles, **no accounts yet**. Not deployed to Vercel yet.
- Nothing has been committed; the owner reviews and pushes by hand.

## To do

### Before going online (the owner said: not yet, more changes first)

- [ ] Supabase: switch **Confirm email** on; set **Site URL** and **Redirect URLs** to the real domain.
- [ ] Supabase: paste the email templates from `supabase/templates`.
- [ ] Set up **custom SMTP** (for example Resend or Brevo, both have free plans). Supabase's built-in
      mailer only sends a handful of emails per hour, which is not enough for real sign-ups.
- [x] Migration `20261113095910_security_round_two` pushed to the cloud (2026-11-13, verified).
- [x] **Secure password change** switched on in the cloud project (2026-11-13).
- [ ] Create the Vercel project; in *Settings > General > Node.js Version* pick 24.x or newer (the
      project needs 22.12+). Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY` and a long random `CRON_SECRET`.
- [ ] GitHub repository secrets `APP_URL` and `CRON_SECRET` if the Actions schedule is wanted.
- [ ] Sign up on the live site, then promote the account:
      `select public.promote_to_admin('you@example.com');` in the Supabase SQL editor.
- [ ] Optional: CAPTCHA in *Authentication > Attack Protection* if spam sign-ups appear.

### Very last step, after everything else is finished (the owner's choice)

Kept for the end on purpose: the password is still needed for cloud work until then.

- [ ] **Reset the database password** (it was shared in a chat, twice): *Project Settings > Database >
      Reset database password*.
- [ ] If wanted, rotate the API keys (*Project Settings > API Keys*).
- [ ] Put the new values in `.env.cloud.local` (and in Vercel / GitHub secrets if keys were rotated).

### Later

- [ ] The owner's next round of feature and design changes (not specified yet).
- [ ] During the redesign: clear the 12 lint warnings (`npm run lint`; React hook rules new in
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
