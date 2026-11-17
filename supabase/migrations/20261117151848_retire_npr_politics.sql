-- =============================================================================
-- NPR - Politics switched off (2026-11-17, the owner's call: its feed carries no
-- photographs). Like the earlier retirements: off, not deleted, so saved stories
-- stay and the Newsroom can switch it on again. Matched by feed address, and only
-- while it is still on.
-- =============================================================================

update public.sources
   set is_enabled = false,
       updated_at = now()
 where is_enabled
   and rss_url = 'https://feeds.npr.org/1014/rss.xml';
