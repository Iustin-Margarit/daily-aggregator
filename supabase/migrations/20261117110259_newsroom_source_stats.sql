-- =============================================================================
-- The Newsroom's line on each paper: stories in the last 7 days and how many of
-- them have a photograph, so a noisy or picture-less paper shows at a glance.
--
-- A new function next to admin_list_sources (left as it is, so the live code keeps
-- working): admins only, like admin_list_sources. New functions start locked
-- (2.2.1), so it is granted to `authenticated`; the admin check is inside.
-- =============================================================================

create function public.admin_source_stats()
returns table (
  source_id uuid,
  stories_week integer,
  photos_week integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'Only administrators can see the papers'' figures' using errcode = '42501';
  end if;

  return query
  select a.source_id, count(*)::int, count(a.image_url)::int
    from public.articles a
   where a.published_at >= now() - interval '7 days'
     and a.published_at <= now() + interval '1 hour'
   group by a.source_id;
end;
$$;

revoke execute on function public.admin_source_stats() from public, anon;
grant execute on function public.admin_source_stats() to authenticated;
