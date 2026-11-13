-- =============================================================================
-- RPC functions used by the Next.js app.
--
-- Rules of thumb used here:
--   * Functions act on behalf of auth.uid(); none of them accepts a user id
--     from the client (the old versions did, which let users act on other
--     users' data).
--   * Read functions are SECURITY INVOKER, so row level security still applies.
--   * Admin functions are SECURITY DEFINER and start with an is_admin() check.
--   * Ingestion functions can only be executed by the service role.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Feed
-- -----------------------------------------------------------------------------

-- Returns one page of the news feed for the current user. Every row carries
-- total_count (all matching stories) so the app can show page numbers.
--   p_category_ids / p_source_ids : null or empty = no filter
--   p_search                      : every word must appear in title or summary
--   p_since                       : oldest published_at to include (default: 30 days)
--   p_sort                        : 'latest' or 'for_you'
--   p_as_of                       : snapshot time, keeps pagination stable while
--                                   new articles are being ingested
-- 'for_you' ranks by recency boosted by the user's preferred topics and by the
-- categories and sources of articles they liked (x1) or saved (x2).
create or replace function public.get_feed(
  p_category_ids uuid[] default null,
  p_source_ids uuid[] default null,
  p_search text default null,
  p_since timestamptz default null,
  p_sort text default 'latest',
  p_limit integer default 24,
  p_offset integer default 0,
  p_as_of timestamptz default null
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
  source_id uuid,
  source_name text,
  category_id uuid,
  category_name text,
  like_count integer,
  comment_count integer,
  is_liked boolean,
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
        '{}'::text[]) as words
  ),
  signals as (
    select a.source_id, s.category_id, 1.0::float8 as weight
      from public.likes l
      join public.articles a on a.id = l.article_id
      join public.sources s on s.id = a.source_id
     where l.user_id = (select p.uid from params p)
       and (select p.sort from params p) = 'for_you'
    union all
    select a.source_id, s.category_id, 2.0::float8
      from public.saved_articles sa
      join public.articles a on a.id = sa.article_id
      join public.sources s on s.id = a.source_id
     where sa.user_id = (select p.uid from params p)
       and (select p.sort from params p) = 'for_you'
  ),
  category_affinity as (
    select sg.category_id, sum(sg.weight) / max(sum(sg.weight)) over () as affinity
      from signals sg group by sg.category_id
  ),
  source_affinity as (
    select sg.source_id, sum(sg.weight) / max(sum(sg.weight)) over () as affinity
      from signals sg group by sg.source_id
  ),
  preferred as (
    select upc.category_id
      from public.user_preferred_categories upc
     where upc.user_id = (select p.uid from params p)
  ),
  candidates as (
    select a.id, a.title, a.summary, a.url, a.slug, a.image_url, a.author, a.published_at,
           a.source_id, s.name as source_name, s.category_id, c.name as category_name,
           a.like_count, a.comment_count
      from public.articles a
      join public.sources s on s.id = a.source_id and s.is_enabled
      join public.categories c on c.id = s.category_id
      cross join params p
     where a.created_at <= p.as_of
       and a.published_at >= coalesce(p_since, p.as_of - interval '30 days')
       and (p_category_ids is null or cardinality(p_category_ids) = 0 or s.category_id = any (p_category_ids))
       and (p_source_ids is null or cardinality(p_source_ids) = 0 or a.source_id = any (p_source_ids))
       and (p.uid is null or not exists (
             select 1 from public.muted_sources m where m.user_id = p.uid and m.source_id = a.source_id))
       and (p.uid is null or not exists (
             select 1 from public.hidden_articles h where h.user_id = p.uid and h.article_id = a.id))
       and not exists (
             select 1 from unnest(p.words) as w
              where strpos(lower(a.title || ' ' || coalesce(a.summary, '')), w) = 0)
  )
  select x.id, x.title, x.summary, x.url, x.slug, x.image_url, x.author, x.published_at,
         x.source_id, x.source_name, x.category_id, x.category_name,
         x.like_count, x.comment_count,
         exists (select 1 from public.likes l where l.user_id = p.uid and l.article_id = x.id) as is_liked,
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

-- -----------------------------------------------------------------------------
-- Article page
-- -----------------------------------------------------------------------------

create or replace function public.get_article(p_slug_or_id text)
returns table (
  id uuid,
  title text,
  summary text,
  url text,
  slug text,
  image_url text,
  author text,
  published_at timestamptz,
  source_id uuid,
  source_name text,
  source_website_url text,
  category_id uuid,
  category_name text,
  like_count integer,
  comment_count integer,
  is_liked boolean,
  is_saved boolean
)
language plpgsql
stable
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_id uuid;
  v_uid uuid := auth.uid();
begin
  if p_slug_or_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_id := p_slug_or_id::uuid;
  else
    select a.id into v_id from public.articles a where a.slug = p_slug_or_id;
  end if;

  if v_id is null then
    return;
  end if;

  return query
  select a.id, a.title, a.summary, a.url, a.slug, a.image_url, a.author, a.published_at,
         a.source_id, s.name, s.website_url, s.category_id, c.name,
         a.like_count, a.comment_count,
         exists (select 1 from public.likes l where l.user_id = v_uid and l.article_id = a.id),
         exists (select 1 from public.saved_articles sv where sv.user_id = v_uid and sv.article_id = a.id)
    from public.articles a
    join public.sources s on s.id = a.source_id
    join public.categories c on c.id = s.category_id
   where a.id = v_id;
end;
$$;

-- Recent articles from the same category (falls back to all categories).
create or replace function public.get_related_articles(p_article_id uuid, p_limit integer default 6)
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
  with target as (
    select s.category_id
      from public.articles a join public.sources s on s.id = a.source_id
     where a.id = p_article_id
  )
  select a.id, a.title, a.summary, a.slug, a.image_url, a.published_at, s.name, c.name
    from public.articles a
    join public.sources s on s.id = a.source_id and s.is_enabled
    join public.categories c on c.id = s.category_id
   where a.id <> p_article_id
     and a.published_at >= now() - interval '30 days'
     and ((select auth.uid()) is null or not exists (
           select 1 from public.muted_sources m
            where m.user_id = (select auth.uid()) and m.source_id = a.source_id))
   order by (s.category_id = (select t.category_id from target t)) desc nulls last,
            (a.image_url is not null) desc,
            a.published_at desc
   limit least(greatest(coalesce(p_limit, 6), 1), 12);
$$;

-- Comments with author display data. SECURITY DEFINER because profiles are
-- private; only the username and avatar colour are exposed.
create or replace function public.get_article_comments(p_article_id uuid)
returns table (
  id uuid,
  content text,
  created_at timestamptz,
  updated_at timestamptz,
  username text,
  avatar_color text,
  is_own boolean,
  can_delete boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select cm.id, cm.content, cm.created_at, cm.updated_at, p.username, p.avatar_color,
         cm.user_id = (select auth.uid()),
         cm.user_id = (select auth.uid()) or public.is_admin()
    from public.comments cm
    join public.profiles p on p.id = cm.user_id
   where cm.article_id = p_article_id
   order by cm.created_at asc
   limit 500;
$$;

-- -----------------------------------------------------------------------------
-- Saved articles
-- -----------------------------------------------------------------------------

create or replace function public.get_saved_articles()
returns table (
  article_id uuid,
  title text,
  summary text,
  url text,
  slug text,
  image_url text,
  published_at timestamptz,
  source_id uuid,
  source_name text,
  source_enabled boolean,
  category_id uuid,
  category_name text,
  like_count integer,
  comment_count integer,
  is_liked boolean,
  folder_id uuid,
  is_read boolean,
  notes text,
  saved_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  select a.id, a.title, a.summary, a.url, a.slug, a.image_url, a.published_at,
         a.source_id, s.name, s.is_enabled, s.category_id, c.name,
         a.like_count, a.comment_count,
         exists (select 1 from public.likes l where l.user_id = sa.user_id and l.article_id = a.id),
         sa.folder_id, sa.is_read, sa.notes, sa.saved_at
    from public.saved_articles sa
    join public.articles a on a.id = sa.article_id
    join public.sources s on s.id = a.source_id
    join public.categories c on c.id = s.category_id
   where sa.user_id = (select auth.uid())
   order by sa.saved_at desc;
$$;

-- -----------------------------------------------------------------------------
-- Account
-- -----------------------------------------------------------------------------

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if exists (select 1 from public.profiles where id = v_uid and role = 'admin')
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'You are the only administrator. Promote another user before deleting your account.'
      using errcode = 'P0001';
  end if;

  delete from auth.users where id = v_uid;
end;
$$;

-- -----------------------------------------------------------------------------
-- Admin
-- -----------------------------------------------------------------------------

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  username text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  has_completed_onboarding boolean,
  saved_count integer,
  like_count integer,
  comment_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'Only administrators can list users' using errcode = '42501';
  end if;

  return query
  select p.id, u.email::text, p.username, p.role, u.created_at, u.last_sign_in_at,
         p.has_completed_onboarding,
         (select count(*)::int from public.saved_articles sa where sa.user_id = p.id),
         (select count(*)::int from public.likes l where l.user_id = p.id),
         (select count(*)::int from public.comments cm where cm.user_id = p.id)
    from public.profiles p
    join auth.users u on u.id = p.id
   order by u.created_at desc;
end;
$$;

create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can delete users' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Use the profile page to delete your own account' using errcode = 'P0001';
  end if;
  delete from auth.users where id = p_user_id;
end;
$$;

create or replace function public.admin_list_sources()
returns table (
  id uuid,
  name text,
  rss_url text,
  website_url text,
  description text,
  category_id uuid,
  category_name text,
  is_enabled boolean,
  last_fetched_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  consecutive_failures integer,
  last_item_count integer,
  article_count integer,
  latest_article_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'Only administrators can list sources' using errcode = '42501';
  end if;

  return query
  select s.id, s.name, s.rss_url, s.website_url, s.description, s.category_id, c.name, s.is_enabled,
         s.last_fetched_at, s.last_success_at, s.last_error, s.consecutive_failures, s.last_item_count,
         coalesce(st.n, 0)::int, st.latest
    from public.sources s
    join public.categories c on c.id = s.category_id
    left join lateral (
      select count(*) as n, max(a.published_at) as latest
        from public.articles a where a.source_id = s.id
    ) st on true
   order by c.sort_order, c.name, s.name;
end;
$$;

create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can view statistics' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'users_total',        (select count(*) from public.profiles),
    'users_new_7d',       (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'admins_total',       (select count(*) from public.profiles where role = 'admin'),
    'articles_total',     (select count(*) from public.articles),
    'articles_24h',       (select count(*) from public.articles where created_at > now() - interval '24 hours'),
    'sources_total',      (select count(*) from public.sources),
    'sources_enabled',    (select count(*) from public.sources where is_enabled),
    'sources_failing',    (select count(*) from public.sources where is_enabled and consecutive_failures > 0),
    'likes_total',        (select count(*) from public.likes),
    'saves_total',        (select count(*) from public.saved_articles),
    'comments_total',     (select count(*) from public.comments),
    'articles_by_category', coalesce((
      select jsonb_agg(jsonb_build_object('name', x.name, 'count', x.n) order by x.n desc)
        from (select c.name, count(a.id) as n
                from public.categories c
                left join public.sources s on s.category_id = c.id
                left join public.articles a on a.source_id = s.id
               group by c.name) x
    ), '[]'::jsonb),
    'top_articles', coalesce((
      select jsonb_agg(jsonb_build_object('title', t.title, 'slug', t.slug, 'likes', t.like_count,
                                          'comments', t.comment_count) order by t.like_count desc, t.comment_count desc)
        from (select a.title, a.slug, a.like_count, a.comment_count
                from public.articles a
               where a.like_count > 0 or a.comment_count > 0
               order by a.like_count desc, a.comment_count desc
               limit 5) t
    ), '[]'::jsonb),
    'recent_runs', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.started_at desc)
        from (select * from public.ingestion_runs order by started_at desc limit 10) r
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- Ingestion (service role only)
-- -----------------------------------------------------------------------------

-- Inserts a batch of articles for one source. Duplicates (same URL or slug)
-- are skipped. Returns the new rows so the caller can enrich them (images).
create or replace function public.ingest_articles(p_source_id uuid, p_articles jsonb)
returns table (article_id uuid, article_url text, image_url text)
language plpgsql
set search_path = ''
as $$
begin
  return query
  with input as (
    select *
      from jsonb_to_recordset(coalesce(p_articles, '[]'::jsonb))
        as x(title text, summary text, url text, image_url text, author text, published_at timestamptz)
  ),
  inserted as (
    insert into public.articles as ins (source_id, title, summary, url, image_url, author, published_at)
    select p_source_id,
           left(btrim(i.title), 500),
           nullif(left(btrim(coalesce(i.summary, '')), 1000), ''),
           btrim(i.url),
           case when btrim(coalesce(i.image_url, '')) ~* '^https?://' then btrim(i.image_url) end,
           nullif(left(btrim(coalesce(i.author, '')), 200), ''),
           least(coalesce(i.published_at, now()), now())
      from input i
     where nullif(btrim(coalesce(i.title, '')), '') is not null
       and btrim(coalesce(i.url, '')) ~* '^https?://'
    on conflict do nothing
    returning ins.id, ins.url, ins.image_url
  )
  select * from inserted;
end;
$$;

-- Claims the ingestion "lock". Returns the new run id, or null when another run
-- is in progress or (when p_min_interval_minutes is given) one ran recently.
create or replace function public.start_ingestion_run(p_trigger text, p_min_interval_minutes integer default null)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('public.ingestion_runs'));

  update public.ingestion_runs
     set status = 'failed',
         finished_at = now(),
         errors = errors || '["Run did not finish (timed out or crashed)."]'::jsonb
   where status = 'running' and started_at < now() - interval '15 minutes';

  if exists (select 1 from public.ingestion_runs where status = 'running') then
    return null;
  end if;

  if p_min_interval_minutes is not null and exists (
       select 1 from public.ingestion_runs
        where started_at > now() - make_interval(mins => p_min_interval_minutes)) then
    return null;
  end if;

  insert into public.ingestion_runs (trigger) values (p_trigger) returning id into v_id;
  return v_id;
end;
$$;

-- Deletes articles older than the retention window that nobody saved, plus old
-- ingestion logs. Returns the number of deleted articles.
create or replace function public.cleanup_old_articles(p_retention_days integer default 30)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  with removed as (
    delete from public.articles a
     where a.published_at < now() - make_interval(days => greatest(p_retention_days, 1))
       and not exists (select 1 from public.saved_articles sa where sa.article_id = a.id)
    returning 1
  )
  select count(*) into v_count from removed;

  delete from public.ingestion_runs where started_at < now() - interval '60 days';

  return v_count;
end;
$$;

-- Promote a user to administrator by e-mail. Run it from the SQL editor or via
-- `npm run make-admin -- you@example.com` (uses the service role key).
create or replace function public.promote_to_admin(p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(btrim(p_email));
  if v_id is null then
    raise exception 'No user with e-mail %', p_email using errcode = 'P0002';
  end if;
  update public.profiles set role = 'admin' where id = v_id;
  return 'User ' || p_email || ' is now an administrator.';
end;
$$;

-- -----------------------------------------------------------------------------
-- Privileges: lock everything down, then grant explicitly.
-- (Supabase grants EXECUTE on new functions to anon/authenticated by default.)
-- -----------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.get_feed(uuid[], uuid[], text, timestamptz, text, integer, integer, timestamptz) to anon, authenticated;
grant execute on function public.get_article(text) to anon, authenticated;
grant execute on function public.get_related_articles(uuid, integer) to anon, authenticated;
grant execute on function public.get_article_comments(uuid) to anon, authenticated;

grant execute on function public.get_saved_articles() to authenticated;
grant execute on function public.delete_own_account() to authenticated;

grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
grant execute on function public.admin_list_sources() to authenticated;
grant execute on function public.admin_dashboard_stats() to authenticated;

grant execute on function public.ingest_articles(uuid, jsonb) to service_role;
grant execute on function public.start_ingestion_run(text, integer) to service_role;
grant execute on function public.cleanup_old_articles(integer) to service_role;
grant execute on function public.promote_to_admin(text) to service_role;
