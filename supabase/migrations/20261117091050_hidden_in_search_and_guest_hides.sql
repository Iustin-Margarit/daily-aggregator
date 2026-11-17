-- =============================================================================
-- Hidden stories: found by a search, and hidden by visitors too (2026-11-17).
--
-- 1. A search finds hidden stories. get_feed still leaves a reader's hidden
--    stories out of every list (the latest, a section, a newspaper), but not
--    out of a search (p_search with at least one word), so a story hidden by
--    mistake can be found and brought back (the quick-read sheet's More menu
--    offers Unhide). Settings no longer lists hidden stories.
-- 2. Visitors without an account can hide stories. Their list is kept in their
--    browser (a cookie mirrored in localStorage), like their muted newspapers,
--    so get_feed and get_front_page take it as one new optional argument:
--      p_hidden_ids : stories to leave out (at most 100 are read)
--    It is added to the account's own hidden_articles (the app sends it only for
--    visitors). Anyone may filter their own paper, so no new privilege is needed.
--
-- The argument lists change, so both functions are dropped and created again,
-- and granted again (new functions start locked). Calls without the new
-- argument keep working (it defaults to null).
-- =============================================================================

drop function if exists public.get_feed(uuid[], uuid[], text, timestamptz, text, integer, integer, timestamptz, uuid[], text[]);
drop function if exists public.get_front_page(uuid[], integer, integer, timestamptz, uuid[], text[]);

-- Returns one page of the news feed for the current user. Every row carries
-- total_count (all matching stories) so the app can show page numbers.
--   p_category_ids / p_source_ids : null or empty = no filter
--   p_search                      : every word must appear in title or summary
--   p_since                       : oldest published_at to include (default: 30 days)
--   p_sort                        : 'latest' or 'for_you'
--   p_as_of                       : snapshot time, keeps pagination stable while
--                                   new articles are being ingested
--   p_muted_source_ids / p_muted_words : a visitor's muted newspapers and words
--   p_hidden_ids                  : a visitor's hidden stories
-- Stories from muted sources and stories that contain one of the reader's
-- muted keywords (as a whole word) are left out; hidden stories too, except
-- from a search.
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
  p_as_of timestamptz default null,
  p_muted_source_ids uuid[] default null,
  p_muted_words text[] default null,
  p_hidden_ids uuid[] default null
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
        '{}'::text[]) as words,
      -- A visitor's muted newspapers, at most 200.
      coalesce(p_muted_source_ids[1:200], '{}'::uuid[]) as muted_sources,
      -- A visitor's hidden stories, at most 100.
      coalesce(p_hidden_ids[1:100], '{}'::uuid[]) as hidden_ids
  ),
  -- The reader's muted keywords as whole-word patterns ('.' is the only
  -- character the table allows that means something in a regular expression).
  -- A visitor's words must pass the same check as the table, so they cannot
  -- carry any other pattern syntax.
  muted_words as (
    select '\m' || replace(k.keyword, '.', '\.') || '\M' as pattern
      from public.muted_keywords k
     where k.user_id = (select p.uid from params p)
    union
    select '\m' || replace(g.w, '.', '\.') || '\M'
      from (select lower(btrim(w)) as w from unnest(p_muted_words[1:50]) as w) g
     where char_length(g.w) between 2 and 40
       and g.w ~ '^[[:alnum:]]([[:alnum:] ''’&.-]*[[:alnum:]])?$'
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
       and not (a.source_id = any (p.muted_sources))
       and (p.uid is null or not exists (
             select 1 from public.muted_sources m where m.user_id = p.uid and m.source_id = a.source_id))
       -- Hidden stories (the account's, or a visitor's sent from the browser) stay out of the lists, but a
       -- search still finds them, so a story hidden by mistake is never lost for good.
       and (cardinality(p.words) > 0 or (
             not (a.id = any (p.hidden_ids))
             and (p.uid is null or not exists (
                   select 1 from public.hidden_articles h where h.user_id = p.uid and h.article_id = a.id))))
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

revoke execute on function public.get_feed(uuid[], uuid[], text, timestamptz, text, integer, integer, timestamptz, uuid[], text[], uuid[]) from public;
grant execute on function public.get_feed(uuid[], uuid[], text, timestamptz, text, integer, integer, timestamptz, uuid[], text[], uuid[]) to anon, authenticated;

-- The front page in one call: the same rules as get_feed's lists, a visitor's hidden stories included.
create function public.get_front_page(
  p_category_ids uuid[] default null,
  p_per_section integer default 8,
  p_latest integer default 14,
  p_as_of timestamptz default null,
  p_muted_source_ids uuid[] default null,
  p_muted_words text[] default null,
  p_hidden_ids uuid[] default null
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
  section_rank integer,
  latest_rank integer
)
language sql
stable
set search_path = ''
as $$
  with params as (
    select
      (select auth.uid()) as uid,
      coalesce(p_as_of, now()) as as_of,
      least(greatest(coalesce(p_per_section, 8), 1), 12) as per_section,
      least(greatest(coalesce(p_latest, 14), 1), 30) as latest,
      coalesce(p_muted_source_ids[1:200], '{}'::uuid[]) as muted_sources,
      coalesce(p_hidden_ids[1:100], '{}'::uuid[]) as hidden_ids,
      coalesce(cardinality(p_category_ids), 0) = 0 as every_section
  ),
  -- The same whole-word patterns as get_feed (the account's words and a visitor's checked words).
  muted_words as (
    select '\m' || replace(k.keyword, '.', '\.') || '\M' as pattern
      from public.muted_keywords k
     where k.user_id = (select p.uid from params p)
    union
    select '\m' || replace(g.w, '.', '\.') || '\M'
      from (select lower(btrim(w)) as w from unnest(p_muted_words[1:50]) as w) g
     where char_length(g.w) between 2 and 40
       and g.w ~ '^[[:alnum:]]([[:alnum:] ''’&.-]*[[:alnum:]])?$'
  ),
  candidates as (
    select a.id, a.title, a.summary, a.url, a.slug, a.image_url, a.author, a.published_at,
           a.reading_minutes, a.source_id, s.name as source_name, s.category_id, c.name as category_name,
           (p.every_section or s.category_id = any (p_category_ids)) as in_latest
      from public.articles a
      join public.sources s on s.id = a.source_id and s.is_enabled
      join public.categories c on c.id = s.category_id
      cross join params p
     where a.created_at <= p.as_of
       and a.published_at >= p.as_of - interval '30 days'
       and not (a.source_id = any (p.muted_sources))
       and (p.uid is null or not exists (
             select 1 from public.muted_sources m where m.user_id = p.uid and m.source_id = a.source_id))
       and not (a.id = any (p.hidden_ids))
       and (p.uid is null or not exists (
             select 1 from public.hidden_articles h where h.user_id = p.uid and h.article_id = a.id))
       and not exists (
             select 1 from muted_words mw
              where lower(a.title || ' ' || coalesce(a.summary, '')) ~ mw.pattern)
  ),
  ranked as (
    select x.*,
           row_number() over (partition by x.category_id order by x.published_at desc, x.id)::integer as s_rank,
           row_number() over (partition by x.in_latest order by x.published_at desc, x.id)::integer as l_rank
      from candidates x
  )
  select r.id, r.title, r.summary, r.url, r.slug, r.image_url, r.author, r.published_at, r.reading_minutes,
         r.source_id, r.source_name, r.category_id, r.category_name,
         exists (select 1 from public.saved_articles sv where sv.user_id = p.uid and sv.article_id = r.id) as is_saved,
         case when r.s_rank <= p.per_section then r.s_rank end as section_rank,
         case when r.in_latest and r.l_rank <= p.latest then r.l_rank end as latest_rank
    from ranked r
    cross join params p
   where r.s_rank <= p.per_section
      or (r.in_latest and r.l_rank <= p.latest)
   order by r.published_at desc, r.id;
$$;

revoke execute on function public.get_front_page(uuid[], integer, integer, timestamptz, uuid[], text[], uuid[]) from public;
grant execute on function public.get_front_page(uuid[], integer, integer, timestamptz, uuid[], text[], uuid[]) to anon, authenticated;
