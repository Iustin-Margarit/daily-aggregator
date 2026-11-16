'use client';

/* eslint-disable @next/next/no-img-element -- remote images from arbitrary news CDNs */
import { useState } from 'react';
import { Engraving } from '@/components/site/engraving';
import { getCategoryStyle } from '@/lib/category-styles';
import { imageSrcSet, sizedImageUrl } from '@/lib/images';
import { cn } from '@/lib/utils';

/** How wide a photo prints in .news-grid: one column, two from 700px, three from 1100px (the sheet stops at 1440px). */
export const GRID_SIZES = '(min-width: 1100px) min(33vw, 480px), (min-width: 700px) 50vw, 100vw';

type ArticleImageProps = {
  src: string | null;
  alt: string;
  category: string;
  /** The largest pixel width to request from the image CDN (about 2x the widest it is printed). */
  width?: number;
  /** How wide the photo is printed (the img 'sizes'): with it, the browser picks a smaller size from the CDN for small screens. */
  sizes?: string;
  className?: string;
  eager?: boolean;
};

/**
 * Article image that requests a right-sized version from the publisher's CDN,
 * retries the original URL if that fails, and finally shows a placeholder.
 */
export function ArticleImage({ src, alt, category, width = 800, sizes, className, eager = false }: ArticleImageProps) {
  const sized = sizedImageUrl(src, width);
  // Only for the resized attempt: when the CDN fails, the original is tried on its own.
  const srcSet = sizes ? imageSrcSet(src, width) : undefined;
  const [attempt, setAttempt] = useState<'sized' | 'original' | 'failed'>('sized');
  const style = getCategoryStyle(category);

  const current = attempt === 'sized' ? sized : attempt === 'original' ? src : null;

  if (!current) {
    return (
      // No photograph: the section's engraving, as old papers filled a column with a cut.
      <div className={cn('article-placeholder flex items-center justify-center', className)} data-section={style.key ?? undefined} {...(alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true })}>
        <Engraving name={style.engraving} className="h-[56%] max-w-[64%] opacity-80" />
      </div>
    );
  }

  return (
    <img
      key={current}
      src={current}
      srcSet={attempt === 'sized' ? srcSet : undefined}
      sizes={attempt === 'sized' && srcSet ? sizes : undefined}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setAttempt((a) => (a === 'sized' && sized !== src ? 'original' : 'failed'))}
      className={cn('bg-muted object-cover', className)}
    />
  );
}
