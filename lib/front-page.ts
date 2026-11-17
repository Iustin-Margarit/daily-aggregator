import type { Category, FeedArticle } from '@/lib/types';

/**
 * One row of get_front_page: a story with its place in its section, among the newest, and among the
 * news most papers carry (lead_rank 1-3), each null when it has none.
 */
export type FrontRow = FeedArticle & { section_rank: number | null; latest_rank: number | null; lead_rank?: number | null };

export type SectionDigest = {
  category: Category;
  /** The section's story with a photograph, printed large (null when none has one). */
  photo: FeedArticle | null;
  /** The next headlines, one line each. */
  lines: FeedArticle[];
};

export type FrontPage = {
  lead: FeedArticle | null;
  /** "Latest dispatches": the newest headlines after the lead. */
  dispatches: FeedArticle[];
  digests: SectionDigest[];
};

/** The sections whose stories may lead the paper (get_front_page's leads use the same names). */
export const LEAD_SECTIONS: readonly string[] = ['World', 'Technology'];

export const DISPATCH_COUNT = 10;
export const DIGEST_LINES = 4;
/** get_front_page's arguments: enough per section to fill a digest after the stories printed above it. */
export const FRONT_PAGE_ARGS = { p_per_section: 8, p_latest: DISPATCH_COUNT + 4 } as const;

const byRank = (key: 'section_rank' | 'latest_rank') => (a: FrontRow, b: FrontRow) => (a[key] ?? 0) - (b[key] ?? 0);

/**
 * The front page from get_front_page's rows:
 * - the lead is the news most papers carry (lead_rank 1: 3+ papers in a day, scored in get_front_page);
 *   only World or Technology stories lead (LEAD_SECTIONS, the same list as get_front_page); when nothing
 *   qualifies, the newest of those with a photograph, else the newest story with a photograph among the
 *   five newest (or the newest);
 * - the dispatches are the next newest headlines;
 * - each section gets a digest of its newest stories not already printed above, in the
 *   paper's order.
 * A section whose stories were all printed above repeats them rather than vanish.
 */
export function buildFrontPage(rows: FrontRow[], categories: Category[]): FrontPage {
  const latest = rows.filter((r) => r.latest_rank !== null).sort(byRank('latest_rank'));
  const covered = rows.find((r) => r.lead_rank === 1);
  const fromDesk = rows
    .filter((r) => r.image_url && LEAD_SECTIONS.includes(r.category_name))
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))[0];
  const withPhoto = latest.slice(0, 5).find((r) => r.image_url);
  const lead = covered ?? fromDesk ?? withPhoto ?? latest[0] ?? null;
  const dispatches = latest.filter((r) => r !== lead).slice(0, DISPATCH_COUNT);
  const printed = new Set([lead?.id, ...dispatches.map((r) => r.id)]);

  const digests: SectionDigest[] = [];
  for (const category of categories) {
    const all = rows.filter((r) => r.category_id === category.id && r.section_rank !== null).sort(byRank('section_rank'));
    if (all.length === 0) continue;
    const fresh = all.filter((r) => !printed.has(r.id));
    const stories = fresh.length > 0 ? fresh : all;
    const photo = stories.find((r) => r.image_url) ?? null;
    const lines = stories.filter((r) => r !== photo).slice(0, photo ? DIGEST_LINES : DIGEST_LINES + 1);
    digests.push({ category, photo, lines });
  }
  return { lead, dispatches, digests };
}
