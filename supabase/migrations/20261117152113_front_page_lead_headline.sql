-- =============================================================================
-- The lead story by coverage, third step (2026-11-17; the two before it are on dev only).
--
-- * The group stands with the story whose headline is closest to the group's first
--   story (pg_trgm similarity, as the grouping itself uses), not simply the newest:
--   the newest is often a follow-up ("We now know what X was doing when ...").
-- * One point more for every other section that carried the news, so the trade
--   papers of one section echoing each other do not outrank news every desk carries.
-- Same arguments and columns, so create or replace keeps the grants.
-- =============================================================================

create or replace function public.get_front_page(
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
  latest_rank integer,
  lead_rank integer
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
           a.story_group,
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
  ),
  -- The news several papers carry: groups that 3+ papers reported in the last 24 hours.
  coverage as (
    select x.story_group,
           count(distinct x.source_id)::integer as papers,
           count(distinct x.category_id)::integer as sections,
           to_timestamp(avg(extract(epoch from x.published_at))) as broke
      from candidates x
      cross join params p
     where x.story_group is not null
       and x.published_at >= p.as_of - interval '24 hours'
       and x.published_at <= p.as_of
     group by x.story_group
    having count(distinct x.source_id) >= 3
  ),
  -- Each group stands with a story with a photograph from the last 12 hours, the one whose headline is
  -- closest to the group's first story (the news itself rather than a follow-up), then the newest.
  -- The score: the papers, plus one for every other section that carried it, less one for every
  -- 6 hours since the news broke (the group's average time). The best three.
  leads as (
    select picked.id,
           row_number() over (order by picked.score desc, picked.published_at desc, picked.id)::integer as rank
      from (
        select distinct on (cv.story_group)
               x.id, x.published_at,
               cv.papers + cv.sections - 1
                 - greatest(extract(epoch from (p.as_of - cv.broke)), 0) / 21600.0 as score
          from coverage cv
          join candidates x on x.story_group = cv.story_group
          left join public.articles f on f.id = cv.story_group
          cross join params p
         where x.image_url is not null
           and x.in_latest
           and x.published_at >= p.as_of - interval '12 hours'
           and x.published_at <= p.as_of
         order by cv.story_group,
                  coalesce(extensions.similarity(x.title, f.title), 0) desc,
                  x.published_at desc, x.id
      ) picked
  )
  select r.id, r.title, r.summary, r.url, r.slug, r.image_url, r.author, r.published_at, r.reading_minutes,
         r.source_id, r.source_name, r.category_id, r.category_name,
         exists (select 1 from public.saved_articles sv where sv.user_id = p.uid and sv.article_id = r.id) as is_saved,
         case when r.s_rank <= p.per_section then r.s_rank end as section_rank,
         case when r.in_latest and r.l_rank <= p.latest then r.l_rank end as latest_rank,
         case when l.rank <= 3 then l.rank end as lead_rank
    from ranked r
    cross join params p
    left join leads l on l.id = r.id
   where r.s_rank <= p.per_section
      or (r.in_latest and r.l_rank <= p.latest)
      or l.rank <= 3
   order by r.published_at desc, r.id;
$$;
