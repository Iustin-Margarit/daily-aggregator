'use client';

import { useState } from 'react';
import { Ornament } from '@/components/site/ornament';
import { Button } from '@/components/ui/button';
import { dismissHiddenStory, undoHiddenStory } from '@/lib/hidden-stories';
import { useI18n } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';

/**
 * Printed in a hidden story's place (lib/hidden-stories.ts): a compact dashed slip, "Story hidden", Undo to bring
 * the story back where it was, and × to fold the slip away. It stays until one of those or the next page load.
 */
export function HiddenSlip({ id, className }: { id: string; className?: string }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  return (
    <div role="status" className={cn('flex w-full items-center gap-2.5 rounded-[2px] border border-dashed border-rule/55 bg-card/40 py-2 pl-3 pr-1.5', className)}>
      <Ornament name="scissors" className="h-[0.75rem] shrink-0 [--ornament-ink:var(--brass-ink)]" />
      <p className="min-w-0 flex-1 leading-snug">
        <span className="block font-display text-[0.98rem] font-semibold">{t.story.hiddenSlip}</span>
        <span className="block text-[0.82rem] italic text-muted-foreground">{t.story.hiddenSlipNote}</span>
      </p>
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await undoHiddenStory(id);
          setBusy(false);
        }}
        className="shrink-0"
      >
        {t.common.undo}
      </Button>
      <button
        type="button"
        onClick={() => dismissHiddenStory(id)}
        aria-label={t.story.dismissSlip}
        title={t.story.dismissSlip}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] text-muted-foreground hover:text-foreground focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <span aria-hidden="true" className="font-display text-[1.35rem] leading-none">
          ×
        </span>
      </button>
    </div>
  );
}
