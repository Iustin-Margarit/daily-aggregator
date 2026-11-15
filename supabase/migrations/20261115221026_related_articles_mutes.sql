-- =============================================================================
-- "More from the ... desk" respects what the reader left out (2026-11-16).
--
-- get_related_articles (the stories under a story page) only skipped the
-- signed-in reader's muted newspapers. It now leaves out the same stories as
-- the front page (get_feed):
--   * signed-in readers: muted newspapers, hidden stories, muted words;
--   * visitors: the muted newspapers and words kept in their browser, passed as
--     two new optional arguments, checked exactly as get_feed checks them
--     (at most 200 newspapers and 50 words; a word must have the format of a
--     row of public.muted_keywords, others are ignored).
--
-- The argument list changes, so the function is dropped and created again,
-- and granted again (new functions start locked since security round two).
-- Calls with the old two arguments keep working (the new ones default to null).
-- =============================================================================

drop function if exists public.get_related_articles(uuid, integer);

-- Recent stories from the same section (then from the others), newest first,
-- photographs first; at most 12.
create function public.get_related_articles(
  p_article_id uuid,
  p_limit integer default 6,
  p_muted_source_ids uuid[] default null,
  p_muted_words text[] default null
)
returns table (
  id uuid,
  title text,
  summary text,
  slug text,
  image_url text,
  published_at timestamptz,
  source_name text,
  category_name text
)
language sql
stable
set search_path = ''
as $$
  with params as (
    select (select auth.uid()) as uid,
           coalesce(p_muted_source_ids[1:200], '{}'::uuid[]) as muted_sources
  ),
  target as (
    select s.category_id
      from public.articles a join public.sources s on s.id = a.source_id
     where a.id = p_article_id
  ),
  -- Whole-word patterns, as in get_feed ('.' is the only allowed character
  -- that means something in a regular expression).
  muted_words as (
    select '\m' || replace(k.keyword, '.', '\.') || '\M' as pattern
      from public.muted_keywords k
     where k.user_id = (select p.uid from params p)
    union
    select '\m' || replace(g.w, '.', '\.') || '\M'
      from (select lower(btrim(w)) as w from unnest(p_muted_words[1:50]) as w) g
     where char_length(g.w) between 2 and 40
       and g.w ~ '^[[:alnum:]]([[:alnum:] ''’&.-]*[[:alnum:]])?$'
  )
  select a.id, a.title, a.summary, a.slug, a.image_url, a.published_at, s.name, c.name
    from public.articles a
    join public.sources s on s.id = a.source_id and s.is_enabled
    join public.categories c on c.id = s.category_id
    cross join params p
   where a.id <> p_article_id
     and a.published_at >= now() - interval '30 days'
     and not (a.source_id = any (p.muted_sources))
     and (p.uid is null or not exists (
           select 1 from public.muted_sources m where m.user_id = p.uid and m.source_id = a.source_id))
     and (p.uid is null or not exists (
           select 1 from public.hidden_articles h where h.user_id = p.uid and h.article_id = a.id))
     and not exists (
           select 1 from muted_words mw
            where lower(a.title || ' ' || coalesce(a.summary, '')) ~ mw.pattern)
   order by (s.category_id = (select t.category_id from target t)) desc nulls last,
            (a.image_url is not null) desc,
            a.published_at desc
   limit least(greatest(coalesce(p_limit, 6), 1), 12);
$$;

revoke execute on function public.get_related_articles(uuid, integer, uuid[], text[]) from public;
grant execute on function public.get_related_articles(uuid, integer, uuid[], text[]) to anon, authenticated;
