-- =============================================================================
-- A personal paper, not a social network (2026-11-14)
--
-- The owner's decision: the site is a calm, personal reading paper. The public
-- social features are removed completely:
--   * Letters to the editor (public.comments, their rate limit and realtime),
--   * Endorse / likes (public.likes) and the public like and letter counts on
--     every article (articles.like_count, articles.comment_count).
-- Personal reading features stay: saved stories, folders, notes, sections,
-- hidden stories and muted sources.
--
-- The "For you" edition now learns only from the reader's sections and the
-- stories they saved.
--
-- Functions whose result columns change are dropped and created again (Postgres
-- cannot change a function's return type in place). New functions start locked
-- (security round two), so each one is granted again below.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Functions that return or read likes and letters
-- -----------------------------------------------------------------------------

drop function if exists public.get_article_comments(uuid);
drop function if exists public.get_feed(uuid[], uuid[], text, timestamptz, text, integer, integer, timestamptz);
drop function if exists public.get_article(text);
drop function if exists public.get_saved_articles();
drop function if exists public.admin_list_users();

-- -----------------------------------------------------------------------------
-- 2. Tables, counters and their triggers
-- (Dropping the tables also drops their triggers, policies, grants and their
-- place in the realtime publication.)
-- -----------------------------------------------------------------------------

drop table if exists public.likes;
drop table if exists public.comments;

drop function if exists public.sync_article_like_count();
drop function if exists public.sync_article_comment_count();
drop function if exists public.enforce_comment_rate_limit();

alter table public.articles
  drop column if exists like_count,
  drop column if exists comment_count;

-- -----------------------------------------------------------------------------
-- 3. Feed, story page and saved stories, without likes and letters
-- -----------------------------------------------------------------------------

-- Returns one page of the news feed for the current user. Every row carries
-- total_count (all matching stories) so the app can show page numbers.
--   p_category_ids / p_source_ids : null or empty = no filter
--   p_search                      : every word must appear in title or summary
--   p_since                       : oldest published_at to include (default: 30 days)
--   p_sort                        : 'latest' or 'for_you'
--   p_as_of                       : snapshot time, keeps pagination stable while
--                                   new articles are being ingested
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
           a.source_id, s.name as source_name, s.category_id, c.name as category_name
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
             select 1 from unnest(p.words) as w
              where strpos(lower(a.title || ' ' || coalesce(a.summary, '')), w) = 0)
  )
  select x.id, x.title, x.summary, x.url, x.slug, x.image_url, x.author, x.published_at,
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
  select a.id, a.title, a.summary, a.url, a.slug, a.image_url, a.author, a.published_at,
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
  select a.id, a.title, a.summary, a.url, a.slug, a.image_url, a.published_at,
         a.source_id, s.name, s.is_enabled, s.category_id, c.name,
         sa.folder_id, sa.is_read, sa.notes, sa.saved_at
    from public.saved_articles sa
    join public.articles a on a.id = sa.article_id
    join public.sources s on s.id = a.source_id
    join public.categories c on c.id = s.category_id
   where sa.user_id = (select auth.uid())
   order by sa.saved_at desc;
$$;

-- -----------------------------------------------------------------------------
-- 4. Admin pages
-- -----------------------------------------------------------------------------

create function public.admin_list_users()
returns table (
  id uuid,
  email text,
  username text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  has_completed_onboarding boolean,
  saved_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'Only administrators can list users' using errcode = '42501';
  end if;

  return query
  select p.id, u.email::text, p.username, p.role, u.created_at, u.last_sign_in_at,
         p.has_completed_onboarding,
         (select count(*)::int from public.saved_articles sa where sa.user_id = p.id)
    from public.profiles p
    join auth.users u on u.id = p.id
   order by u.created_at desc;
end;
$$;

-- The "most liked" list becomes "most saved": how many readers saved each story.
create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can view statistics' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'users_total',        (select count(*) from public.profiles),
    'users_new_7d',       (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'admins_total',       (select count(*) from public.profiles where role = 'admin'),
    'articles_total',     (select count(*) from public.articles),
    'articles_24h',       (select count(*) from public.articles where created_at > now() - interval '24 hours'),
    'sources_total',      (select count(*) from public.sources),
    'sources_enabled',    (select count(*) from public.sources where is_enabled),
    'sources_failing',    (select count(*) from public.sources where is_enabled and consecutive_failures > 0),
    'saves_total',        (select count(*) from public.saved_articles),
    'articles_by_category', coalesce((
      select jsonb_agg(jsonb_build_object('name', x.name, 'count', x.n) order by x.n desc)
        from (select c.name, count(a.id) as n
                from public.categories c
                left join public.sources s on s.category_id = c.id
                left join public.articles a on a.source_id = s.id
               group by c.name) x
    ), '[]'::jsonb),
    'top_articles', coalesce((
      select jsonb_agg(jsonb_build_object('title', t.title, 'slug', t.slug, 'saves', t.saves) order by t.saves desc)
        from (select a.title, a.slug, count(*) as saves
                from public.saved_articles sa
                join public.articles a on a.id = sa.article_id
               group by a.id, a.title, a.slug
               order by count(*) desc, max(sa.saved_at) desc
               limit 5) t
    ), '[]'::jsonb),
    'recent_runs', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.started_at desc)
        from (select * from public.ingestion_runs order by started_at desc limit 10) r
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Privileges (new functions start locked; see security round two)
-- -----------------------------------------------------------------------------

revoke execute on function public.get_feed(uuid[], uuid[], text, timestamptz, text, integer, integer, timestamptz) from public;
revoke execute on function public.get_article(text) from public;
revoke execute on function public.get_saved_articles() from public;
revoke execute on function public.admin_list_users() from public;

grant execute on function public.get_feed(uuid[], uuid[], text, timestamptz, text, integer, integer, timestamptz) to anon, authenticated;
grant execute on function public.get_article(text) to anon, authenticated;
grant execute on function public.get_saved_articles() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
