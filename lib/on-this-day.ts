/*
 * "On this day" for the almanac box on the front page: a few events from
 * Wikipedia's selected anniversaries for today's date (the free Wikimedia
 * feed; text CC BY-SA, credited on the card). The server fetches it once and
 * keeps it for half a day, so the front page never waits on Wikipedia, and
 * the box is simply left out when the feed cannot be reached.
 */

export type HistoryEvent = {
  year: number;
  text: string;
  /** The Wikipedia article about the event, when there is one. */
  url: string | null;
};

export type OnThisDay = {
  /** "14 November" */
  dateLabel: string;
  events: HistoryEvent[];
};

type FeedEvent = {
  year?: number;
  text?: string;
  pages?: { content_urls?: { desktop?: { page?: string } } }[];
};

/** Wars, disasters and crimes are left out when there are enough gentler anniversaries: this is a calm paper. */
const GRIM = /\b(kill|killed|killing|murder|massacre|genocide|crash|crashed|bomb|bombing|attack|attacked|died|dead|death|executed|execution|terror|war|shooting|shot|assassinat|holocaust|ghetto|disaster|explosion|sank|fire)/i;

function clean(text: string): string {
  return text
    .replace(/\s*\((?:pictured|depicted|shown)[^)]*\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Picks `count` events spread across the centuries (oldest, middle, newest),
 * preferring short and gentle ones.
 */
export function pickEvents(feed: FeedEvent[], count = 3): HistoryEvent[] {
  const events = feed
    .filter((event): event is FeedEvent & { year: number; text: string } => typeof event.year === 'number' && typeof event.text === 'string')
    .map((event) => ({ year: event.year, text: clean(event.text), url: event.pages?.[0]?.content_urls?.desktop?.page ?? null }))
    .filter((event) => event.text.length > 20 && event.text.length <= 220);
  const gentle = events.filter((event) => !GRIM.test(event.text));
  const pool = (gentle.length >= count ? gentle : events).sort((a, b) => a.year - b.year);
  if (pool.length <= count) return pool;
  return Array.from({ length: count }, (_, i) => pool[Math.round((i * (pool.length - 1)) / (count - 1))]);
}

export async function getOnThisDay(now: Date = new Date()): Promise<OnThisDay | null> {
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  try {
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${month}/${day}`, {
      headers: { 'User-Agent': 'TheDailyAggregator/2.0 (personal news reader)', Accept: 'application/json' },
      cache: 'force-cache',
      next: { revalidate: 12 * 3600 },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { selected?: FeedEvent[] };
    const events = pickEvents(data.selected ?? []);
    if (events.length === 0) return null;
    const dateLabel = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
    return { dateLabel, events };
  } catch {
    return null;
  }
}
