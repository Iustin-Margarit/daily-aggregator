-- =============================================================================
-- The front page in one call (V2, 2026-11-16).
--
-- The front page is no longer page 1 of a numbered list: it is a digest. A
-- lead story and "Latest dispatches" from the reader's own sections, then a
-- few stories from every section. get_front_page returns all of them at once:
--   p_category_ids  : the reader's sections, for the lead and the dispatches
--                     (null or empty = every section)
--   p_per_section   : newest stories per section (1-12, default 8; the app
--                     drops the ones already printed above them)
--   p_latest        : newest stories from p_category_ids (1-30, default 14)
--   p_as_of         : snapshot time (default now)
--   p_muted_source_ids / p_muted_words : a visitor's mutes, as for get_feed
-- Each row is one story, once, with section_rank (its place in its section,
-- or null) and latest_rank (its place among the newest, or null).
-- The same rules as get_feed: only enabled papers, the last 30 days, no
-- muted papers, no hidden stories, no muted words (the account's and the
-- visitor's). Visitors (anon) call it too.
-- =============================================================================

create function public.get_front_page(
  p_category_ids uuid[] default null,
  p_per_section integer default 8,
  p_latest integer default 14,
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

revoke execute on function public.get_front_page(uuid[], integer, integer, timestamptz, uuid[], text[]) from public;
grant execute on function public.get_front_page(uuid[], integer, integer, timestamptz, uuid[], text[]) to anon, authenticated;
