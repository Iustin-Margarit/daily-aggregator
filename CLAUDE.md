# The Daily Aggregator - notes for Claude

A personalised news aggregator styled as an old-school newspaper. Next.js 16 (App Router) +
Supabase. Originally a 2025 student project written with Gemini; rebuilt in Nov 2026.
**Read [docs/REVIVAL.md](docs/REVIVAL.md) first**: it records what was done, why, and what is left.

## Hard rules

- **Never `git commit` or `git push`** (the owner must stay the only contributor; they review every
  diff and commit and push by hand). Other git commands - status, diff, staging, `git rm --cached` -
  are fine.
- **Never `supabase db reset` the local database**: it holds the owner's own account (username
  `ggg`). Patch it with SQL instead, after a `pg_dump` backup. (CLI v3 targets the local database
  by default; `--remote` means the cloud.)
- **Migrations are now live on the hosted project.** Since 2026-11-13 the three baseline files in
  `supabase/migrations` are applied in the cloud. Do not edit them any more: every schema change is
  a new migration file (`supabase migration new <name>`), applied locally with
  `supabase migration up` and in the cloud with `supabase db push --remote`
  (without `--remote`, CLI v3 pushes to the local database).
- **New database objects start locked** (default privileges revoked in 2.2.1). Every migration
  that creates a table or function must `grant` what `anon` / `authenticated` need, and enable
  RLS on new tables. Functions act on `auth.uid()`, never on a user id from the browser.
- Use the installed **`supabase` CLI v3** (scoop; `scoop update supabase`), not `npx supabase`.
- The local database runs **Postgres 15**, like the cloud (`major_version = 15` in
  `supabase/config.toml`; never change it: the data volume is a Postgres 15 one). `supabase link`
  caches the cloud's service versions in `supabase/.temp/`; if `supabase start` fails to pull
  `storage-api:custom-metadata` (a hosted-only build), delete `supabase/.temp/storage-version`.
- The machine runs **Node 26**; the project needs **Node 22.12+** (`engines`). `@types/node` stays on
  22 (the lowest supported version) so code does not use newer Node APIs by accident.
- **Next.js 16**: the request hook is `proxy.ts` (it was `middleware.ts`), with the session and CSP
  code in `lib/supabase/proxy.ts`. Turbopack is the default for `dev` and `build`. Two React
  lint rules (`react-hooks/set-state-in-effect`, `react-hooks/refs`) are warnings for now; fix
  the warnings when rewriting a component and turn them back into errors when none are left.
- **Tailwind CSS 4**: there is no `tailwind.config.ts`; the theme lives in `@theme` in
  `styles/globals.css`. next/font variables are `--font-playfair`, `--font-source-serif` and
  `--font-oswald` (never name them `--font-display/serif/label`: those are Tailwind's own theme names).
- Don't run Prettier (there is no config; it rewrites the code style).
- Never put the cloud keys, the database password or `CRON_SECRET` in a tracked file.

## Product rules (from the owner)

- It is a complete overhaul: keep the core idea, don't keep old features just because they existed.
- Simple enough for people of all ages: labelled buttons, plain words, few options per screen.
- Newspaper tone is welcome (Front Page, Sections, Letters to the Editor) but **never "subscribe" /
  "subscriber"**: people would think it costs money.
- Photos in normal colour; the feed is paginated (30 stories per page).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 (the owner usually has this running - don't take the port) |
| `npm run check` | Typecheck + lint + all tests. Run before reporting work as done |
| `npm run ingest` | Fetch all enabled feeds into the database in `.env.local` |
| `npm run db:start` / `db:stop` | Local Supabase stack (project id `agregator-stiri`) |
| `npm run db:types` | Regenerate `lib/database.types.ts` after a schema change |
| `npm run make-admin -- email` | Promote a local account to admin |

Local ports: API 58321, DB 58322, Studio 58323, mail (Mailpit) 58324. DB container:
`supabase_db_agregator-stiri`.

## Testing in a real browser

- Test on another port so the owner's dev server is not disturbed:
  `NEXT_DIST_DIR=.next-preview npx next build && NEXT_DIST_DIR=.next-preview npx next start -p 3100`.
  This rewrites `tsconfig.json` and `next-env.d.ts`: back them up first, restore them afterwards,
  then delete `.next-preview` and stop the server (kill whatever still listens on 3100).
- Playwright scripts are not part of the repo; use `playwright-core` with the installed Chrome.
- Test accounts: `readerNNNNN@example.com`; delete them afterwards
  (`delete from auth.users where email ~ '^reader[0-9]+@example\.com$'`).
- After `supabase stop/start` or a reset, realtime can return 502 for a moment; restart the stack.

## Environment files

- `.env.local` - local stack (public demo keys). In use by default.
- `.env.cloud.local` - hosted project keys (ref `zjxzzecffppaffrdhmds`, Frankfurt, free tier).
  Run a script against the cloud with
  `(set -a; . ./.env.cloud.local; set +a; npm run ingest)`.
- Both are git-ignored. `.env.example` documents every variable.

## Machine quirks

- 15 GB RAM: Docker/WSL fails with "Insufficient system resources" when games (Minecraft) are
  open. Keep test servers short-lived.
- Windows + Git Bash. In Node edit scripts use `split/join` or a replacement *function*
  (`String.replace` turns `$$` into `$`, which breaks SQL bodies).
