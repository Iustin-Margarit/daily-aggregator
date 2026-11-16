export type FontSize = 'small' | 'medium' | 'large';

export type Category = {
  id: string;
  name: string;
  sort_order: number;
};

export type SourceOption = {
  id: string;
  name: string;
  category_id: string;
};

/** A row returned by the get_feed RPC. */
export type FeedArticle = {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  slug: string;
  image_url: string | null;
  author: string | null;
  published_at: string;
  /** Minutes to read the original story; null or 0 when unknown. */
  reading_minutes: number | null;
  source_id: string;
  source_name: string;
  category_id: string;
  category_name: string;
  is_saved: boolean;
  /** Only from get_feed: number of stories matching the filters. */
  total_count?: number;
};

export type ArticleDetail = FeedArticle & {
  source_website_url: string | null;
};

export type RelatedArticle = {
  id: string;
  title: string;
  summary: string | null;
  slug: string;
  image_url: string | null;
  published_at: string;
  source_name: string;
  category_name: string;
};

/** What a list of stories shows: some sections (none = every section), one newspaper's feeds (none = all) and, on a search, the words. */
export type FeedFilters = {
  categoryIds: string[];
  sourceIds?: string[];
  search: string;
};

export type SavedFolder = {
  id: string;
  name: string;
};

/** A row returned by the get_saved_articles RPC. */
export type SavedArticle = {
  article_id: string;
  title: string;
  summary: string | null;
  url: string;
  slug: string;
  image_url: string | null;
  published_at: string;
  reading_minutes: number | null;
  source_id: string;
  source_name: string;
  source_enabled: boolean;
  category_id: string;
  category_name: string;
  folder_id: string | null;
  is_read: boolean;
  notes: string | null;
  saved_at: string;
};

/** Standard result shape for Server Actions used with useActionState. */
export type ActionResult = {
  ok: boolean;
  message?: string;
  /** Changes on every submission so effects can react to repeated results. */
  at: number;
};
