'use client';

import '@/styles/editions.css';
import { useRef } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { Ornament } from '@/components/site/ornament';
import { Spinner } from '@/components/ui/spinner';
import { isLocale, LOCALE_INFO, LOCALES } from '@/lib/i18n/config';
import { useChangeLocale, useI18n } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';

/**
 * The Editions selector: the language of the paper, chosen from a printed
 * dispatch slip (styles/editions.css). Every edition is listed in its own
 * language with a typed ink-stamp monogram; the one in hand is inked solid and
 * pointed at by a printer's fist. Changing it reprints the page at once and is
 * remembered on this device (lib/i18n/client.tsx).
 *
 * - `line`: "English Edition ▾" in small capitals beside the engraved globe,
 *   for the masthead's edition line and the sign-in pages;
 * - `seal`: the edition's stamp alone, for the header bar.
 */
export function EditionSelector({
  variant = 'line',
  align = 'start',
  className,
}: {
  variant?: 'line' | 'seal';
  align?: 'start' | 'center' | 'end';
  className?: string;
}) {
  const { locale, t, fmt } = useI18n();
  const { change, pending } = useChangeLocale();
  const info = LOCALE_INFO[locale];
  const label = fmt(t.editions.trigger, { edition: info.edition });
  const trigger = useRef<HTMLButtonElement>(null);
  // Opened with the mouse or a finger: focus returns to the trigger quietly, without a focus ring left round it.
  const byPointer = useRef(false);

  return (
    // Non-modal, like every menu here: a modal menu can leave the page unclickable (components/ui/dropdown-menu.tsx).
    <Menu.Root modal={false}>
      <Menu.Trigger
        ref={trigger}
        aria-label={label}
        title={label}
        onPointerDown={() => (byPointer.current = true)}
        onKeyDown={() => (byPointer.current = false)}
        className={cn('inline-flex', variant === 'line' ? 'edition-line' : 'edition-seal-button', className)}
      >
        {variant === 'line' ? (
          <>
            <Ornament name="globe" className="h-[1.05rem] [--ornament-ink:currentColor]" />
            <span className="edition-line-name" lang={info.htmlLang}>
              {info.edition}
            </span>
          </>
        ) : (
          <span className="edition-stamp" aria-hidden="true">
            {info.monogram}
          </span>
        )}
        {pending ? <Spinner className="h-3 w-3" /> : <span className="edition-caret" aria-hidden="true">▾</span>}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align={align}
          sideOffset={6}
          collisionPadding={16}
          onCloseAutoFocus={(event) => {
            if (!byPointer.current) return;
            event.preventDefault();
            trigger.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
          }}
          className="card-paper edition-slip z-50 bg-popover text-popover-foreground shadow-float"
        >
          <div className="edition-slip-head">
            <Ornament name="globe" className="h-9 [--ornament-ink:var(--brass-ink)]" />
            <div className="min-w-0">
              <Menu.Label className="label text-(--brass-ink)">{t.editions.kicker}</Menu.Label>
              <p className="font-display text-[1.15rem] font-semibold italic leading-tight">{t.editions.title}</p>
            </div>
          </div>
          <Menu.RadioGroup value={locale} onValueChange={(next) => isLocale(next) && next !== locale && change(next)}>
            {LOCALES.map((code) => {
              const edition = LOCALE_INFO[code];
              return (
                <Menu.RadioItem key={code} value={code} className="edition-row">
                  <span className="edition-stamp" aria-hidden="true">
                    {edition.monogram}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span lang={edition.htmlLang} className="block font-display text-[1.05rem] font-semibold leading-tight">
                      {edition.edition}
                    </span>
                    <span className="block text-[0.8rem] italic leading-snug text-muted-foreground">{t.editions.gloss[code]}</span>
                  </span>
                  <Menu.ItemIndicator className="flex shrink-0">
                    {/* A printer's fist pointing back at the edition in hand (☜). */}
                    <span className="-scale-x-100">
                      <Ornament name="fist" className="block w-[1.35rem] [--ornament-ink:var(--ink-accent)]" />
                    </span>
                    <span className="sr-only">({t.editions.current})</span>
                  </Menu.ItemIndicator>
                </Menu.RadioItem>
              );
            })}
          </Menu.RadioGroup>
          <p className="edition-slip-note">{t.editions.note}</p>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
