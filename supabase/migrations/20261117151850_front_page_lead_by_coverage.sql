-- =============================================================================
-- The front page's lead story chosen by how many papers report it (2026-11-17).
--
-- Until now the lead was simply the newest story with a photograph, so a
-- Hollywood item could lead the paper. Stories are already grouped across papers
-- at ingestion (articles.story_group, 20261116193936_also_reported), so the paper
-- now leads with the news most papers carry:
--
--   * a group counts when 3 or more papers (among the stories this reader sees:
--     enabled papers, without their mutes and hidden stories) reported it in the
--     last 12 hours;
--   * its score is that number of papers, less one for every 6 hours since the
--     group's newest story (so fresh news is not buried by yesterday's);
--   * the group's newest story with a photograph stands for it.
--
-- get_front_page returns the best three as `lead_rank` 1-3 (null for the rest);
-- lib/front-page.ts leads with rank 1 and falls back to the old rule when no group
-- qualifies. The arguments are unchanged and the new column is only added, so the
-- live code keeps working before and after this migration.
-- =============================================================================

drop function if exists public.get_front_page(uuid[], integer, integer, timestamptz, uuid[], text[], uuid[]);

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
  -- The news several papers carry: groups of 3+ papers in the last 12 hours.
  coverage as (
    select x.story_group, count(distinct x.source_id)::integer as papers, max(x.published_at) as newest
      from candidates x
      cross join params p
     where x.story_group is not null
       and x.published_at >= p.as_of - interval '12 hours'
       and x.published_at <= p.as_of
     group by x.story_group
    having count(distinct x.source_id) >= 3
  ),
  -- Each group's newest story with a photograph, scored; the best three.
  leads as (
    select picked.id,
           row_number() over (order by picked.score desc, picked.published_at desc, picked.id)::integer as rank
      from (
        select distinct on (cv.story_group)
               x.id, x.published_at,
               cv.papers - greatest(extract(epoch from (p.as_of - cv.newest)), 0) / 21600.0 as score
          from coverage cv
          join candidates x on x.story_group = cv.story_group
          cross join params p
         where x.image_url is not null
           and x.in_latest
           and x.published_at >= p.as_of - interval '12 hours'
           and x.published_at <= p.as_of
         order by cv.story_group, x.published_at desc, x.id
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

revoke execute on function public.get_front_page(uuid[], integer, integer, timestamptz, uuid[], text[], uuid[]) from public;
grant execute on function public.get_front_page(uuid[], integer, integer, timestamptz, uuid[], text[], uuid[]) to anon, authenticated;
