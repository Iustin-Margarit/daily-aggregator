-- =============================================================================
-- Fix (2026-11-14): visitors who are not signed in could not load the feed.
--
-- get_feed (security invoker) reads public.muted_keywords to leave out the
-- reader's muted words. Postgres checks table privileges even when the query
-- would find no rows, so for "anon" the whole function failed with
-- "permission denied for table muted_keywords". anon may now select from the
-- table; row level security has no policy for anon, so it still sees no rows.
-- =============================================================================

grant select on public.muted_keywords to anon;
