'use client';

/* eslint-disable @next/next/no-img-element -- remote images from arbitrary news CDNs */
import { useState } from 'react';
import { Engraving } from '@/components/site/engraving';
import { getCategoryStyle } from '@/lib/category-styles';
import { sizedImageUrl } from '@/lib/images';
import { cn } from '@/lib/utils';

type ArticleImageProps = {
  src: string | null;
  alt: string;
  category: string;
  /** Pixel width to request from the image CDN (about 2x the displayed CSS width). */
  width?: number;
  className?: string;
  eager?: boolean;
};

/**
 * Article image that requests a right-sized version from the publisher's CDN,
 * retries the original URL if that fails, and finally shows a placeholder.
 */
export function ArticleImage({ src, alt, category, width = 800, className, eager = false }: ArticleImageProps) {
  const sized = sizedImageUrl(src, width);
  const [attempt, setAttempt] = useState<'sized' | 'original' | 'failed'>('sized');
  const style = getCategoryStyle(category);

  const current = attempt === 'sized' ? sized : attempt === 'original' ? src : null;

  if (!current) {
    return (
      // No photograph: the section's engraving, as old papers filled a column with a cut.
      <div className={cn('article-placeholder flex items-center justify-center', className)} data-section={style.key ?? undefined} role="img" aria-label={alt}>
        <Engraving name={style.engraving} className="h-[56%] max-w-[64%] opacity-80" />
      </div>
    );
  }

  return (
    <img
      key={current}
      src={current}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setAttempt((a) => (a === 'sized' && sized !== src ? 'original' : 'failed'))}
      className={cn('bg-muted object-cover', className)}
    />
  );
}
