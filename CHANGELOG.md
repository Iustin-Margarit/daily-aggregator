# Changelog

## 2.4.0 - 2026-11-13: Next.js 16 and Supabase CLI v3

### Changed
- **Next.js 15.5 → 16.4** and `eslint-config-next` 16. `middleware.ts` is now `proxy.ts` (Next.js 16
  naming) and `lib/supabase/middleware.ts` is `lib/supabase/proxy.ts`. Turbopack is the default for
  `next dev` and `next build` (`npm run dev:webpack` now passes `--webpack`). `tsconfig.json` uses
  `jsx: react-jsx` and includes `.next/dev/types`, as Next.js 16 requires.
- **ESLint** uses the native flat configs of `eslint-config-next` (`@eslint/eslintrc` and `FlatCompat`
  removed). Two new React rules, `react-hooks/set-state-in-effect` and `react-hooks/refs`, flag 11
  spots in the existing UI; they are warnings until the redesign rewrites those components.
- **Supabase CLI 2.26.9 → 3.1.** `[inbucket]` is `[local_smtp]`, `auth.email.enable_signup` /
  `auth.sms.enable_signup` are `enabled`. CLI v3 works on the local database unless `--remote` is
  given: the cloud is now updated with `supabase db push --remote`. `npm run db:types` drops the
  `--local` flag (types regenerated; formatting changed, the unused GraphQL schema is gone).
- `supabase/config.toml` now says `major_version = 15`, which is what the local database and the
  cloud actually run (it said 17; CLI v2 silently followed the cloud's version).

Checked on a production build: security headers and the CSP nonce, login redirect, cron secret,
open-redirect guard; reader flow (letters live for a visitor, Save, account deletion); admin
dashboard, sources and readers; menus, dialogs, fonts, night edition and phone widths. The local
stack was restarted with CLI v3 with all data intact, and the database security checks pass.

## 2.3.0 - 2026-11-13: tooling updates before the redesign

### Changed
- **Tailwind CSS 3 → 4.** The theme moved from `tailwind.config.ts` (deleted) into `@theme` in
  `styles/globals.css`; the newspaper classes (`.headline`, `.kicker`, `.paper-box`, `.news-grid`, ...)
  are now `@utility` blocks; PostCSS uses `@tailwindcss/postcss` (autoprefixer is built in).
  Class names were renamed by the official upgrade tool (`outline-none` → `outline-hidden`,
  `aspect-[3/2]` → `aspect-3/2`, `text-[var(--x)]` → `text-(--x)`, ...). Fixed by hand afterwards:
  the font variables (next/font now sets `--font-playfair`, `--font-source-serif`, `--font-oswald`, so
  they no longer clash with Tailwind's `--font-*` theme names), the page container's 1.5rem gutters
  from 640px, a button `variant` the tool had renamed, and buttons keep the pointer cursor
  (Tailwind 4 dropped it).
- `tailwindcss-animate` replaced by `tw-animate-css` (same class names, plain CSS).
- `lucide-react` 0.523 → 1.x (no icon used by the app was renamed).
- **Node.js 22.12+ required** (`engines`); developed on Node 26. `@supabase/supabase-js` 2.109 → 2.119
  and `@supabase/ssr` 0.12.0 → 0.12.7 (they need Node 22). The Node 20 WebSocket polyfill
  (`instrumentation.ts`, `lib/websocket-polyfill.ts`) and the `ws` package are removed.
- Minor updates: Radix UI packages, `tailwind-merge`, `fast-xml-parser`, `ws`, `dotenv`, TypeScript 5.9.
- `typescript-eslint` pinned to 8.x with a patched `minimatch` through `overrides`: `npm audit fix`
  had "fixed" an advisory by downgrading it to 6.x, which crashes ESLint 9. `npm audit` is clean,
  dev dependencies included.

Checked in a production build (Node 26): front page, feed, article, saved, settings, menus and
dialogs, night edition, 390 px and 800 px widths, no CSP violations. After the Supabase update:
login, a letter appearing live for a logged-out visitor, Save, and account deletion through the
real form (wrong password refused, right password deletes the account and its letters and signs
out). `npm run ingest` works without the polyfill.

## 2.2.1 - 2026-11-13: security, round two

New migration `20261113095910_security_round_two.sql`.

### Security
- **Deleting an account really needs the password.** `delete_own_account()` could be called from
  any logged-in browser, which skipped the password step. It is replaced by
  `delete_user_account(uuid)`, which only the service role can run: the server action checks the
  password first, then deletes with the service key.
- **New tables and functions start locked.** Default privileges no longer give `anon` and
  `authenticated` (or, for functions, `PUBLIC`) access to objects created by later migrations;
  every new object needs an explicit `GRANT`.
- **Letters no longer reveal the author's account id**: `comments.user_id` cannot be read by
  visitors or readers (also stripped from realtime events). Letters are still shown through
  `get_article_comments()`, and the "own letter" policies still work.
- **GraphQL switched off** (`pg_graphql` dropped): the app never used it, and it described the
  schema to anyone with the public key.

## 2.2.0 - 2026-11-13: security hardening

### Security
- **Feeds can no longer make the server contact private addresses.** Feed, article and image
  requests go through `safeFetch`: only http(s) on the standard ports, no credentials, every
  redirect re-checked, and any host that resolves to a loopback, private, link-local, cloud
  metadata or other non-public address is refused (IPv4, IPv6 and every disguised form). Feed
  downloads are capped at 5 MB.
- **Column-level database privileges** on top of Row Level Security: guests are read-only; readers
  can only write the columns they own (comment text, their own profile settings); `sources.rss_url`
  and fetch diagnostics are admin-only; nobody but the ingestion job writes articles.
- **Content Security Policy** with a per-request nonce and `strict-dynamic`, plus HSTS and
  `Cross-Origin-Opener-Policy`. Session cookies are `Secure` on HTTPS.
- **Open redirects closed**: `?next=` only accepts paths on this site; error pages no longer echo
  text from the URL; `x-forwarded-host` is validated.
- **Accounts**: deleting an account requires the password; sign-up no longer reveals whether an
  email is registered; passwords need letters and digits; changing a password requires a recent
  login; staff-like usernames are reserved (checked in the database too).
- **Abuse limits**: 5 letters per minute / 60 per hour per reader, 100 folders per reader, search
  limited to 100 characters and 8 words, image URLs must be http(s).
- Error messages shown to readers are generic; details go to the server log only.
- Dependencies: `npm audit fix`, patched `postcss` via `overrides`; production dependencies have no
  known vulnerabilities. Added Dependabot. The GitHub Actions job runs with no repository
  permissions.
- New tests: `tests/security.test.ts`.

### Housekeeping
- The hosted Supabase project was reset and now runs the baseline migrations. From here on the
  baseline files are frozen: every schema change goes into a new migration file.
- Removed the 2025 AI-assistant rule books and helpers (`.clinerules`, `.cursor`, `.roo`,
  `.windsurf`, `.kilocode`, `project_rules`, `memory`, `.github/copilot-instructions.md`, `tools/`,
  `requirements.txt`), the outdated `Architecture/` specs and old debug scripts. Added `CLAUDE.md`
  and [`docs/REVIVAL.md`](docs/REVIVAL.md).

## 2.1.0 - 2026-11-12: the broadsheet edition

### Fixed - speed
- **Scrolling the feed was janky**: several publishers put their full-resolution originals in their
  feeds (up to 12000 × 6750 pixels), so one screen of stories decoded about 270 megapixels.
  Images are now requested from each publisher's CDN at the displayed size (`lib/images.ts`), and
  ingestion replaces oversized images that cannot be resized (`lib/ingestion/image-size.ts`). A
  full scroll of the feed now decodes about 50 megapixels and keeps 60 fps.
- **Clicks felt slow in development**: `npm run dev` now uses Turbopack (pages compile in about
  0.4 s instead of several seconds). `npm run preview` runs the production build locally.
- Removed costly effects (backdrop blur on the sticky header) and let the browser skip rendering
  off-screen stories (`content-visibility`).

### Changed - design
- The whole app is restyled as an old-school newspaper, "The Daily Aggregator": masthead with
  edition number and date, double rules, ruled columns, section kickers in accent ink, drop caps,
  and a "Night edition" dark mode.
- The feed is split into numbered pages of 30 stories instead of scrolling forever
  ("Continued on page 2", page numbers, back/forward support). `get_feed` now returns
  `total_count`.
- Saved stories page rebuilt to be understood at a glance: a plain list of stories with labelled
  buttons (Mark as read, Put in a folder, Add a note, Remove), an optional list of folders, one
  search box and a "Hide stories I've read" switch. Opening a saved story marks it as read.
- Story cards use a printed line of text actions (Like · Letters … Save · More) instead of a row
  of icons; Share moved into More.
- Newspaper wording where it helps (Front Page, Sections, Letters to the Editor, the Newsroom) and
  plain words where it matters: "Save", "Sign up", "Settings". Nothing says "subscribe" or
  "subscriber", so nobody thinks the paper costs money.
- New setting: accent ink (replaces the banner colour).

### Removed
- **Tags** on saved stories, folder colours and descriptions, bulk selection and the sort menu:
  they made the page hard to understand. Folders, notes and search remain.
- **The saved-story quota** ("space left", the per-user limit, the "limit reached" dialog and the
  admin limit editor). Readers can save as many stories as they like; a fixed safety cap of 1000
  stays in the database.
- The two example folders and tags that every new account used to receive.
- Database: tables `saved_tags` and `saved_article_tags`, columns `profiles.saved_articles_limit`,
  `saved_folders.description` and `saved_folders.color`, functions `get_saved_overview`,
  `remove_oldest_saved_article` and `clear_saved_from_disabled_sources`. The baseline migrations
  were edited in place (they have not been pushed to a hosted project yet); a local database
  created from the 2.0 baseline needs `npm run db:reset` (which deletes its local data).
- New default colours are printing inks (oxblood accent, navy avatars).

### Fixed - other
- Guests who opened a mistyped link were sent to the login page instead of the 404 page.
- The account menu button had no accessible name on phones; the landing page had no `<h1>`.
- Saved stories page: changing a filter logged "Cannot update a component (Router) while rendering
  a different component" because the URL was updated inside a React state updater.
- Opening a dialog from a menu item (for example "New folder…") left the whole page unclickable
  after the dialog closed. Menus are now non-modal.

## 2.0.0 - 2026-11-12: the revival

The 2025 version could not be set up again: the hosted Supabase project no longer exists, the
migrations failed on a fresh database, and the production build failed. This release rebuilds the
app on a clean, tested base.

### Fixed - things that were broken
- **Production build failed** (`useSearchParams()` without a Suspense boundary on `/`, `/login`,
  `/email-confirmed`).
- **Fresh database setup failed**: migration `20250708182500` added `banner_color` a second time. The
  ~70 incremental migrations are replaced by one readable baseline (`supabase/migrations`) that
  installs cleanly.
- **Files missing from git**: `.gitignore` had a Python-template `lib/` rule, so `lib/analytics.ts`,
  `lib/category-styles.ts` and `lib/utils/reading-time.ts` were never committed and a fresh clone did
  not build.
- **Articles had no summaries**: ingestion stored text in `description` but the UI read `summary`.
- **Articles had no images**: images were never extracted from feeds.
- **Scheduled ingestion could not work**: the middleware redirected `/api/trigger-ingestion` to `/login`.
- **Sign-up confirmation links pointed to `/auth/callback`, which did not exist**; logged-in users
  were redirected away from `/update-password`, breaking password resets.
- **Article pages crashed for articles with images** (event handler passed to `<img>` in a Server Component).
- **Feed pagination returned duplicates and skipped articles** (client-side filtering of 100 rows,
  offset advanced by the filtered count). Search only looked at the newest 100 articles.
- Saved-articles "limit reached" dialog read the wrong column names, so "Remove oldest" never appeared.
- Tagging a saved article reloaded the whole page; removing a saved article left it on screen;
  some confirm dialogs stayed open after confirming.
- The toast hook changed identity on every render, re-running effects (endless refetch loop on errors).
- A "Loading your session…" overlay flashed on every auth event; theme only applied to some pages;
  many light-only colours in dark mode; no mobile navigation.
- Several RSS feeds were dead (WSJ, New Scientist, ...); the source list was refreshed and verified.

### Security
- **Any user could make themselves admin** (`update profiles set role = 'admin'` from the browser).
  Role and saved-article limit are now protected by a trigger, and the last admin cannot be demoted.
- Database functions that accepted a user id from the client (save/remove saved articles, counts,
  feed) let users act on other users' data. All functions now use `auth.uid()`.
- Maintenance functions (`delete_old_articles`, ...) were callable by anonymous users. Execution
  rights are now explicitly granted per function.
- Likes were readable by everyone; they are now private (counts are stored on articles).
- The ingestion endpoint fell back to the secret `'your-secret-token'`; it now requires `CRON_SECRET`
  and compares it in constant time.
- Changing the password now asks for the current password; `?next=` redirects are restricted to
  same-site paths; security headers added; Next.js upgraded from 14.2.30 (end of life, known CVEs).

### Added
- Comments with live updates mute sources and hide stories, "For you" ranking that learns
  from likes and saves, text size setting, public share links with link previews, skippable
  onboarding.
- Saved articles: notes, undo, bulk tag removal, search in notes, URL-synced filters.
- Admin: real dashboard (stats, ingestion history, errors, articles per topic), add/test/delete
  sources, fetch a single source, topic management, per-user saved limits.
- Ingestion inside the Next.js app: `npm run ingest`, admin button, `/api/cron/ingest`, Vercel cron,
  GitHub Actions workflow and automatic background refresh. No Edge Function deployment needed.
- `npm run make-admin`, a setup page when `.env.local` is missing, landing page for visitors,
  email templates, account deletion, 404/error pages, unit tests (`npm test`), ESLint 9 config.

### Changed
- Next.js 14 → 15.5, React 18 → 19, `@supabase/ssr` 0.6 → 0.12 (cookie `getAll`/`setAll` API).
- Feed, saved articles, article, profile, onboarding, auth and admin UIs rewritten with a consistent
  design (serif headlines, category colours, dark mode, mobile layouts).
- The banner colour now works with any colour (gradient derived automatically).
- Saved-article limit default raised from 50 to 100.

### Removed
- Supabase Edge Function `news-ingestion` (replaced by `lib/ingestion`), `/api/trigger-ingestion`,
  client-side analytics stored in `profiles.analytics_data`, unused dependencies (`react-window`,
  `react-color`, `dompurify`, `node-fetch`, `zxcvbn`, ...), unused components.

### Upgrade notes
- The 2025 hosted Supabase project still has the old schema, which `supabase db push` cannot
  upgrade in place. Reset that project's database (or create a new project), then run
  `supabase db push` (see README).
- Local Supabase now uses project id `agregator-stiri`. The containers and volumes of the old
  `AgregatorStiri` stack are untouched; remove them with Docker Desktop if you no longer need them.
