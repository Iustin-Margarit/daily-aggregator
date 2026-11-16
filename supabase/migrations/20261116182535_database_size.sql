-- The size of the database, for the Newsroom's size line and for the ingestion run, which keeps fewer
-- days of news while the database is near the free plan's 500 MB limit (lib/ingestion/retention.ts).
-- Read-only. Locked to the server: only the service role (the Newsroom page and ingestion) may call it.

create or replace function public.database_size_bytes()
returns bigint
language sql
stable
set search_path = ''
as $$
  select pg_database_size(current_database());
$$;

revoke execute on function public.database_size_bytes() from public, anon, authenticated;
grant execute on function public.database_size_bytes() to service_role;
