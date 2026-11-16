# The Daily Aggregator

**All the news that fits your interests.** A personalized news aggregator laid out like an
old-school broadsheet: the latest headlines from 30+ publishers, filtered by the sections you
care about.

**Read it live: [daily-aggregator.vercel.app](https://daily-aggregator.vercel.app)**, no account needed.

![The front page in the morning edition: the blackletter masthead with a pocket watch and tonight's moon, the section ribbon, the lead story beside the latest dispatches, and the paper-theatre street](docs/screenshots/feed.jpg)

More screenshots: [quick read](docs/screenshots/quick-read.jpg) · [night edition](docs/screenshots/feed-dark.jpg) ·
[saved stories](docs/screenshots/saved.jpg) ·
[phone](docs/screenshots/mobile.jpg) · [newsroom dashboard](docs/screenshots/admin.jpg)

Built with **Next.js 16**, **React 19**, **TypeScript**, **Tailwind CSS 4** and **Supabase**
(Postgres, Auth).

## Features

**Reading**
- **One front page for everyone** (`/`): the lead story beside "Latest dispatches" (ten one-line
  headlines), then every section in brief (a photo story, four headlines, "All World news"). Readers'
  own sections come first. 8 sections from 33 RSS sources, refreshed every hour.
- **Quick read**: pressing a headline opens the story in a sheet over the page (from the right on a
  computer, from the bottom on a phone) with the photo, summary, Save, Share and the way on to the
  publisher, and three more from the same desk at its foot. Close, Escape or Back return to the same
  spot. A shared link opens the front page with that story's sheet open.
- **New since your last visit**: the front page says how many stories came out since you last read
  the paper ("12 new stories since your last visit this morning"). Remembered in the browser, no
  account needed.
- **Keyboard reading**: j / k next and previous story, Enter to open it, s to save it, / to search,
  Esc to let go, ? for a card of the keys (nothing happens while typing in a box).
- **Also reported by**: the quick-read sheet lists the same news from other papers, grouped when the
  stories are fetched (headlines compared with `pg_trgm`, within 48 hours).
- **Lists**: All the latest (`/latest`), each section (`/section/world`), each newspaper
  (`/paper/the-guardian-world`) and search (`/search?q=…`), page by page (16 stories, then 15).
  On phones each story is one row (picture left, headline right), five or six to a screen.
- Pages are printed on the server; what every visitor sees alike (the sections, the newspapers and
  the front page of a visitor without mutes) is kept between requests and refreshed after every news
  fetch. Images are requested from each publisher's CDN at the size they are shown.
- No sign-up wall: visitors read, search, choose sections, save stories and change Settings in their
  browser; signing in moves all of it into the account.
- Hide a story, mute a newspaper, or mute words (Settings > Sections & papers).
- A reading time ("4 min read") on stories, an "On this day" almanac (three anniversaries from
  Wikipedia).
- An optional ambient **Sound** on the street banner (soft rain and a pocket watch, made in the
  browser; off by default).

**Saved stories**
- Press **Save** under any story to keep it. Saved stories stay until you remove them, even after
  they leave the front page.
- One simple page: a list of your saved stories with plainly labelled buttons (Mark as read, Put in
  a folder, Add a note, Remove). Removing can be undone.
- Optional folders, a search box (it also searches your notes) and a "Hide stories I've read"
  switch. Opening a saved story marks it as read.

**Account**
- Sign in with Google: the first sign-in makes the account (no passwords to keep; set-up in
  [docs/GOOGLE_SIGN_IN.md](docs/GOOGLE_SIGN_IN.md)).
- Sections (`/sections`): press postage stamps to choose the sections of your front page.
- Settings (`/settings`): byline (username) and avatar ink, Morning / Night / by-the-clock edition, type size, accent ink for section labels, muted
  sources, account deletion (after a fresh Google sign-in).

**Admin panel** (`/admin`)
- Dashboard: users, articles, source health, engagement, ingestion history with errors, articles
  per topic, most engaging stories, and a **Fetch news now** button.
- Sources: add (with a live feed test), edit, enable/disable, fetch one source, delete; manage topics.
- Readers: change roles (the last admin cannot be demoted), delete accounts.

**Design**
- A 19th-century broadsheet: newsprint with a paper grain (and a night edition), a blackletter masthead
  over an engraved star chart, Fraunces headlines, Source Serif body text and Jost labels, double rules,
  square corners, drop caps, postage-stamp sections and public-domain engravings.
- The paper's name and motto live in [`lib/site.ts`](lib/site.ts); colours and the newspaper
  utility classes (`.headline`, `.kicker`, `.paper-box`, `.news-grid`, ...) in
  [`styles/globals.css`](styles/globals.css).

## Quick start (about 10 minutes, no Docker)

**You need:** Node.js 22.12+ (any current LTS: 22, 24 or 26), the
[Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) v3 and a free
[Supabase](https://supabase.com) account. Development runs against a small free cloud project, so
nothing heavy runs on your computer.

1. Create a Supabase project for development (any region). In *Authentication > URL Configuration*
   set the Site URL to `http://localhost:3000` and add `http://localhost:3000/**`; in
   *Authentication > Sign In / Providers* switch **Google** on ([docs/GOOGLE_SIGN_IN.md](docs/GOOGLE_SIGN_IN.md))
   and **Email** off.
2. Load the schema into it:
   ```bash
   npm install
   supabase login
   supabase db push --remote=<your-dev-project-ref>
   ```
3. Put its URL, publishable (anon) key and secret (service_role) key in `.env.local`:
   ```bash
   cp .env.example .env.local   # then fill in the values
   npm run ingest               # fetch today's news (about a minute)
   npm run dev                  # http://localhost:3000
   ```
4. Sign in with Google, pick your sections, and make yourself an admin with
   `npm run make-admin -- you@example.com`; reload and open `/admin`.

The `db:push:dev`, `db:push:prod` and `db:types` scripts in `package.json` name this project's own
dev project; change the ref in them to yours.

## Deploying (Supabase cloud + Vercel)

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (the free tier is fine).
2. **Push the schema** from this folder:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push --remote
   ```
3. **Auth settings** in the Supabase dashboard:
   - *Authentication > URL Configuration*: set **Site URL** to your app URL
     (e.g. `https://your-app.vercel.app`) and add `https://your-app.vercel.app/**` to **Redirect URLs**.
   - *Authentication > Sign In / Providers*: switch **Google** on (the Google Cloud steps are in
     [docs/GOOGLE_SIGN_IN.md](docs/GOOGLE_SIGN_IN.md)) and **Email** off: the site signs in with Google only.
4. **Deploy to Vercel** (import the GitHub repo) and set the environment variables from
   [`.env.example`](.env.example): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET`. New Supabase projects may show *publishable* and
   *secret* keys instead of anon and service_role; both formats work. Link previews use the
   production domain automatically; set `NEXT_PUBLIC_SITE_URL` only for a custom domain.
5. Sign in on the deployed site, then promote yourself: run
   `select public.promote_to_admin('you@example.com');` in the Supabase SQL editor.

### Keeping the news fresh

Any one of these is enough:

| Option | How |
|---|---|
| **Automatic (default)** | When someone opens the paper and the last fetch is older than `INGESTION_INTERVAL_MINUTES` (60), a fetch runs in the background. |
| **cron-job.org (free)** | An hourly job (for example at :15) that calls `GET https://your-app/api/cron/ingest` with the header `Authorization: Bearer <CRON_SECRET>`. The endpoint takes the run lock and answers at once (cron-job.org gives up after 30 s); the run finishes in the background. |
| **Vercel Cron** | [`vercel.json`](vercel.json) calls `/api/cron/ingest` daily (the Hobby plan limit), as a backup. Vercel sends `CRON_SECRET` automatically. |
| **GitHub Actions** | [`.github/workflows/news-ingestion.yml`](.github/workflows/news-ingestion.yml) is run by hand (*Run workflow*; it has no schedule). Add the repository secrets `APP_URL` and `CRON_SECRET`. |
| **Manual** | Admin dashboard > *Fetch news now*, or `npm run ingest`. |

Anything else can call the endpoint too:
`curl -H "Authorization: Bearer $CRON_SECRET" https://your-app/api/cron/ingest`
(`?wait=1` answers when the run ends, with its summary; two overlapping calls are safe: only one run goes on).

### Staying online on free plans ($0)

- **Vercel Hobby** allows a cron job once a day; `vercel.json` runs `/api/cron/ingest` at 06:00 UTC.
  Each run writes to Postgres, which also keeps the **free Supabase project from pausing** (Supabase
  pauses free projects after a week without activity). Set `CRON_SECRET` in Vercel, or the cron is
  refused and nothing touches the database.
- Between cron runs the paper refreshes itself when people open the front page (at most hourly,
  `INGESTION_INTERVAL_MINUTES`); an external cron service (cron-job.org) can fetch every hour.
- **The database never fills up**: every full fetch deletes unsaved articles older than
  `ARTICLE_RETENTION_DAYS` (30) and fetch logs older than 60 days. A month of news from 33 feeds is
  roughly 30,000 short rows, well under the free 500 MB.
- Photos are loaded straight from each publisher's CDN, so they use none of Vercel's image or
  bandwidth allowance beyond the page itself.

### Visitors without an account

Everyone can read, search, open stories, choose sections (kept in a cookie) and clip stories, with
folders and notes (kept in the browser's storage, up to 200). An account adds the
same things on every device and muted words; when a visitor signs in, their
sections and clippings move into the account. Only Settings and the admin pages need a login.

## Security

What the app does to keep readers and the server safe:

- **Database rules (Row Level Security)** on every table, written in the migrations: readers can
  only see and change their own saved stories, folders, notes and settings. On top of that, each
  table only allows the exact columns a reader may touch (for example, nobody can change their own
  role, and guests cannot see feed addresses or error details). New tables and functions start locked: nobody can use them until
  a migration grants access on purpose.
- **Admin rights** are checked by the database itself, not only by the pages.
- **Feeds cannot reach the server's own network.** Feed, article and image addresses come from
  third parties, so every request (and every redirect) must go to a public internet address on a
  normal web port. Downloads are size-limited. See `lib/ingestion/safe-fetch.ts`.
- **Browser protections**: a strict Content Security Policy with a fresh nonce on every page (no
  inline or injected scripts can run), HSTS, no framing, no sniffing, and session cookies marked
  `Secure` on HTTPS.
- **Accounts**: sign-in is Google only, so the site keeps no passwords; deleting an account needs a
  Google sign-in from the last 10 minutes (the server checks it; the browser cannot delete an account
  by itself); login links can only send you to pages on this site; staff-like usernames (admin, editor,
  moderator, ...) are reserved.
- **Abuse limits**: 100 folders and 1000 saved stories per reader, search limited to 100
  characters.
- **Secrets**: `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` are only read on the server and are
  never sent to the browser. `/api/cron/ingest` refuses requests without the secret.
- **Only the APIs the app uses are on**: the GraphQL endpoint is switched off.
- **Dependencies**: `npm audit --omit=dev` is clean. GitHub's Dependabot alerts report known vulnerabilities; updates are applied by hand and tested before they are committed.

### Checklist before going live

- [ ] Supabase: **Google** on and **Email** off, **Site URL** and **Redirect URLs** point at your domain.
- [ ] The schema came from `supabase db push --remote` (that is what creates the database rules). In
      *Database > Tables*, every table shows **RLS enabled**.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` are set only in Vercel (and GitHub secrets),
      never in a `NEXT_PUBLIC_` variable or in the repository. `CRON_SECRET` is long and random
      (for example `openssl rand -hex 32`).
- [ ] The site is served over HTTPS (Vercel does this automatically).
- [ ] If a project's keys were ever shared or committed, rotate them in *Project Settings > API Keys*.
- [ ] Optional: in *Authentication > Rate Limits*, keep the defaults or lower them; enable CAPTCHA
      in *Authentication > Attack Protection* if you get spam sign-ups.

## How it works

```
RSS / Atom feeds ──> lib/ingestion (fetch, parse, normalize, dedupe, find images)
                        │  service-role key, one bulk insert per source
                        ▼
                 Supabase Postgres ──> RPC functions (get_front_page, get_feed, get_article, ...)
                        ▲                        │  row level security
                        │                        ▼
                 Next.js App Router (server components + client components)
```

- **Ingestion** ([`lib/ingestion`](lib/ingestion)) fetches the enabled sources 6 at a time and parses
  RSS 2.0, RSS 1.0 and Atom. It cleans HTML and entities, removes tracking parameters, skips
  duplicates, upgrades thumbnails and reads `og:image` for stories without an image. A database lock
  prevents overlapping runs. Every run is logged in `ingestion_runs`, and articles older than 30 days
  are removed unless someone saved them.
- **Database**: all schema, policies and functions are in
  [`supabase/migrations`](supabase/migrations). Every table uses row level security. Users can only
  read and change their own data and cannot change their own role (enforced by a trigger).
- **Auth**: Supabase Auth with `@supabase/ssr` cookies. The proxy (`proxy.ts`) refreshes the session and
  protects private pages. `/auth/callback` (PKCE) completes Google sign-in.

### Project structure

```
app/                     routes (App Router)
  (auth)/                the login page (Continue with Google)
  (paper)/               front page, latest, sections, papers, search, story sheet, saved, settings
  (admin)/admin/         dashboard, sources, users
  actions/               server actions (profile, onboarding, admin)
  api/cron/ingest/       scheduled ingestion endpoint
  auth/                  Google sign-in callback
components/              UI (ui/ = shadcn-style primitives)
lib/                     Supabase clients, ingestion, helpers, types
scripts/                 ingest.ts, make-admin.ts
supabase/                config, migrations
tests/                   unit tests (node:test)
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server (Turbopack, fast refresh) |
| `npm run dev:webpack` | Development server with webpack, if Turbopack ever misbehaves |
| `npm run build` / `start` | Production build / production server |
| `npm run preview` | Build and start production locally: the real speed of the site |
| `npm run check` | Type check + lint + unit tests |
| `npm run test:db` | Check the feed functions against the development database, as a visitor (read-only) |
| `npm run ingest` | Fetch all enabled sources once |
| `npm run make-admin -- <email>` | Give an account the admin role |
| `npm run db:push:dev` | Apply new migrations to the development project |
| `npm run db:push:prod` | Apply new migrations to production (the project the CLI is linked to) |
| `npm run db:types` | Regenerate `lib/database.types.ts` from the development project |

## Troubleshooting

- **The site feels slow while developing**: in development every page is compiled the first time
  you open it, and nothing is optimised. Clicks are much faster from the second visit on. To judge
  the real speed, stop `npm run dev` and run `npm run preview` (both use the `.next` folder, so do
  not run them at the same time).
- **The app shows "connect a database"**: `.env.local` is missing or incomplete. Restart
  `npm run dev` after editing it.
- **Supabase CLI v3** targets a local database unless you add `--remote` (the linked project) or
  `--remote=<ref>` (any other project). The project needs CLI v3; v2 rejects `[local_smtp]` in
  `supabase/config.toml`.
- **Node.js 20 is not supported** any more (the Supabase packages need Node 22+). Run `node -v`;
  if it is older than 22.12, install a current LTS from nodejs.org.
- **A source keeps failing**: the admin *Sources* page shows the last error. Many publishers change
  their feed URLs over time; use *Edit* and *Test* to fix the URL.

## Authors

- **Iustin Margarit** - *Lead Developer* - [GitHub](https://github.com/Iustin-Margarit)
- **Vlad Marius-Valentin** - *Co-Developer*
