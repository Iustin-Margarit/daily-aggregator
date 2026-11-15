-- =============================================================================
-- Muted newspapers and words for visitors without an account (2026-11-15).
--
-- Visitors can now mute newspapers and words in Settings. Their lists are kept
-- in their browser (cookies), not in the database, so get_feed takes them as
-- two new optional arguments:
--   p_muted_source_ids : newspapers to leave out (at most 200 are read)
--   p_muted_words      : words to leave out as whole words (at most 50 are
--                        read; each must have the same format as a row of
--                        public.muted_keywords, others are ignored)
-- They are added to the reader's own lists (signed-in readers keep theirs in
-- muted_sources / muted_keywords; the app sends the arguments only for
-- visitors). Anyone may filter their own feed, so no new privilege is needed.
--
-- The argument list changes, so the function is dropped and created again,
-- and granted again (new functions start locked since security round two).
-- Calls with the old eight arguments keep working (the new ones default to null).
-- =============================================================================

drop function if exists public.get_feed(uuid[], uuid[], text, timestamptz, text, integer, integer, timestamptz);

-- Returns one page of the news feed for the current user. Every row carries
-- total_count (all matching stories) so the app can show page numbers.
--   p_category_ids / p_source_ids : null or empty = no filter
--   p_search                      : every word must appear in title or summary
--   p_since                       : oldest published_at to include (default: 30 days)
--   p_sort                        : 'latest' or 'for_you'
--   p_as_of                       : snapshot time, keeps pagination stable while
--                                   new articles are being ingested
--   p_muted_source_ids / p_muted_words : a visitor's muted newspapers and words
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
  p_as_of timestamptz default null,
  p_muted_source_ids uuid[] default null,
  p_muted_words text[] default null
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
      coalesce(p_muted_source_ids[1:200], '{}'::uuid[]) as muted_sources
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

revoke execute on function public.get_feed(uuid[], uuid[], text, timestamptz, text, integer, integer, timestamptz, uuid[], text[]) from public;
grant execute on function public.get_feed(uuid[], uuid[], text, timestamptz, text, integer, integer, timestamptz, uuid[], text[]) to anon, authenticated;
