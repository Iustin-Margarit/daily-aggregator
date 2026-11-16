-- =============================================================================
-- "Also reported by" (V2.1 Phase 4, 2026-11-16).
--
-- The same news told by several papers is grouped when it is fetched: a new
-- story joins the group of the most similar headline from ANOTHER paper
-- published within 48 hours of it, when the two headlines are at least 0.45
-- alike (pg_trgm's similarity(): shared three-letter pieces over all of them).
-- 0.45 was chosen on the dev project's 2,667 stories of 16 November 2026: at
-- 0.45 and above the pairs were the same news (Depardieu's appeal at BBC and
-- The Guardian, Pattinson as Bond at Forbes and Variety); between 0.40 and 0.45
-- a few were not (the men's and the women's rugby league finals); lower down
-- they are mostly the same subject, not the same story.
--
--   * articles.story_group: the id of the group's first story (null: alone).
--   * public.join_story_group(id): groups one story; run by an AFTER INSERT
--     trigger, so only stories really added (not the ones `on conflict do
--     nothing` skips). Internal: nobody may call it through the API.
--   * public.get_also_reported(id, ...): the other papers' versions of a
--     story, one per paper, for the quick-read sheet; it leaves out what the
--     front page leaves out (muted papers and words, hidden stories), exactly
--     as get_related_articles does. For visitors and readers alike.
-- Stories of the last 30 days are grouped once, at the end of this file.
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

alter table public.articles add column story_group uuid;
comment on column public.articles.story_group is
  'The same news from other papers: the id of the group''s first story (no foreign key: it may be cleaned up first). Set by join_story_group().';
create index articles_story_group_idx on public.articles (story_group) where story_group is not null;
-- Finds similar headlines quickly (the % operator).
create index articles_title_trgm_idx on public.articles using gin (title extensions.gin_trgm_ops);

create function public.join_story_group(p_article_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_story public.articles%rowtype;
  v_match_id uuid;
  v_match_group uuid;
begin
  select * into v_story from public.articles where id = p_article_id;
  -- Gone, or already pulled into a group by a story that matched it.
  if not found or v_story.story_group is not null then
    return;
  end if;

  -- The % operator's threshold, for this transaction only.
  perform set_config('pg_trgm.similarity_threshold', '0.45', true);

  select a.id, a.story_group into v_match_id, v_match_group
    from public.articles a
   where a.title operator(extensions.%) v_story.title
     and a.id <> v_story.id
     and a.source_id <> v_story.source_id
     and a.published_at between v_story.published_at - interval '48 hours'
                            and v_story.published_at + interval '48 hours'
   order by extensions.similarity(a.title, v_story.title) desc, a.published_at, a.id
   limit 1;

  if v_match_id is null then
    return;
  end if;
  if v_match_group is null then
    update public.articles set story_group = v_match_id where id = v_match_id;
  end if;
  update public.articles set story_group = coalesce(v_match_group, v_match_id) where id = v_story.id;
end;
$$;

revoke execute on function public.join_story_group(uuid) from public, anon, authenticated;

create function public.articles_join_story_group()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.join_story_group(new.id);
  return null;
end;
$$;

revoke execute on function public.articles_join_story_group() from public, anon, authenticated;

create trigger articles_join_story_group after insert on public.articles
  for each row execute function public.articles_join_story_group();

-- The same news from other papers, newest first, one story per paper; at most 10.
create function public.get_also_reported(
  p_article_id uuid,
  p_limit integer default 5,
  p_muted_source_ids uuid[] default null,
  p_muted_words text[] default null
)
returns table (
  id uuid,
  title text,
  slug text,
  published_at timestamptz,
  source_name text
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
    select a.story_group, a.source_id
      from public.articles a
     where a.id = p_article_id and a.story_group is not null
  ),
  -- Whole-word patterns, as in get_feed and get_related_articles.
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
  -- Each other paper's newest version.
  versions as (
    select distinct on (a.source_id) a.id, a.title, a.slug, a.published_at, s.name as source_name
      from public.articles a
      join public.sources s on s.id = a.source_id and s.is_enabled
      cross join target t
      cross join params p
     where a.story_group = t.story_group
       and a.id <> p_article_id
       and a.source_id <> t.source_id
       and not (a.source_id = any (p.muted_sources))
       and (p.uid is null or not exists (
             select 1 from public.muted_sources m where m.user_id = p.uid and m.source_id = a.source_id))
       and (p.uid is null or not exists (
             select 1 from public.hidden_articles h where h.user_id = p.uid and h.article_id = a.id))
       and not exists (
             select 1 from muted_words mw
              where lower(a.title || ' ' || coalesce(a.summary, '')) ~ mw.pattern)
     order by a.source_id, a.published_at desc, a.id
  )
  select v.id, v.title, v.slug, v.published_at, v.source_name
    from versions v
   order by v.published_at desc, v.id
   limit least(greatest(coalesce(p_limit, 5), 1), 10);
$$;

revoke execute on function public.get_also_reported(uuid, integer, uuid[], text[]) from public;
grant execute on function public.get_also_reported(uuid, integer, uuid[], text[]) to anon, authenticated;

-- Group the stories already on file (the last 30 days), oldest first.
do $$
declare
  r record;
begin
  for r in
    select a.id from public.articles a
     where a.published_at > now() - interval '30 days'
     order by a.published_at, a.id
  loop
    perform public.join_story_group(r.id);
  end loop;
end;
$$;
