/*
 * "On this day" for the almanac box on the front page: a few events from
 * Wikipedia's selected anniversaries for today's date (the free Wikimedia
 * feed; text CC BY-SA, credited on the card). The server fetches it once and
 * keeps it for half a day, so the front page never waits on Wikipedia, and
 * the box is simply left out when the feed cannot be reached. Each edition
 * reads its own Wikipedia (the French edition reads fr.wikipedia.org, and so on).
 */

import type { Locale } from '@/lib/i18n/config';
import { capitalize, translator } from '@/lib/i18n';

export type HistoryEvent = {
  year: number;
  text: string;
  /** The Wikipedia article about the event, when there is one. */
  url: string | null;
};

export type OnThisDay = {
  /** "14 November", "14 novembre", ... */
  dateLabel: string;
  /** The Wikipedia page credited under the events. */
  source: string;
  events: HistoryEvent[];
};

type FeedEvent = {
  year?: number;
  text?: string;
  pages?: { content_urls?: { desktop?: { page?: string } } }[];
};

/** Wars, disasters and crimes are left out when there are enough gentler anniversaries: this is a calm paper. */
const GRIM: Record<Locale, RegExp> = {
  en: /\b(kill|killed|killing|murder|massacre|genocide|crash|crashed|bomb|bombing|attack|attacked|died|dead|death|executed|execution|terror|war|shooting|shot|assassinat|holocaust|ghetto|disaster|explosion|sank|fire)/i,
  fr: /\b(tu[ée]|meurtre|massacre|g[ée]nocide|guerre|bataille|attentat|attaque|bombard|bombe|explosion|incendie|mort|meurt|ex[ée]cut|assassin|terror|holocauste|ghetto|catastrophe|naufrage|fusillade|s[ée]isme|crash)/i,
  es: /\b(muert|muere|mat[aó]|asesin|masacre|genocidio|guerra|batalla|atentado|ataque|bombarde|bomba|explosi[oó]n|incendio|ejecu|terror|holocausto|gueto|cat[aá]strofe|desastre|naufrag|tiroteo|terremoto|accidente)/i,
  de: /\b(get[öo]tet|t[öo]tet|mord|ermord|massaker|v[öo]lkermord|krieg|schlacht|anschlag|angriff|bomb|explosion|brand\b|großbrand|tod\b|tote|stirbt|starb|hingerichtet|hinrichtung|terror|holocaust|ghetto|katastrophe|ungl[üu]ck|erschossen|erdbeben|absturz|versenkt|sinkt)/i,
};

/** Only a plain https link from the feed is kept (never javascript: or any other scheme). */
function safeLink(value: unknown): string | null {
  return typeof value === 'string' && /^https:\/\//i.test(value) ? value : null;
}

function clean(text: string, tag: string): string {
  // The French feed starts its lines in lower case ("début de ..."); a dated paragraph starts with a capital.
  return capitalize(
    text
      .replace(/\s*\((?:pictured|depicted|shown|photo|en photo|en la imagen|im Bild)[^)]*\)/gi, '')
      .replace(/\s+/g, ' ')
      .trim(),
    tag,
  );
}

/**
 * Picks `count` events spread across the centuries (oldest, middle, newest),
 * preferring short and gentle ones.
 */
export function pickEvents(feed: FeedEvent[], count = 3, locale: Locale = 'en'): HistoryEvent[] {
  const { tag } = translator(locale);
  const events = feed
    .filter((event): event is FeedEvent & { year: number; text: string } => typeof event.year === 'number' && typeof event.text === 'string')
    .map((event) => ({ year: event.year, text: clean(event.text, tag), url: safeLink(event.pages?.[0]?.content_urls?.desktop?.page) }))
    .filter((event) => event.text.length > 20 && event.text.length <= 220);
  const gentle = events.filter((event) => !GRIM[locale].test(event.text));
  const pool = (gentle.length >= count ? gentle : events).sort((a, b) => a.year - b.year);
  if (pool.length <= count) return pool;
  return Array.from({ length: count }, (_, i) => pool[Math.round((i * (pool.length - 1)) / (count - 1))]);
}

export async function getOnThisDay(now: Date = new Date(), locale: Locale = 'en'): Promise<OnThisDay | null> {
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  try {
    const response = await fetch(`https://${locale}.wikipedia.org/api/rest_v1/feed/onthisday/selected/${month}/${day}`, {
      headers: { 'User-Agent': 'TheDailyAggregator/2.0 (personal news reader)', Accept: 'application/json' },
      cache: 'force-cache',
      next: { revalidate: 12 * 3600 },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { selected?: FeedEvent[] };
    const events = pickEvents(data.selected ?? [], 3, locale);
    if (events.length === 0) return null;
    const source = locale === 'en' ? 'https://en.wikipedia.org/wiki/Wikipedia:Selected_anniversaries' : `https://${locale}.wikipedia.org/`;
    return { dateLabel: translator(locale).dates.dayMonth(now), source, events };
  } catch {
    return null;
  }
}
