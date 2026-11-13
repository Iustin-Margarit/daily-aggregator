-- =============================================================================
-- Security, round two (2026-11-13)
--
--   1. Deleting an account goes through the server, which checks the password
--      first. The browser can no longer call the delete function directly.
--   2. New tables and functions start locked: nobody but the owner and the
--      service role can use them until a migration grants access explicitly.
--   3. Visitors can no longer read which account wrote a letter (comments.user_id).
--   4. The unused GraphQL API is switched off.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Account deletion
--
-- delete_own_account() was callable by any logged-in browser, so the "enter
-- your password" step in the app could be skipped from the developer console.
-- The replacement can only be run with the service-role key, by the server
-- action, after it has checked the password.
-- -----------------------------------------------------------------------------

drop function if exists public.delete_own_account();

create or replace function public.delete_user_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    raise exception 'No account given' using errcode = '22004';
  end if;

  -- Serialise with other role changes so two admins cannot both leave at once.
  perform 1 from public.profiles where role = 'admin' for update;

  if exists (select 1 from public.profiles where id = p_user_id and role = 'admin')
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'You are the only administrator. Promote another user before deleting your account.'
      using errcode = 'P0001';
  end if;

  delete from auth.users where id = p_user_id;
end;
$$;

revoke execute on function public.delete_user_account(uuid) from public, anon, authenticated;
grant execute on function public.delete_user_account(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- 2. Locked by default
--
-- Supabase's default privileges give anon and authenticated full access to
-- every table and function created later, and Postgres itself lets PUBLIC
-- execute every new function. The baseline revoked those rights only for the
-- objects that existed then, so one forgotten line in a future migration would
-- open a hole. From now on every new object needs an explicit GRANT.
-- -----------------------------------------------------------------------------

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;
-- The PUBLIC grant on functions is global in Postgres (it cannot be revoked per
-- schema), so this applies to functions postgres creates in any schema.
alter default privileges for role postgres
  revoke execute on functions from public;

-- -----------------------------------------------------------------------------
-- 3. Hide who wrote each letter
--
-- Letters are shown through get_article_comments(), which returns the
-- username and avatar colour only. Reading the table directly used to reveal
-- the author's account id too. Policies keep working: they are not limited by
-- column privileges.
-- -----------------------------------------------------------------------------

revoke select on public.comments from anon, authenticated;
grant select (id, article_id, content, created_at, updated_at) on public.comments to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. GraphQL API
--
-- The app only uses the REST API and RPC functions. Without pg_graphql the
-- /graphql/v1 endpoint answers with an error instead of describing the schema.
-- Re-enable it in Database > Extensions if it is ever needed.
-- -----------------------------------------------------------------------------

drop extension if exists pg_graphql;
