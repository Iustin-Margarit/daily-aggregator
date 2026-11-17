-- =============================================================================
-- The reader's chosen sections are gone (2026-11-17): the Sections page opens a
-- section, and every reader's front page prints every section. The app stopped
-- reading user_preferred_categories with that change (PR #16); this drops it.
--
-- get_feed's 'for_you' order still mentioned the table (a boost for the chosen
-- sections), so it is replaced first with the same arguments, result and
-- privileges, without that boost ('for_you' still ranks by recency and by the
-- sections and papers of the reader's saved stories; the app sorts by 'latest').
-- create or replace keeps the existing grants to anon and authenticated.
-- The live code never reads the table, so this can go before or after a deploy.
-- =============================================================================

create or replace function public.get_feed(
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
          + 0.4 * coalesce(sa.affinity, 0))
     end desc nulls last,
     x.published_at desc,
     x.id
   limit (select p.lim from params p)
  offset (select p.off from params p);
$$;

-- The table, its index and its policy ("Manage own topic preferences").
drop table if exists public.user_preferred_categories;
