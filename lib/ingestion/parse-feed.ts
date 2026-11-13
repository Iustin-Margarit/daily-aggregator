import { XMLParser } from 'fast-xml-parser';

export type ParsedFeedItem = {
  title: string;
  link: string | null;
  /** Short description / summary (may contain HTML). */
  summaryHtml: string | null;
  /** Full content (content:encoded / Atom content), may contain HTML. */
  contentHtml: string | null;
  imageUrl: string | null;
  author: string | null;
  published: string | null;
};

export type ParsedFeed = {
  title: string | null;
  link: string | null;
  items: ParsedFeedItem[];
};

// Tags that may repeat and should always be parsed as arrays.
const ARRAY_TAGS = new Set([
  'item',
  'entry',
  'link',
  'atom:link',
  'media:content',
  'media:thumbnail',
  'enclosure',
  'category',
  'author',
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: true,
  htmlEntities: true,
  ignoreDeclaration: true,
  ignorePiTags: true,
  isArray: (name) => ARRAY_TAGS.has(name),
});

type XmlNode = string | number | boolean | XmlObject | XmlNode[] | null | undefined;
type XmlObject = { [key: string]: XmlNode };

function asArray(node: XmlNode): XmlNode[] {
  if (node == null) return [];
  return Array.isArray(node) ? node : [node];
}

function isObject(node: XmlNode): node is XmlObject {
  return typeof node === 'object' && node !== null && !Array.isArray(node);
}

/** Text content of a node: handles plain strings, {#text} objects and arrays. */
function textOf(node: XmlNode): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number' || typeof node === 'boolean') return String(node);
  if (Array.isArray(node)) {
    for (const child of node) {
      const text = textOf(child);
      if (text) return text;
    }
    return '';
  }
  return textOf(node['#text']);
}

function attr(node: XmlNode, name: string): string {
  return isObject(node) ? textOf(node[`@_${name}`]) : '';
}

function firstText(...nodes: XmlNode[]): string | null {
  for (const node of nodes) {
    const text = textOf(node).trim();
    if (text) return text;
  }
  return null;
}

const IMAGE_EXTENSION = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i;

/** Picks the widest image from media:content / media:thumbnail style nodes. */
function bestMediaImage(nodes: XmlNode[]): string | null {
  let best: { url: string; width: number } | null = null;
  for (const node of nodes) {
    const url = attr(node, 'url');
    if (!url) continue;
    const medium = attr(node, 'medium');
    const type = attr(node, 'type');
    const looksLikeImage =
      medium === 'image' || type.startsWith('image/') || (!medium && !type && IMAGE_EXTENSION.test(url));
    if (!looksLikeImage) continue;
    const width = Number.parseInt(attr(node, 'width'), 10) || 0;
    if (!best || width > best.width) best = { url, width };
  }
  return best?.url ?? null;
}

/** First meaningful <img src> inside an HTML fragment (skips 1x1 tracking pixels). */
export function firstImageInHtml(html: string | null): string | null {
  if (!html) return null;
  const tags = html.match(/<img\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (!src) continue;
    if (/\b(width|height)\s*=\s*["']?1["'\s/>]/i.test(tag)) continue;
    if (/feedburner\.com\/~|doubleclick|\/pixel|tracking|\.svg(\?|$)/i.test(src)) continue;
    return src;
  }
  return null;
}

function itemImage(item: XmlObject, summaryHtml: string | null, contentHtml: string | null): string | null {
  const group = asArray(item['media:group']);
  const groupContent = group.flatMap((g) => (isObject(g) ? asArray(g['media:content']) : []));
  const groupThumbs = group.flatMap((g) => (isObject(g) ? asArray(g['media:thumbnail']) : []));

  const fromMedia =
    bestMediaImage(asArray(item['media:content'])) ??
    bestMediaImage(groupContent) ??
    bestMediaImage(asArray(item['media:thumbnail']).map(markAsImage)) ??
    bestMediaImage(groupThumbs.map(markAsImage));
  if (fromMedia) return fromMedia;

  for (const enclosure of asArray(item.enclosure)) {
    const url = attr(enclosure, 'url') || attr(enclosure, 'href');
    const type = attr(enclosure, 'type');
    if (url && (type.startsWith('image/') || (!type && IMAGE_EXTENSION.test(url)))) return url;
  }

  // Atom: <link rel="enclosure" type="image/jpeg" href="..."/>
  for (const link of asArray(item.link)) {
    if (attr(link, 'rel') === 'enclosure' && attr(link, 'type').startsWith('image/')) {
      return attr(link, 'href') || null;
    }
  }

  const itunes = attr(item['itunes:image'], 'href');
  if (itunes) return itunes;

  return firstImageInHtml(contentHtml) ?? firstImageInHtml(summaryHtml);
}

// media:thumbnail is always an image even without a type attribute.
function markAsImage(node: XmlNode): XmlNode {
  return isObject(node) ? { ...node, '@_medium': 'image' } : node;
}

function itemLink(item: XmlObject): string | null {
  const links = asArray(item.link);
  // Atom style: <link rel="alternate" href="..."/>
  const alternate =
    links.find((l) => attr(l, 'href') && (!attr(l, 'rel') || attr(l, 'rel') === 'alternate')) ??
    links.find((l) => attr(l, 'href') && attr(l, 'rel') !== 'self' && attr(l, 'rel') !== 'enclosure');
  if (alternate) return attr(alternate, 'href');

  // RSS style: <link>https://...</link>
  const textLink = links.map((l) => textOf(l).trim()).find(Boolean);
  if (textLink) return textLink;

  const original = firstText(item['feedburner:origLink']);
  if (original) return original;

  const guid = item.guid;
  const guidText = textOf(guid).trim();
  if (guidText && attr(guid, 'isPermaLink') !== 'false' && /^https?:\/\//i.test(guidText)) return guidText;

  return null;
}

function itemAuthor(item: XmlObject): string | null {
  const creator = firstText(item['dc:creator']);
  if (creator) return creator;
  for (const author of asArray(item.author)) {
    // Atom: <author><name>Jane</name></author>; RSS: <author>jane@x.com (Jane)</author>
    const name = isObject(author) ? textOf(author.name) : textOf(author);
    const parenthesised = /\(([^)]+)\)/.exec(name)?.[1];
    const cleaned = (parenthesised ?? name).trim();
    if (cleaned && !/^\S+@\S+$/.test(cleaned)) return cleaned;
  }
  return firstText(item['media:credit']);
}

function toItem(raw: XmlNode): ParsedFeedItem | null {
  if (!isObject(raw)) return null;
  const title = firstText(raw.title, raw['media:title']) ?? '';
  const group = isObject(raw['media:group']) ? (raw['media:group'] as XmlObject) : null;
  const summaryHtml = firstText(raw.description, raw.summary, raw['media:description'], group?.['media:description']);
  const contentHtml = firstText(raw['content:encoded'], raw.content);

  return {
    title,
    link: itemLink(raw),
    summaryHtml,
    contentHtml,
    imageUrl: itemImage(raw, summaryHtml, contentHtml),
    author: itemAuthor(raw),
    published: firstText(raw.pubDate, raw['dc:date'], raw.published, raw.updated, raw['a10:updated']),
  };
}

/** Parses RSS 2.0, RSS 1.0 (RDF) and Atom feeds. Throws if the XML is not a feed. */
export function parseFeed(xml: string): ParsedFeed {
  const doc = parser.parse(xml.replace(/^﻿/, '')) as XmlObject;

  const rss = isObject(doc.rss) ? doc.rss : null;
  const channel = rss ? asArray(rss.channel)[0] : undefined;
  const rdf = isObject(doc['rdf:RDF']) ? (doc['rdf:RDF'] as XmlObject) : null;
  const atom = isObject(doc.feed) ? doc.feed : null;

  let rawItems: XmlNode[];
  let feedTitle: string | null;
  let feedLink: string | null;

  if (isObject(channel)) {
    rawItems = asArray(channel.item);
    // RSS 1.0 puts items next to the channel instead of inside it.
    if (rawItems.length === 0 && rdf) rawItems = asArray(rdf.item);
    feedTitle = firstText(channel.title);
    feedLink = itemLink(channel);
  } else if (rdf) {
    const rdfChannel = asArray(rdf.channel)[0];
    rawItems = asArray(rdf.item);
    feedTitle = isObject(rdfChannel) ? firstText(rdfChannel.title) : null;
    feedLink = isObject(rdfChannel) ? itemLink(rdfChannel) : null;
  } else if (atom) {
    rawItems = asArray(atom.entry);
    feedTitle = firstText(atom.title);
    feedLink = itemLink(atom);
  } else {
    throw new Error('Not an RSS or Atom feed');
  }

  const items = rawItems.map(toItem).filter((item): item is ParsedFeedItem => item !== null);
  return { title: feedTitle, link: feedLink, items };
}
