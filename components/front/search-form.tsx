import Form from 'next/form';
import { Ornament } from '@/components/site/ornament';
import { Button } from '@/components/ui/button';
import { SEARCH_PATH } from '@/lib/routes';

/**
 * The search page's form: a field on a ledger line (the brass magnifier, a double
 * rule) and a Search button. A plain GET form to /search?q=…, so it works before
 * the page's scripts load; next/form turns it into a quick in-app visit after.
 */
export function SearchForm({ value, label, placeholder, button }: { value: string; label: string; placeholder: string; button: string }) {
  return (
    <Form action={SEARCH_PATH} role="search" className="mx-auto mt-6 flex w-full max-w-2xl flex-wrap items-end gap-3 sm:flex-nowrap">
      <div className="relative min-w-0 flex-1 basis-full sm:basis-auto">
        <span className="search-glass pointer-events-none absolute left-1.5 top-1/2 z-10 -translate-y-1/2 rotate-[-30deg]" aria-hidden="true">
          <Ornament name="magnifier" className="block h-[1.45rem]" />
        </span>
        <input
          type="search"
          name="q"
          defaultValue={value}
          placeholder={placeholder}
          aria-label={label}
          maxLength={100}
          autoFocus={!value}
          enterKeyHint="search"
          className="ledger-field text-[1.1rem]"
        />
      </div>
      <Button type="submit" size="lg" className="h-12 shrink-0 px-6">
        {button}
      </Button>
    </Form>
  );
}
