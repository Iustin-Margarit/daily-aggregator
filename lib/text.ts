/**
 * Text helpers shared by the ingestion pipeline and the UI.
 * Feed text arrives with HTML tags, CDATA and (sometimes double-) encoded
 * entities; everything that is stored or displayed goes through cleanText().
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
  ldquo: '“',
  rdquo: '”',
  bdquo: '„',
  laquo: '«',
  raquo: '»',
  bull: '•',
  middot: '·',
  trade: '™',
  copy: '©',
  reg: '®',
  deg: '°',
  euro: '€',
  pound: '£',
  yen: '¥',
  cent: '¢',
  times: '×',
  divide: '÷',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  eacute: 'é',
  egrave: 'è',
  aacute: 'á',
  agrave: 'à',
  iacute: 'í',
  oacute: 'ó',
  uacute: 'ú',
  ntilde: 'ñ',
  ccedil: 'ç',
  uuml: 'ü',
  ouml: 'ö',
  auml: 'ä',
  szlig: 'ß',
  zwj: '',
  zwnj: '',
  shy: '',
};

function decodeOnce(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const isHex = entity[1] === 'x' || entity[1] === 'X';
      const codePoint = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (!Number.isFinite(codePoint) || codePoint <= 0 || codePoint > 0x10ffff) return match;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }
    const named = NAMED_ENTITIES[entity.toLowerCase()];
    return named ?? match;
  });
}

/** Decodes HTML entities, including double-encoded ones like `&amp;#8217;`. */
export function decodeEntities(text: string): string {
  let current = text;
  for (let i = 0; i < 3; i++) {
    const next = decodeOnce(current);
    if (next === current) break;
    current = next;
  }
  return current;
}

/** Removes CDATA wrappers, scripts/styles and HTML tags. */
export function stripHtml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<(script|style|iframe|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
    .replace(/<[^>]+>/g, '');
}

/**
 * Unfilled template and tracking placeholders that some feeds leak into their text (The Hill's newsletters print
 * "{beacon}"): a bare name in braces, double braces or double percent signs, like {beacon}, {{ pixel }} or
 * %%tracker%%. Only a single identifier counts, so real text in braces ("{see below}") is left alone.
 */
const PLACEHOLDER = /\{\{\s*[a-z_][\w.-]{0,40}\s*\}\}|\{[a-z_][\w.-]{0,40}\}|%%[a-z_][\w.-]{0,40}%%/gi;

/**
 * Plain, single-line text, the publisher's own characters kept: what ingestion stores (lib/ingestion/normalize.ts),
 * so repeated headlines, searches and muted words compare what the feed really said.
 */
export function plainText(text: string | null | undefined): string {
  if (!text) return '';
  // Decode first so entity-encoded tags (&lt;p&gt;) are stripped too, then
  // decode again for entities that were inside the markup.
  return decodeEntities(stripHtml(decodeEntities(stripHtml(text))))
    .replace(PLACEHOLDER, ' ')
    .replace(/[​-‍﻿]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Typewriter quotes set as printer's quotes ("a" -> “a”, don't -> don’t, '90s -> ’90s), so a summary matches the
 * curly quotes of the headline above it. Opening after the start, a space, a bracket or a dash; closing otherwise.
 */
export function smartQuotes(text: string): string {
  return text
    .replace(/([\p{L}\p{N}])'(?=\p{L})/gu, '$1’')
    .replace(/(^|[\s([{“"—–-])'(?=\d\d)/gu, '$1’')
    .replace(/(^|[\s([{“"—–-])'/gu, '$1‘')
    .replace(/'/g, '’')
    .replace(/(^|[\s([{‘—–-])"/gu, '$1“')
    .replace(/"/g, '”');
}

/** Plain, single-line text safe to render, with printer's quotes. */
export function cleanText(text: string | null | undefined): string {
  return smartQuotes(plainText(text));
}

/** What some feeds put in the author field when there is none ("None" from a Python null, "null", "N/A"). */
const NO_AUTHOR = /^(none|null|undefined|nil|n\/?a|unknown|anonymous|-+)$/i;

/** An author's name fit to print after "By", or null when the feed gave none (empty or a placeholder). */
export function authorName(raw: string | null | undefined): string | null {
  const text = cleanText(raw);
  return text && !NO_AUTHOR.test(text) ? text : null;
}

/** Truncates at a word boundary and appends an ellipsis. */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength + 1);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > maxLength * 0.6 ? slice.slice(0, lastSpace) : slice.slice(0, maxLength);
  return `${cut.replace(/[\s,;:.–—-]+$/, '')}…`;
}
