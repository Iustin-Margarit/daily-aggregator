-- =============================================================================
-- "Also reported by": a story joins a group only if it is also like the
-- group's first story (2026-11-16).
--
-- Joining the most similar headline's group let one group drift by steps: on
-- dev, "Australia win fourth Women's Rugby League World Cup" took in "Australia
-- out to defend title vs New Zealand ... LIVE!", which took in "Dominant
-- Australia defeat New Zealand in Men's World Cup final" (only 0.41 like the
-- first). Now a story already in a group is a match only when the new headline
-- is also at least 0.45 like the group's first story (or that story is gone);
-- otherwise the next most similar headline is tried.
-- Each call is now planned with its own headline (plan_cache_mode), so the
-- trigram index is used every time (also by the trigger during a long run).
-- The stories of the last 30 days are grouped again.
-- =============================================================================

create or replace function public.join_story_group(p_article_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
-- Plan each call with its own headline: a cached generic plan cannot use the trigram index well and
-- compares every story with every other (the regrouping below hit the statement timeout without this).
set plan_cache_mode = force_custom_plan
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
    left join public.articles first_story on first_story.id = a.story_group
   where a.title operator(extensions.%) v_story.title
     and a.id <> v_story.id
     and a.source_id <> v_story.source_id
     and a.published_at between v_story.published_at - interval '48 hours'
                            and v_story.published_at + interval '48 hours'
     and (first_story.id is null or first_story.title operator(extensions.%) v_story.title)
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

-- create or replace keeps the grants; said again so the file stands alone.
revoke execute on function public.join_story_group(uuid) from public, anon, authenticated;

-- Group again under the new rule, oldest first.
update public.articles set story_group = null where story_group is not null;
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
