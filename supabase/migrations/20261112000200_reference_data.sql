-- =============================================================================
-- Reference data: news categories and the RSS sources the app aggregates.
-- All feeds below were verified to be live in November 2026. Admins can add,
-- edit or disable sources later from /admin/sources.
-- =============================================================================

insert into public.categories (name, sort_order) values
  ('World', 10),
  ('Politics', 20),
  ('Business', 30),
  ('Technology', 40),
  ('Science', 50),
  ('Health', 60),
  ('Sports', 70),
  ('Entertainment', 80)
on conflict do nothing;

with feeds (category, name, rss_url, website_url, description) as (
  values
    -- World
    ('World', 'BBC News - World', 'https://feeds.bbci.co.uk/news/world/rss.xml', 'https://www.bbc.com/news/world', 'International news from the BBC'),
    ('World', 'Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml', 'https://www.aljazeera.com', 'Global news from Al Jazeera English'),
    ('World', 'NPR - World', 'https://feeds.npr.org/1004/rss.xml', 'https://www.npr.org/sections/world', 'World coverage from NPR'),
    ('World', 'The Guardian - World', 'https://www.theguardian.com/world/rss', 'https://www.theguardian.com/world', 'World news from The Guardian'),
    -- Politics
    ('Politics', 'NPR - Politics', 'https://feeds.npr.org/1014/rss.xml', 'https://www.npr.org/sections/politics', 'Political news from NPR'),
    ('Politics', 'Politico', 'https://rss.politico.com/politics-news.xml', 'https://www.politico.com', 'Politics and policy news'),
    ('Politics', 'The Hill', 'https://thehill.com/homenews/feed/', 'https://thehill.com', 'Political news from Washington'),
    ('Politics', 'BBC News - Politics', 'https://feeds.bbci.co.uk/news/politics/rss.xml', 'https://www.bbc.com/news/politics', 'UK politics from the BBC'),
    -- Business
    ('Business', 'BBC News - Business', 'https://feeds.bbci.co.uk/news/business/rss.xml', 'https://www.bbc.com/news/business', 'Business news from the BBC'),
    ('Business', 'MarketWatch', 'https://feeds.content.dowjones.io/public/rss/mw_topstories', 'https://www.marketwatch.com', 'Markets and personal finance'),
    ('Business', 'Forbes - Business', 'https://www.forbes.com/business/feed/', 'https://www.forbes.com/business', 'Business news and analysis from Forbes'),
    ('Business', 'CNBC - Top News', 'https://www.cnbc.com/id/100003114/device/rss/rss.html', 'https://www.cnbc.com', 'Top business stories from CNBC'),
    -- Technology
    ('Technology', 'TechCrunch', 'https://techcrunch.com/feed/', 'https://techcrunch.com', 'Startups and technology news'),
    ('Technology', 'Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index', 'https://arstechnica.com', 'Technology, science and policy'),
    ('Technology', 'The Verge', 'https://www.theverge.com/rss/index.xml', 'https://www.theverge.com', 'Technology, science and culture'),
    ('Technology', 'Wired', 'https://www.wired.com/feed/rss', 'https://www.wired.com', 'How technology is changing the world'),
    ('Technology', 'Engadget', 'https://www.engadget.com/rss.xml', 'https://www.engadget.com', 'Gadgets and consumer electronics'),
    -- Science
    ('Science', 'Live Science', 'https://www.livescience.com/feeds.xml', 'https://www.livescience.com', 'Science news and discoveries'),
    ('Science', 'BBC News - Science', 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', 'https://www.bbc.com/news/science_and_environment', 'Science and environment from the BBC'),
    ('Science', 'NASA', 'https://www.nasa.gov/news-release/feed/', 'https://www.nasa.gov', 'NASA news releases'),
    ('Science', 'Phys.org', 'https://phys.org/rss-feed/', 'https://phys.org', 'Physics, space and earth science'),
    -- Health
    ('Health', 'STAT News', 'https://www.statnews.com/feed/', 'https://www.statnews.com', 'Health, medicine and life sciences'),
    ('Health', 'BBC News - Health', 'https://feeds.bbci.co.uk/news/health/rss.xml', 'https://www.bbc.com/news/health', 'Health news from the BBC'),
    ('Health', 'NPR - Health', 'https://feeds.npr.org/1128/rss.xml', 'https://www.npr.org/sections/health', 'Health coverage from NPR'),
    ('Health', 'World Health Organization', 'https://www.who.int/rss-feeds/news-english.xml', 'https://www.who.int', 'News releases from the WHO'),
    -- Sports
    ('Sports', 'ESPN', 'https://www.espn.com/espn/rss/news', 'https://www.espn.com', 'Top sports headlines from ESPN'),
    ('Sports', 'BBC Sport', 'https://feeds.bbci.co.uk/sport/rss.xml', 'https://www.bbc.com/sport', 'Sport from the BBC'),
    ('Sports', 'Sky Sports', 'https://www.skysports.com/rss/12040', 'https://www.skysports.com', 'Sports news from Sky Sports'),
    ('Sports', 'CBS Sports', 'https://www.cbssports.com/rss/headlines/', 'https://www.cbssports.com', 'Headlines from CBS Sports'),
    -- Entertainment
    ('Entertainment', 'Variety', 'https://variety.com/feed/', 'https://variety.com', 'Film, TV and music industry news'),
    ('Entertainment', 'Deadline', 'https://deadline.com/feed/', 'https://deadline.com', 'Hollywood breaking news'),
    ('Entertainment', 'The Hollywood Reporter', 'https://www.hollywoodreporter.com/feed/', 'https://www.hollywoodreporter.com', 'Entertainment news'),
    ('Entertainment', 'BBC News - Entertainment', 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', 'https://www.bbc.com/news/entertainment_and_arts', 'Entertainment and arts from the BBC')
)
insert into public.sources (name, rss_url, website_url, description, category_id)
select f.name, f.rss_url, f.website_url, f.description, c.id
  from feeds f
  join public.categories c on c.name = f.category
on conflict do nothing;
