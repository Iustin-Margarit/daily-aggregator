# The Daily Aggregator

**All the news that fits your interests.** A personalized news aggregator laid out like an
old-school broadsheet: the latest headlines from 30+ publishers, filtered by the sections you
care about.

**Read it live: [daily-aggregator.vercel.app](https://daily-aggregator.vercel.app)**, no account needed.

![The front page in the morning edition: the blackletter masthead with a clock and tonight's moon, the moving street banner, the lead story, "In other news" and the On this day almanac](docs/screenshots/feed.jpg)

More screenshots: [night edition](docs/screenshots/feed-dark.jpg) · [story page](docs/screenshots/article.jpg) ·
[saved stories](docs/screenshots/saved.jpg) · [phone](docs/screenshots/mobile.jpg) ·
[newsroom dashboard](docs/screenshots/admin.jpg)

Built with **Next.js 16**, **React 19**, **TypeScript**, **Tailwind CSS 4** and **Supabase**
(Postgres, Auth).

## Features

**Reading**
- Personalized feed of 8 topics (World, Politics, Business, Technology, Science, Health, Sports,
  Entertainment) from 33 RSS sources, refreshed every hour.
- **Latest** or **For you** ranking. "For you" boosts the topics you picked and the
  topics and sources of articles you save.
- Search (every word must match), time range, topic and source filters. Filters live in the URL, so
  they survive reloads and can be bookmarked.
- A front page with a lead story, an "In Other News" column with an "On this day" almanac box
  (three anniversaries from Wikipedia, cached for the day) and ruled columns of headlines, split
  into numbered pages of 16 stories, then 15 (`?page=N`, back/forward buttons work). Images for ~95% of
  stories (from the feed, or the article's preview image).
- Images are requested from each publisher's CDN at the size they are shown, so scrolling stays
  smooth even when a feed links to 12000-pixel originals.
- Article pages with summary, link to the full story and related stories. Article links are
  public, so sharing works for anyone. The paper is personal: there are no public comments,
  likes or counts.
- Hide a story, mute a source entirely, or mute words (Settings > Sections & papers): stories that
  mention a muted word are left off the front page.
- A reading time ("4 min read") on stories, counted from the words on the publisher's page when the
  story is fetched.
- **Print clipping** on saved stories: a cut-out newspaper clipping with your note, for paper or PDF.
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
- Email and password sign-up with confirmation, password reset and email change.
- Optional "Continue with Google" (appears once Google is switched on in Supabase; see
  [docs/GOOGLE_SIGN_IN.md](docs/GOOGLE_SIGN_IN.md)).
- Onboarding to pick topics (skippable), editable later.
- Settings: byline (username) and avatar ink, Morning / Night / device edition (light, dark,
  system), type size, accent ink for section labels, muted
  sources, password change (asks for the current password), account deletion.

**Admin panel** (`/admin`)
- Dashboard: users, articles, source health, engagement, ingestion history with errors, articles
  per topic, most engaging stories, and a **Fetch news now** button.
- Sources: add (with a live feed test), edit, enable/disable, fetch one source, delete; manage topics.
- Readers: change roles (the last admin cannot be demoted), delete accounts.

**Design**
- Newsprint palette with a light paper grain, Playfair Display headlines, Source Serif body text and
  Oswald labels, double rules, square corners, drop caps and justified columns on wider screens.
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
   *Authentication > Sign In / Providers* switch **Confirm email** off (no mail server needed).
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
4. Sign up, pick your sections, and make yourself an admin with
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
   - *Authentication > Sign In / Providers > Email*: make sure **Confirm email** is **on**. (It is
     off only in the local development setup, where there is no real mailbox.)
   - *Authentication > URL Configuration*: set **Site URL** to your app URL
     (e.g. `https://your-app.vercel.app`) and add `https://your-app.vercel.app/**` to **Redirect URLs**.
   - *Authentication > Email Templates* (recommended): paste the templates from
     [`supabase/templates`](supabase/templates). They link to `/auth/confirm`, which works even when
     the email is opened in another browser.
   - Optional: *Authentication > Sign In / Providers > Google* for "Continue with Google"; the
     Google Cloud steps are in [docs/GOOGLE_SIGN_IN.md](docs/GOOGLE_SIGN_IN.md).
4. **Deploy to Vercel** (import the GitHub repo) and set the environment variables from
   [`.env.example`](.env.example): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET`. New Supabase projects may show *publishable* and
   *secret* keys instead of anon and service_role; both formats work. Link previews use the
   production domain automatically; set `NEXT_PUBLIC_SITE_URL` only for a custom domain.
5. Sign up on the deployed site, then promote yourself: run
   `select public.promote_to_admin('you@example.com');` in the Supabase SQL editor.

### Keeping the news fresh

Any one of these is enough:

| Option | How |
|---|---|
| **Automatic (default)** | When someone opens the feed and the last fetch is older than `INGESTION_INTERVAL_MINUTES` (60), a fetch runs in the background. |
| **Vercel Cron** | [`vercel.json`](vercel.json) calls `/api/cron/ingest` daily (the Hobby plan limit). Vercel sends `CRON_SECRET` automatically. |
| **GitHub Actions** | [`.github/workflows/news-ingestion.yml`](.github/workflows/news-ingestion.yml) runs every 2 hours. Add the repository secrets `APP_URL` and `CRON_SECRET`. |
| **Manual** | Admin dashboard > *Fetch news now*, or `npm run ingest`. |

Anything else can call the endpoint too:
`curl -H "Authorization: Bearer $CRON_SECRET" https://your-app/api/cron/ingest`.

### Staying online on free plans ($0)

- **Vercel Hobby** allows a cron job once a day; `vercel.json` runs `/api/cron/ingest` at 06:00 UTC.
  Each run writes to Postgres, which also keeps the **free Supabase project from pausing** (Supabase
  pauses free projects after a week without activity). Set `CRON_SECRET` in Vercel, or the cron is
  refused and nothing touches the database.
- Between cron runs the paper refreshes itself when people open the front page (at most hourly,
  `INGESTION_INTERVAL_MINUTES`), and the optional GitHub Actions schedule adds a fetch every 2 hours.
  GitHub turns scheduled workflows off after 60 days without commits; re-enable it in the Actions tab.
- **The database never fills up**: every full fetch deletes unsaved articles older than
  `ARTICLE_RETENTION_DAYS` (30) and fetch logs older than 60 days. A month of news from 33 feeds is
  roughly 30,000 short rows, well under the free 500 MB.
- Photos are loaded straight from each publisher's CDN, so they use none of Vercel's image or
  bandwidth allowance beyond the page itself.

### Visitors without an account

Everyone can read, search, open stories, choose sections (kept in a cookie) and clip stories, with
folders, notes and Print clipping (kept in the browser's storage, up to 200). An account adds the
same things on every device, muted words and Settings; when a visitor signs in or signs up, their
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
- **Accounts**: passwords need 8+ characters with letters and numbers; deleting an account asks
  for the password again (the server checks it; the browser cannot delete an account by itself),
  or, for an account that only uses Google, a Google sign-in from the last 10 minutes; the sign-up form does not reveal whether an email is already registered;
  login links can only send you to pages on this site; staff-like usernames (admin, editor,
  moderator, ...) are reserved.
- **Abuse limits**: 100 folders and 1000 saved stories per reader, search limited to 100
  characters.
- **Secrets**: `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` are only read on the server and are
  never sent to the browser. `/api/cron/ingest` refuses requests without the secret.
- **Only the APIs the app uses are on**: the GraphQL endpoint is switched off.
- **Dependencies**: `npm audit --omit=dev` is clean. GitHub's Dependabot alerts report known vulnerabilities; updates are applied by hand and tested before they are committed.

### Checklist before going live

- [ ] Supabase: **Confirm email** is on, **Site URL** and **Redirect URLs** point at your domain.
- [ ] The schema came from `supabase db push --remote` (that is what creates the database rules). In
      *Database > Tables*, every table shows **RLS enabled**.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` are set only in Vercel (and GitHub secrets),
      never in a `NEXT_PUBLIC_` variable or in the repository. `CRON_SECRET` is long and random
      (for example `openssl rand -hex 32`).
- [ ] *Authentication > Sign In / Providers > Email*: **Secure password change** is on (a password
      change from a session older than 24 hours then needs a code from the inbox).
- [ ] The site is served over HTTPS (Vercel does this automatically).
- [ ] If a project's keys were ever shared or committed, rotate them in *Project Settings > API Keys*.
- [ ] Optional: in *Authentication > Rate Limits*, keep the defaults or lower them; enable CAPTCHA
      in *Authentication > Attack Protection* if you get spam sign-ups.

## How it works

```
RSS / Atom feeds ──> lib/ingestion (fetch, parse, normalize, dedupe, find images)
                        │  service-role key, one bulk insert per source
                        ▼
                 Supabase Postgres ──> RPC functions (get_feed, get_article, ...)
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
  protects private pages. `/auth/callback` (PKCE) completes Google sign-in and
  default email links; `/auth/confirm` (token hash) completes the links from `supabase/templates`.

### Project structure

```
app/                     routes (App Router)
  (auth)/                login, signup, password reset, email confirmation pages
  (main)/                landing page, feed, article, saved, onboarding, profile
  (admin)/admin/         dashboard, sources, users
  actions/               server actions (profile, onboarding, admin)
  api/cron/ingest/       scheduled ingestion endpoint
  auth/                  callback + confirm route handlers
components/              UI (ui/ = shadcn-style primitives)
lib/                     Supabase clients, ingestion, helpers, types
scripts/                 ingest.ts, make-admin.ts
supabase/                config, migrations, email templates
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

See [CHANGELOG.md](CHANGELOG.md) for what changed in version 2.0.
