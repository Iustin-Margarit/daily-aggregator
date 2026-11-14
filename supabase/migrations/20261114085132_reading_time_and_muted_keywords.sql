-- =============================================================================
-- Reading time and muted keywords (2026-11-14)
--
--   * articles.reading_minutes: how long the original story takes to read,
--     counted by the ingestion from the words on the story's own page (the
--     feeds carry only a summary). null = not measured yet, 0 = could not be
--     measured (the page was blocked, a video, or too short to say).
--   * public.muted_keywords: words a reader never wants on their front page.
--     The feed leaves out every story whose headline or summary contains one
--     of them as a whole word. Private: only the reader can see their list.
--
-- get_feed, get_article and get_saved_articles return reading_minutes, so
-- they are dropped and created again (a return type cannot change in place)
-- and granted again (new functions start locked since security round two).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Reading time
-- -----------------------------------------------------------------------------

alter table public.articles
  add column reading_minutes smallint,
  add constraint articles_reading_minutes_range check (reading_minutes between 0 and 600);

comment on column public.articles.reading_minutes is
  'Minutes to read the original story, counted at ingestion from its page. null = not measured yet, 0 = unknown.';

-- -----------------------------------------------------------------------------
-- 2. Muted keywords
-- -----------------------------------------------------------------------------

create table public.muted_keywords (
  user_id     uuid not null references auth.users (id) on delete cascade,
  keyword     text not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, keyword),
  -- Lower case, 2 to 40 characters, letters and digits with spaces, apostrophes,
  -- '&', '.' and '-' inside: enough for names and phrases, and safe to put in a
  -- regular expression (only '.' needs escaping, see get_feed).
  constraint muted_keywords_format check (
    keyword = lower(btrim(keyword))
    and char_length(keyword) between 2 and 40
    and keyword ~ '^[[:alnum:]]([[:alnum:] ''’&.-]*[[:alnum:]])?$'
  )
);

comment on table public.muted_keywords is 'Words a reader never wants on their front page (get_feed leaves those stories out).';

alter table public.muted_keywords enable row level security;

create policy "Read own muted keywords" on public.muted_keywords
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Add own muted keywords" on public.muted_keywords
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Remove own muted keywords" on public.muted_keywords
  for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, delete on public.muted_keywords to authenticated;
grant all on public.muted_keywords to service_role;

-- At most 50 keywords per reader, so the feed's filter stays cheap.
create function public.limit_muted_keywords()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.muted_keywords k where k.user_id = new.user_id) >= 50 then
    raise exception 'You can mute at most 50 words.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke execute on function public.limit_muted_keywords() from public;

create trigger muted_keywords_limit before insert on public.muted_keywords
  for each row execute function public.limit_muted_keywords();

-- -----------------------------------------------------------------------------
-- 3. Feed, story page and saved stories, with the reading time
-- -----------------------------------------------------------------------------

drop function if exists public.get_feed(uuid[], uuid[], text, timestamptz, text, integer, integer, timestamptz);
drop function if exists public.get_article(text);
drop function if exists public.get_saved_articles();

-- Returns one page of the news feed for the current user. Every row carries
-- total_count (all matching stories) so the app can show page numbers.
--   p_category_ids / p_source_ids : null or empty = no filter
--   p_search                      : every word must appear in title or summary
--   p_since                       : oldest published_at to include (default: 30 days)
--   p_sort                        : 'latest' or 'for_you'
--   p_as_of                       : snapshot time, keeps pagination stable while
--                                   new articles are being ingested
-- Stories from muted sources, hidden stories and stories that contain one of
-- the reader's muted keywords (as a whole word) are left out.
-- 'for_you' ranks by recency boosted by the user's preferred topics and by the
-- categories and sources of the stories they saved.
create function public.get_feed(
  p_category_ids uuid[] default null,
  p_source_ids uuid[] default null,
  p_search text default null,
  p_since timestamptz default null,
  p_sort text default 'latest',
  p_limit integer default 24,
  p_offset integer default 0,
  p_as_of timestamptz default null
)
returns table (
  id uuid,
  title text,
  summary text,
  url text,
  slug text,
  image_url text,
  author text,
  published_at timestamptz,
  reading_minutes smallint,
  source_id uuid,
  source_name text,
  category_id uuid,
  category_name text,
  is_saved boolean,
  total_count bigint
)
language sql
stable
set search_path = ''
as $$
  with params as (
    select
      (select auth.uid()) as uid,
      coalesce(p_as_of, now()) as as_of,
      case when p_sort = 'for_you' then 'for_you' else 'latest' end as sort,
      least(greatest(coalesce(p_limit, 24), 1), 60) as lim,
      greatest(coalesce(p_offset, 0), 0) as off,
      -- At most 100 characters and 8 words, so a search cannot be made arbitrarily expensive.
      coalesce(
        (select array_agg(t.w)
           from (select w
                   from regexp_split_to_table(lower(left(btrim(coalesce(p_search, '')), 100)), '\s+') as w
                  where w <> ''
                  limit 8) t),
        '{}'::text[]) as words
  ),
  -- The reader's muted keywords as whole-word patterns ('.' is the only
  -- character the table allows that means something in a regular expression).
  muted_words as (
    select '\m' || replace(k.keyword, '.', '\.') || '\M' as pattern
      from public.muted_keywords k
     where k.user_id = (select p.uid from params p)
  ),
  signals as (
    select a.source_id, s.category_id
      from public.saved_articles sa
      join public.articles a on a.id = sa.article_id
      join public.sources s on s.id = a.source_id
     where sa.user_id = (select p.uid from params p)
       and (select p.sort from params p) = 'for_you'
  ),
  category_affinity as (
    select sg.category_id, count(*)::float8 / max(count(*)) over () as affinity
      from signals sg group by sg.category_id
  ),
  source_affinity as (
    select sg.source_id, count(*)::float8 / max(count(*)) over () as affinity
      from signals sg group by sg.source_id
  ),
  preferred as (
    select upc.category_id
      from public.user_preferred_categories upc
     where upc.user_id = (select p.uid from params p)
  ),
  candidates as (
    select a.id, a.title, a.summary, a.url, a.slug, a.image_url, a.author, a.published_at,
           a.reading_minutes, a.source_id, s.name as source_name, s.category_id, c.name as category_name
      from public.articles a
      join public.sources s on s.id = a.source_id and s.is_enabled
      join public.categories c on c.id = s.category_id
      cross join params p
     where a.created_at <= p.as_of
       and a.published_at >= coalesce(p_since, p.as_of - interval '30 days')
       and (p_category_ids is null or cardinality(p_category_ids) = 0 or s.category_id = any (p_category_ids))
       and (p_source_ids is null or cardinality(p_source_ids) = 0 or a.source_id = any (p_source_ids))
       and (p.uid is null or not exists (
             select 1 from public.muted_sources m where m.user_id = p.uid and m.source_id = a.source_id))
       and (p.uid is null or not exists (
             select 1 from public.hidden_articles h where h.user_id = p.uid and h.article_id = a.id))
       and not exists (
             select 1 from muted_words mw
              where lower(a.title || ' ' || coalesce(a.summary, '')) ~ mw.pattern)
       and not exists (
             select 1 from unnest(p.words) as w
              where strpos(lower(a.title || ' ' || coalesce(a.summary, '')), w) = 0)
  )
  select x.id, x.title, x.summary, x.url, x.slug, x.image_url, x.author, x.published_at, x.reading_minutes,
         x.source_id, x.source_name, x.category_id, x.category_name,
         exists (select 1 from public.saved_articles sv where sv.user_id = p.uid and sv.article_id = x.id) as is_saved,
         count(*) over () as total_count
    from candidates x
    cross join params p
    left join category_affinity ca on ca.category_id = x.category_id
    left join source_affinity sa on sa.source_id = x.source_id
   order by
     case when p.sort = 'for_you' then
       exp(-greatest(extract(epoch from (p.as_of - x.published_at)) / 3600.0, 0) / 30.0)
       * (1.0
          + 0.6 * coalesce(ca.affinity, 0)
          + 0.4 * coalesce(sa.affinity, 0)
          + case when x.category_id in (select pr.category_id from preferred pr) then 0.35 else 0 end)
     end desc nulls last,
     x.published_at desc,
     x.id
   limit (select p.lim from params p)
  offset (select p.off from params p);
$$;

create function public.get_article(p_slug_or_id text)
returns table (
  id uuid,
  title text,
  summary text,
  url text,
  slug text,
  image_url text,
  author text,
  published_at timestamptz,
  reading_minutes smallint,
  source_id uuid,
  source_name text,
  source_website_url text,
  category_id uuid,
  category_name text,
  is_saved boolean
)
language plpgsql
stable
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_id uuid;
  v_uid uuid := auth.uid();
begin
  if p_slug_or_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_id := p_slug_or_id::uuid;
  else
    select a.id into v_id from public.articles a where a.slug = p_slug_or_id;
  end if;

  if v_id is null then
    return;
  end if;

  return query
  select a.id, a.title, a.summary, a.url, a.slug, a.image_url, a.author, a.published_at, a.reading_minutes,
         a.source_id, s.name, s.website_url, s.category_id, c.name,
         exists (select 1 from public.saved_articles sv where sv.user_id = v_uid and sv.article_id = a.id)
    from public.articles a
    join public.sources s on s.id = a.source_id
    join public.categories c on c.id = s.category_id
   where a.id = v_id;
end;
$$;

create function public.get_saved_articles()
returns table (
  article_id uuid,
  title text,
  summary text,
  url text,
  slug text,
  image_url text,
  published_at timestamptz,
  reading_minutes smallint,
  source_id uuid,
  source_name text,
  source_enabled boolean,
  category_id uuid,
  category_name text,
  folder_id uuid,
  is_read boolean,
  notes text,
  saved_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  select a.id, a.title, a.summary, a.url, a.slug, a.image_url, a.published_at, a.reading_minutes,
         a.source_id, s.name, s.is_enabled, s.category_id, c.name,
         sa.folder_id, sa.is_read, sa.notes, sa.saved_at
    from public.saved_articles sa
    join public.articles a on a.id = sa.article_id
    join public.sources s on s.id = a.source_id
    join public.categories c on c.id = s.category_id
   where sa.user_id = (select auth.uid())
   order by sa.saved_at desc;
$$;

revoke execute on function public.get_feed(uuid[], uuid[], text, timestamptz, text, integer, integer, timestamptz) from public;
revoke execute on function public.get_article(text) from public;
revoke execute on function public.get_saved_articles() from public;

grant execute on function public.get_feed(uuid[], uuid[], text, timestamptz, text, integer, integer, timestamptz) to anon, authenticated;
grant execute on function public.get_article(text) to anon, authenticated;
grant execute on function public.get_saved_articles() to authenticated;
