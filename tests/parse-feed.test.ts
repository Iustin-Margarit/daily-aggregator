import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { firstImageInHtml, parseFeed } from '../lib/ingestion/parse-feed';

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Example News</title>
    <link>https://news.example.com</link>
    <atom:link href="https://news.example.com/feed" rel="self" type="application/rss+xml"/>
    <item>
      <title><![CDATA[Markets rally &amp; tech leads]]></title>
      <link>https://news.example.com/markets?utm_source=rss</link>
      <description><![CDATA[<p>Stocks rose on <b>Tuesday</b>.</p>]]></description>
      <pubDate>Thu, 12 Nov 2026 11:21:25 GMT</pubDate>
      <dc:creator>Jane Doe</dc:creator>
      <media:content url="https://img.example.com/small.jpg" medium="image" width="240"/>
      <media:content url="https://img.example.com/large.jpg" medium="image" width="1200"/>
    </item>
    <item>
      <title>Second story</title>
      <guid isPermaLink="true">https://news.example.com/second</guid>
      <enclosure url="https://img.example.com/second.png" type="image/png" length="1"/>
      <content:encoded><![CDATA[<p>Full text</p>]]></content:encoded>
    </item>
    <item>
      <title>Thumbnail only</title>
      <link>https://news.example.com/third</link>
      <media:thumbnail url="https://img.example.com/thumb.jpg" width="240" height="135"/>
      <author>editor@example.com (Sam Writer)</author>
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title type="text">Atom Example</title>
  <link rel="alternate" href="https://atom.example.com/"/>
  <link rel="self" href="https://atom.example.com/feed.xml"/>
  <entry>
    <title type="html">Atom &lt;em&gt;entry&lt;/em&gt;</title>
    <link rel="alternate" type="text/html" href="https://atom.example.com/entry-1"/>
    <link rel="enclosure" type="image/jpeg" href="https://atom.example.com/entry-1.jpg"/>
    <updated>2026-11-12T10:00:00Z</updated>
    <summary>Short summary</summary>
    <author><name>Alex Atom</name></author>
  </entry>
</feed>`;

const RDF = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel rdf:about="https://rdf.example.com/"><title>RDF Example</title><link>https://rdf.example.com/</link></channel>
  <item rdf:about="https://rdf.example.com/1">
    <title>RDF item</title>
    <link>https://rdf.example.com/1</link>
    <dc:date>2026-11-11T08:30:00+00:00</dc:date>
  </item>
</rdf:RDF>`;

describe('parseFeed', () => {
  it('parses RSS 2.0 items, CDATA, authors and the widest media image', () => {
    const feed = parseFeed(RSS);
    assert.equal(feed.title, 'Example News');
    assert.equal(feed.link, 'https://news.example.com');
    assert.equal(feed.items.length, 3);

    const [first, second, third] = feed.items;
    // CDATA is returned verbatim (XML rules); normalizeItem() decodes entities later.
    assert.equal(first.title, 'Markets rally &amp; tech leads');
    assert.equal(first.link, 'https://news.example.com/markets?utm_source=rss');
    assert.match(first.summaryHtml ?? '', /Stocks rose/);
    assert.equal(first.imageUrl, 'https://img.example.com/large.jpg');
    assert.equal(first.author, 'Jane Doe');
    assert.equal(first.published, 'Thu, 12 Nov 2026 11:21:25 GMT');

    assert.equal(second.link, 'https://news.example.com/second', 'falls back to a permalink guid');
    assert.equal(second.imageUrl, 'https://img.example.com/second.png', 'uses image enclosures');
    assert.match(second.contentHtml ?? '', /Full text/);

    assert.equal(third.imageUrl, 'https://img.example.com/thumb.jpg', 'uses media:thumbnail');
    assert.equal(third.author, 'Sam Writer', 'extracts the name from "email (Name)"');
  });

  it('parses Atom feeds', () => {
    const feed = parseFeed(ATOM);
    assert.equal(feed.title, 'Atom Example');
    assert.equal(feed.link, 'https://atom.example.com/');
    assert.equal(feed.items.length, 1);
    const [entry] = feed.items;
    assert.equal(entry.link, 'https://atom.example.com/entry-1');
    assert.equal(entry.imageUrl, 'https://atom.example.com/entry-1.jpg');
    assert.equal(entry.author, 'Alex Atom');
    assert.equal(entry.published, '2026-11-12T10:00:00Z');
    assert.match(entry.title, /Atom/);
  });

  it('parses RSS 1.0 (RDF) feeds', () => {
    const feed = parseFeed(RDF);
    assert.equal(feed.title, 'RDF Example');
    assert.equal(feed.items.length, 1);
    assert.equal(feed.items[0].link, 'https://rdf.example.com/1');
    assert.equal(feed.items[0].published, '2026-11-11T08:30:00+00:00');
  });

  it('rejects documents that are not feeds', () => {
    assert.throws(() => parseFeed('<html><body>Not a feed</body></html>'), /Not an RSS or Atom feed/);
  });
});

describe('firstImageInHtml', () => {
  it('skips tracking pixels and returns the first real image', () => {
    const html =
      '<img src="https://feeds.feedburner.com/~r/x/~4/abc" width="1" height="1"/><p>Text</p><img alt="x" src="https://img.example.com/photo.jpg">';
    assert.equal(firstImageInHtml(html), 'https://img.example.com/photo.jpg');
  });

  it('returns null when there is no image', () => {
    assert.equal(firstImageInHtml('<p>No images here</p>'), null);
    assert.equal(firstImageInHtml(null), null);
  });
});
