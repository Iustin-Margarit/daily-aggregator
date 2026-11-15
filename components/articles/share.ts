/**
 * Shares a link: the phone's own share sheet on touch screens (Web Share API),
 * otherwise the clipboard. Desktops copy too, even where they have a share
 * dialog: a copied link is what people expect from a mouse.
 */
export async function shareLink(title: string, url: string): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  if (touch && typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, url });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export function articleShareUrl(slug: string): string {
  return `${window.location.origin}/article/${slug}`;
}
