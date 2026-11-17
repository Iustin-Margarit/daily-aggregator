-- =============================================================================
-- The curated lineup, November 2026 (V2.1 Phase 5): 29 newspapers added, 8 switched off,
-- The Hill moved to its clean feed. Data only: no table or function changes, so the
-- code that is live keeps working with it.
--
-- Written so it never overwrites the Newsroom's own changes:
--   * a newspaper is added only if no paper has its name or its feed address yet
--     (on conflict do nothing: both are unique);
--   * a paper is switched off, or The Hill moved, only while its row still has the
--     feed address it was seeded with. Switched off, not deleted: readers' saved
--     stories stay, and the Newsroom can switch any of them back on.
--
-- Every feed was tested on 2026-11-17 with the app's own fetcher, parser and
-- cleaner: free to read, real summaries, photographs, a reasonable number a day.
-- =============================================================================

with feeds (category, name, rss_url, website_url, description) as (
  values
    -- World
    ('World', 'DW - Top stories', 'https://rss.dw.com/xml/rss-en-top', 'https://www.dw.com/en', 'Top stories from Deutsche Welle, Germany'),
    ('World', 'France 24', 'https://www.france24.com/en/rss', 'https://www.france24.com/en/', 'International news from France 24'),
    ('World', 'Euronews', 'https://www.euronews.com/rss?format=mrss&level=theme&name=news', 'https://www.euronews.com', 'European and world news from Euronews'),
    ('World', 'Kyiv Independent', 'https://kyivindependent.com/news-archive/rss/', 'https://kyivindependent.com', 'News from Ukraine'),
    ('World', 'CNA - Asia', 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6511', 'https://www.channelnewsasia.com/asia', 'Asian news from CNA, Singapore'),
    ('World', 'Sky News - World', 'https://feeds.skynews.com/feeds/rss/world.xml', 'https://news.sky.com/world', 'World news from Sky News'),
    ('World', 'GB News', 'https://www.gbnews.com/feeds/news.rss', 'https://www.gbnews.com', 'British news from GB News'),
    ('World', 'Remix News', 'https://rmx.news/feed/', 'https://rmx.news', 'News from Central Europe'),
    ('World', 'NY Post - News', 'https://nypost.com/news/feed/', 'https://nypost.com/news/', 'News from the New York Post'),
    ('World', 'Washington Times - World', 'https://www.washingtontimes.com/rss/headlines/news/world/', 'https://www.washingtontimes.com/news/world/', 'World news from The Washington Times'),
    ('World', 'The Spectator Australia', 'https://www.spectator.com.au/feed/', 'https://www.spectator.com.au', 'Comment and news from The Spectator Australia'),
    -- Politics
    ('Politics', 'Politico Europe', 'https://www.politico.eu/feed/', 'https://www.politico.eu', 'European politics and policy'),
    ('Politics', 'Washington Times - Politics', 'https://www.washingtontimes.com/rss/headlines/news/politics/', 'https://www.washingtontimes.com/news/politics/', 'Political news from The Washington Times'),
    ('Politics', 'The American Conservative', 'https://www.theamericanconservative.com/feed/', 'https://www.theamericanconservative.com', 'Politics and foreign policy commentary'),
    ('Politics', 'NewsNation', 'https://www.newsnationnow.com/feed/', 'https://www.newsnationnow.com', 'American news from NewsNation'),
    ('Politics', 'Brussels Signal', 'https://brusselssignal.eu/feed/', 'https://brusselssignal.eu', 'News on the European Union'),
    ('Politics', 'Just The News', 'https://justthenews.com/rss.xml', 'https://justthenews.com', 'American political news'),
    ('Politics', 'The Federalist', 'https://thefederalist.com/feed/', 'https://thefederalist.com', 'Politics and culture commentary'),
    -- Business
    ('Business', 'Euronews - Business', 'https://www.euronews.com/rss?format=mrss&level=theme&name=business', 'https://www.euronews.com/business', 'European business news from Euronews'),
    ('Business', 'Sky News - Business', 'https://feeds.skynews.com/feeds/rss/business.xml', 'https://news.sky.com/business', 'Business news from Sky News'),
    ('Business', 'City A.M.', 'https://www.cityam.com/feed/', 'https://www.cityam.com', 'London business and finance'),
    ('Business', 'NY Post - Business', 'https://nypost.com/business/feed/', 'https://nypost.com/business/', 'Business news from the New York Post'),
    -- Technology
    ('Technology', 'The Register', 'https://www.theregister.com/headlines.atom', 'https://www.theregister.com', 'Technology news from London'),
    -- Science
    ('Science', 'Space.com', 'https://www.space.com/feeds/all', 'https://www.space.com', 'Space and astronomy news'),
    -- Health
    ('Health', 'KFF Health News', 'https://kffhealthnews.org/feed/', 'https://kffhealthnews.org', 'Health policy news'),
    ('Health', 'Daily Mail - Health', 'https://www.dailymail.co.uk/health/index.rss', 'https://www.dailymail.co.uk/health/index.html', 'Health news from the Daily Mail'),
    -- Sports
    ('Sports', 'ESPNcricinfo', 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml', 'https://www.espncricinfo.com', 'Cricket from around the world'),
    ('Sports', 'NY Post - Sports', 'https://nypost.com/sports/feed/', 'https://nypost.com/sports/', 'Sports from the New York Post'),
    -- Entertainment
    ('Entertainment', 'NY Post - Entertainment', 'https://nypost.com/entertainment/feed/', 'https://nypost.com/entertainment/', 'Entertainment news from the New York Post')
)
insert into public.sources (name, rss_url, website_url, description, category_id)
select f.name, f.rss_url, f.website_url, f.description, c.id
  from feeds f
  join public.categories c on c.name = f.category
on conflict do nothing;

-- Switched off: a dead feed (WHO, nothing new since 2021), one that answers 429 most hours
-- (Phys.org), noisy or off-topic ones (Forbes, CBS Sports), two without photographs (NPR),
-- and two the owner took out of the lineup (The Guardian - World, Al Jazeera).
update public.sources
   set is_enabled = false
 where is_enabled
   and rss_url in (
     'https://www.who.int/rss-feeds/news-english.xml',
     'https://phys.org/rss-feed/',
     'https://www.forbes.com/business/feed/',
     'https://www.cbssports.com/rss/headlines/',
     'https://feeds.npr.org/1004/rss.xml',
     'https://feeds.npr.org/1128/rss.xml',
     'https://www.theguardian.com/world/rss',
     'https://www.aljazeera.com/xml/rss/all.xml'
   );

-- The Hill: its "homenews" feed also carries its sponsored newsletters ("Presented by …",
-- with {beacon} tracking tokens). The news feed has the same stories without them. The old
-- feed's download markers and failures do not apply to the new address.
update public.sources
   set rss_url = 'https://thehill.com/news/feed/',
       etag = null,
       last_modified = null,
       consecutive_failures = 0,
       last_error = null
 where rss_url = 'https://thehill.com/homenews/feed/';

-- The newsletters already fetched from it (none saved by a reader).
delete from public.articles a
 using public.sources s
 where s.id = a.source_id
   and s.rss_url = 'https://thehill.com/news/feed/'
   and (a.summary ~* '^(presented by |welcome to the hill''s )' or a.summary like '%{beacon}%')
   and not exists (select 1 from public.saved_articles sa where sa.article_id = a.id);
