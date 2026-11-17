-- =============================================================================
-- Kyiv Independent switched off too (2026-11-17, the owner's call), like the five
-- papers just before it (20261117142109_retire_five_papers): off, not deleted, so
-- saved stories stay and the Newsroom can switch it on again. Matched by feed
-- address, and only while it is still on.
-- =============================================================================

update public.sources
   set is_enabled = false,
       updated_at = now()
 where is_enabled
   and rss_url = 'https://kyivindependent.com/news-archive/rss/';
