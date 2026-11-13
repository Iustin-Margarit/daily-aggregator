-- =============================================================================
-- Personalized News Aggregator - baseline schema
--
-- This migration replaces the ~70 incremental migrations written in 2025
-- (they are still available in git history). It creates the full schema in one
-- readable place: tables, indexes, row level security (RLS) and triggers.
--
--   * RPC functions used by the app  -> 20261112000100_api_functions.sql
--   * Categories + RSS sources        -> 20261112000200_reference_data.sql
-- =============================================================================

create extension if not exists unaccent with schema extensions;

-- -----------------------------------------------------------------------------
-- Generic helpers
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Turns "Café opens in São Paulo!" into "cafe-opens-in-sao-paulo".
create or replace function public.slugify(p_text text)
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(
    trim(both '-' from left(
      trim(both '-' from regexp_replace(
        lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_text, ''))),
        '[^a-z0-9]+', '-', 'g')),
      80)),
    '');
$$;

-- -----------------------------------------------------------------------------
-- Content: categories, sources, articles
-- -----------------------------------------------------------------------------

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  constraint categories_name_length check (char_length(btrim(name)) between 2 and 40)
);
create unique index categories_name_key on public.categories (lower(name));
comment on table public.categories is 'News topics (Technology, Business, ...). Every source belongs to one category.';

create table public.sources (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  rss_url               text not null,
  website_url           text,
  description           text,
  category_id           uuid not null references public.categories (id) on delete restrict,
  is_enabled            boolean not null default true,
  last_fetched_at       timestamptz,
  last_success_at       timestamptz,
  last_error            text,
  consecutive_failures  integer not null default 0,
  last_item_count       integer,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint sources_name_length check (char_length(btrim(name)) between 2 and 80),
  constraint sources_rss_url_format check (rss_url ~* '^https?://'),
  constraint sources_website_url_format check (website_url is null or website_url ~* '^https?://')
);
create unique index sources_name_key on public.sources (lower(name));
create unique index sources_rss_url_key on public.sources (rss_url);
create index sources_category_id_idx on public.sources (category_id);
comment on table public.sources is 'RSS/Atom feeds that the ingestion job reads. Disabled sources are skipped and hidden from feeds.';

create table public.articles (
  id             uuid primary key default gen_random_uuid(),
  source_id      uuid not null references public.sources (id) on delete cascade,
  title          text not null,
  summary        text,
  url            text not null,
  slug           text not null,
  image_url      text,
  author         text,
  published_at   timestamptz not null default now(),
  like_count     integer not null default 0,
  comment_count  integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint articles_title_length check (char_length(title) between 1 and 500),
  constraint articles_url_format check (url ~* '^https?://'),
  constraint articles_image_url_format check (image_url is null or image_url ~* '^https?://')
);
create unique index articles_url_key on public.articles (url);
create unique index articles_slug_key on public.articles (slug);
create index articles_published_at_idx on public.articles (published_at desc);
create index articles_source_published_idx on public.articles (source_id, published_at desc);
create index articles_created_at_idx on public.articles (created_at);
comment on column public.articles.like_count is 'Maintained by a trigger on public.likes.';
comment on column public.articles.comment_count is 'Maintained by a trigger on public.comments.';

-- Slugs are generated from the title plus a short hash of the URL, so they are
-- readable and unique without any retry loop.
create or replace function public.set_article_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := coalesce(public.slugify(new.title), 'article') || '-' || substr(md5(new.url), 1, 8);
  end if;
  return new;
end;
$$;

create trigger articles_set_slug before insert on public.articles
  for each row execute function public.set_article_slug();
create trigger articles_set_updated_at before update on public.articles
  for each row execute function public.set_updated_at();
create trigger sources_set_updated_at before update on public.sources
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Users: profiles and topic preferences
-- -----------------------------------------------------------------------------

create table public.profiles (
  id                        uuid primary key references auth.users (id) on delete cascade,
  username                  text not null,
  role                      text not null default 'user',
  has_completed_onboarding  boolean not null default false,
  avatar_color              text not null default '#1E3A5F',
  banner_color              text not null default '#8B1E1E',
  font_size                 text not null default 'medium',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_.-]{3,30}$'),
  constraint profiles_role_check check (role in ('user', 'admin')),
  constraint profiles_avatar_color_format check (avatar_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint profiles_banner_color_format check (banner_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint profiles_font_size_check check (font_size in ('small', 'medium', 'large'))
);
create unique index profiles_username_key on public.profiles (lower(username));
comment on column public.profiles.role is 'user | admin. Only admins (or the service role) can change it - see protect_profile_columns().';

create table public.user_preferred_categories (
  user_id      uuid not null references auth.users (id) on delete cascade,
  category_id  uuid not null references public.categories (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, category_id)
);
create index user_preferred_categories_category_idx on public.user_preferred_categories (category_id);

-- Needed by RLS policies below. SECURITY DEFINER so it can read profiles
-- without recursing into the profiles policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Names that could be used to pose as staff in the letters under a story.
-- Punctuation is ignored, so "admin_" and "the.editor" are reserved too.
create or replace function public.is_reserved_username(p_username text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(regexp_replace(coalesce(p_username, ''), '[^A-Za-z0-9]', '', 'g')) = any (array[
    'admin', 'administrator', 'moderator', 'mod', 'editor', 'editors', 'theeditor', 'editorinchief',
    'staff', 'support', 'help', 'security', 'system', 'root', 'owner', 'official',
    'newsroom', 'dailyaggregator', 'thedailyaggregator'
  ]);
$$;

-- Users may edit their own profile, but never their role. This closes the
-- privilege-escalation hole where any user could run
-- `update profiles set role = 'admin'` from the browser console.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jwt_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
begin
  if new.id is distinct from old.id then
    raise exception 'Profile id cannot be changed' using errcode = '42501';
  end if;

  if new.role is distinct from old.role
     and v_jwt_role in ('anon', 'authenticated')
     and not public.is_admin() then
    raise exception 'Only administrators can change roles'
      using errcode = '42501';
  end if;

  if new.username is distinct from old.username
     and public.is_reserved_username(new.username)
     and v_jwt_role in ('anon', 'authenticated')
     and not public.is_admin() then
    raise exception 'USERNAME_RESERVED'
      using errcode = 'P0001', detail = 'That username is reserved. Please choose another one.';
  end if;

  if old.role = 'admin' and new.role <> 'admin'
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'Cannot remove the last administrator' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger profiles_protect_columns before update on public.profiles
  for each row execute function public.protect_profile_columns();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Interactions: likes, comments, muted sources, hidden articles
-- -----------------------------------------------------------------------------

create table public.likes (
  user_id     uuid not null references auth.users (id) on delete cascade,
  article_id  uuid not null references public.articles (id) on delete cascade,
  liked_at    timestamptz not null default now(),
  primary key (user_id, article_id)
);
create index likes_article_id_idx on public.likes (article_id);

create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid not null references public.articles (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint comments_content_length check (char_length(btrim(content)) between 1 and 2000)
);
create index comments_article_created_idx on public.comments (article_id, created_at);
create index comments_user_created_idx on public.comments (user_id, created_at desc);

create trigger comments_set_updated_at before update on public.comments
  for each row execute function public.set_updated_at();

-- Stops one account from flooding the letters: 5 per minute, 60 per hour.
create or replace function public.enforce_comment_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last_minute integer;
  v_last_hour integer;
begin
  select count(*) filter (where created_at > now() - interval '1 minute'), count(*)
    into v_last_minute, v_last_hour
    from public.comments
   where user_id = new.user_id and created_at > now() - interval '1 hour';

  if v_last_minute >= 5 or v_last_hour >= 60 then
    raise exception 'COMMENT_RATE_LIMIT'
      using errcode = 'P0001', detail = 'You are writing letters very quickly. Please wait a moment and try again.';
  end if;
  return new;
end;
$$;

create trigger comments_rate_limit before insert on public.comments
  for each row execute function public.enforce_comment_rate_limit();

create table public.muted_sources (
  user_id     uuid not null references auth.users (id) on delete cascade,
  source_id   uuid not null references public.sources (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, source_id)
);
create index muted_sources_source_id_idx on public.muted_sources (source_id);

create table public.hidden_articles (
  user_id     uuid not null references auth.users (id) on delete cascade,
  article_id  uuid not null references public.articles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, article_id)
);
create index hidden_articles_article_id_idx on public.hidden_articles (article_id);

-- Denormalised counters so feeds can show like/comment counts without letting
-- everyone read everyone else's likes.
create or replace function public.sync_article_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.articles set like_count = like_count + 1 where id = new.article_id;
  else
    update public.articles set like_count = greatest(like_count - 1, 0) where id = old.article_id;
  end if;
  return null;
end;
$$;

create or replace function public.sync_article_comment_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.articles set comment_count = comment_count + 1 where id = new.article_id;
  else
    update public.articles set comment_count = greatest(comment_count - 1, 0) where id = old.article_id;
  end if;
  return null;
end;
$$;

create trigger likes_sync_count after insert or delete on public.likes
  for each row execute function public.sync_article_like_count();
create trigger comments_sync_count after insert or delete on public.comments
  for each row execute function public.sync_article_comment_count();

-- -----------------------------------------------------------------------------
-- Saved articles ("clippings") and folders
-- -----------------------------------------------------------------------------

create table public.saved_folders (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint saved_folders_name_length check (char_length(btrim(name)) between 1 and 25)
);
create unique index saved_folders_user_name_key on public.saved_folders (user_id, lower(name));

create table public.saved_articles (
  user_id     uuid not null references auth.users (id) on delete cascade,
  article_id  uuid not null references public.articles (id) on delete cascade,
  folder_id   uuid references public.saved_folders (id) on delete set null,
  is_read     boolean not null default false,
  notes       text,
  saved_at    timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, article_id),
  constraint saved_articles_notes_length check (notes is null or char_length(notes) <= 2000)
);
create index saved_articles_article_id_idx on public.saved_articles (article_id);
create index saved_articles_user_saved_at_idx on public.saved_articles (user_id, saved_at desc);
create index saved_articles_folder_id_idx on public.saved_articles (folder_id);

create trigger saved_folders_set_updated_at before update on public.saved_folders
  for each row execute function public.set_updated_at();
create trigger saved_articles_set_updated_at before update on public.saved_articles
  for each row execute function public.set_updated_at();

-- Saved articles are kept forever (they are skipped by the 30-day cleanup), so a
-- generous fixed cap protects the database from runaway clients. Readers never
-- see a quota; they only hear about it if they ever reach 1000.
create or replace function public.enforce_saved_articles_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Lock the profile row so concurrent saves are serialised per user.
  perform 1 from public.profiles where id = new.user_id for update;

  if (select count(*) from public.saved_articles where user_id = new.user_id) >= 1000 then
    raise exception 'SAVED_LIMIT_REACHED'
      using errcode = 'P0001',
            detail = 'You can keep up to 1000 clippings. Remove a few to save more.';
  end if;
  return new;
end;
$$;

create trigger saved_articles_enforce_limit before insert on public.saved_articles
  for each row execute function public.enforce_saved_articles_limit();

create or replace function public.enforce_saved_folders_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.saved_folders where user_id = new.user_id) >= 100 then
    raise exception 'FOLDER_LIMIT_REACHED'
      using errcode = 'P0001', detail = 'You can have up to 100 folders.';
  end if;
  return new;
end;
$$;

create trigger saved_folders_enforce_limit before insert on public.saved_folders
  for each row execute function public.enforce_saved_folders_limit();

-- -----------------------------------------------------------------------------
-- Ingestion bookkeeping
-- -----------------------------------------------------------------------------

create table public.ingestion_runs (
  id                 uuid primary key default gen_random_uuid(),
  trigger            text not null,
  status             text not null default 'running',
  started_at         timestamptz not null default now(),
  finished_at        timestamptz,
  sources_total      integer,
  sources_succeeded  integer,
  sources_failed     integer,
  items_found        integer,
  articles_inserted  integer,
  articles_deleted   integer,
  errors             jsonb not null default '[]'::jsonb,
  duration_ms        integer,
  constraint ingestion_runs_trigger_check check (trigger in ('cron', 'admin', 'auto', 'cli')),
  constraint ingestion_runs_status_check check (status in ('running', 'success', 'partial', 'failed'))
);
create index ingestion_runs_started_at_idx on public.ingestion_runs (started_at desc);

-- -----------------------------------------------------------------------------
-- New users: a profile row with a unique username
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base text;
  v_username text;
  v_attempt integer := 0;
begin
  -- Username: requested one (sign-up metadata) or the e-mail prefix, cleaned up.
  v_base := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'username'), ''),
                     split_part(coalesce(new.email, ''), '@', 1));
  v_base := left(regexp_replace(v_base, '[^A-Za-z0-9_.-]', '', 'g'), 24);
  if char_length(v_base) < 3 or public.is_reserved_username(v_base) then
    v_base := left(v_base, 17) || '_reader';
  end if;
  v_username := v_base;

  loop
    begin
      insert into public.profiles (id, username) values (new.id, v_username);
      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt > 25 then
        raise;
      end if;
      v_username := left(v_base, 24) || (1000 + floor(random() * 9000))::int::text;
    end;
  end loop;

  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Row level security
-- (select auth.uid()) is used instead of auth.uid() so Postgres evaluates it
-- once per statement instead of once per row.
-- -----------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.sources enable row level security;
alter table public.articles enable row level security;
alter table public.profiles enable row level security;
alter table public.user_preferred_categories enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.muted_sources enable row level security;
alter table public.hidden_articles enable row level security;
alter table public.saved_folders enable row level security;
alter table public.saved_articles enable row level security;
alter table public.ingestion_runs enable row level security;

-- Categories & sources: public read, admin write.
create policy "Categories are public" on public.categories
  for select to anon, authenticated using (true);
create policy "Admins manage categories" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Sources are public" on public.sources
  for select to anon, authenticated using (true);
create policy "Admins manage sources" on public.sources
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Articles: public read (shared links work for logged-out visitors).
-- Inserts happen through the service role during ingestion.
create policy "Articles are public" on public.articles
  for select to anon, authenticated using (true);
create policy "Admins delete articles" on public.articles
  for delete to authenticated using (public.is_admin());

-- Profiles: users see and edit their own row; admins see and edit all rows.
create policy "Read own profile or admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy "Update own profile or admin" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

create policy "Manage own topic preferences" on public.user_preferred_categories
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Likes are private; counts are exposed through articles.like_count.
create policy "Manage own likes" on public.likes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Comments are public" on public.comments
  for select to anon, authenticated using (true);
create policy "Post own comments" on public.comments
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Edit own comments" on public.comments
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Delete own comments or admin" on public.comments
  for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy "Manage own muted sources" on public.muted_sources
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Manage own hidden articles" on public.hidden_articles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Manage own folders" on public.saved_folders
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Saved articles may only point at the user's own folders.
create policy "Read own saved articles" on public.saved_articles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Save articles" on public.saved_articles
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (folder_id is null or exists (
      select 1 from public.saved_folders f
      where f.id = folder_id and f.user_id = (select auth.uid())))
  );
create policy "Update own saved articles" on public.saved_articles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (folder_id is null or exists (
      select 1 from public.saved_folders f
      where f.id = folder_id and f.user_id = (select auth.uid())))
  );
create policy "Remove own saved articles" on public.saved_articles
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "Admins read ingestion runs" on public.ingestion_runs
  for select to authenticated using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Table privileges (defence in depth on top of row level security)
--
-- Supabase grants ALL on every table to the anon and authenticated roles and
-- relies on RLS alone. The grants are narrowed here so that a mistake in a
-- policy cannot expose more than the app needs.
-- -----------------------------------------------------------------------------

revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
-- Visitors who are not logged in can only read.
revoke insert, update, delete on all tables in schema public from anon;

-- Comments: the client chooses the article and the text. It cannot set the id
-- or the timestamps, and it can only change the text afterwards.
revoke insert, update on public.comments from authenticated;
grant insert (article_id, user_id, content) on public.comments to authenticated;
grant update (content) on public.comments to authenticated;

-- Profiles are created by a trigger and removed together with the auth user.
-- "role" is writable here so admins can change it; protect_profile_columns()
-- rejects the change for everyone else.
revoke insert, update, delete on public.profiles from authenticated;
grant update (username, avatar_color, banner_color, font_size, has_completed_onboarding, role)
  on public.profiles to authenticated;

-- Sources: everyone sees what the feed needs. Feed URLs and fetch diagnostics
-- (last error, failure counts) are for admins only, through admin_list_sources().
revoke select on public.sources from anon, authenticated;
grant select (id, name, website_url, description, category_id, is_enabled)
  on public.sources to anon, authenticated;

-- Written only by the ingestion job (service role).
revoke insert, update on public.articles from authenticated;
revoke insert, update, delete on public.ingestion_runs from authenticated;

-- -----------------------------------------------------------------------------
-- Realtime: live comment updates on the article page
-- -----------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.comments;
  end if;
end;
$$;
