import type { Database } from '@/lib/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
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
  source_id: string;
  source_name: string;
  category_id: string;
  category_name: string;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
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

export type FeedSort = 'latest' | 'for_you';
export type DateRange = 'any' | 'today' | 'week';

export type FeedFilters = {
  categoryIds: string[];
  sourceIds: string[];
  search: string;
  range: DateRange;
  sort: FeedSort;
};

export type CommentItem = {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  username: string;
  avatar_color: string;
  is_own: boolean;
  can_delete: boolean;
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
  source_id: string;
  source_name: string;
  source_enabled: boolean;
  category_id: string;
  category_name: string;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
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
