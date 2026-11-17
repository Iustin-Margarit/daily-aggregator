-- =============================================================================
-- Five papers switched off (2026-11-17, the owner's call).
--
-- France 24, Brussels Signal, Politico and Politico Europe leave the lineup, and
-- Sky Sports too: Sports printed far more than any other section (about 524
-- stories in three days on dev, against 250-390 for the next ones), and Sky
-- Sports' 129 were mostly the UK football BBC Sport already covers. Sports keeps
-- BBC Sport, ESPN, ESPNcricinfo and NY Post - Sports.
--
-- Off, not deleted: their stories leave the paper at once (get_feed and
-- get_front_page read enabled papers only), readers' saved stories stay, and the
-- Newsroom can switch any of them on again. Matched by feed address, and only
-- rows still on, so nothing else the Newsroom changed is touched.
-- =============================================================================

update public.sources
   set is_enabled = false,
       updated_at = now()
 where is_enabled
   and rss_url in (
         'https://www.france24.com/en/rss',
         'https://brusselssignal.eu/feed/',
         'https://rss.politico.com/politics-news.xml',
         'https://www.politico.eu/feed/',
         'https://www.skysports.com/rss/12040'
       );
