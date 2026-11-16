/**
 * A press on a link to the very page the reader is on (the tab that is lit up): no reload of the same page,
 * just back to its top, as phone apps do with the tab you are on. Presses that open a new tab or window are
 * left alone.
 */
export function stayOnCurrentPage(event: React.MouseEvent, href: string) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (window.location.pathname + window.location.search !== href) return;
  event.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
