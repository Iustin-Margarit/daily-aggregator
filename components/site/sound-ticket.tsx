'use client';

import '@/styles/street-theatre.css';
import { useSyncExternalStore } from 'react';
import { Ornament } from '@/components/site/ornament';
import { isAmbiencePlaying, isAmbienceStageInView, setAmbience, subscribeAmbience } from '@/lib/ambience';
import { useI18n } from '@/lib/i18n/client';

/**
 * The street sound keeps playing while the reader moves around the site. This
 * ticket waits in the corner whenever it is playing and the banner, with its
 * own Sound ticket, is out of sight, so turning it off is always one click.
 */
export function SoundTicket() {
  const shown = useSyncExternalStore(
    subscribeAmbience,
    () => isAmbiencePlaying() && !isAmbienceStageInView(),
    () => false,
  );
  const { t } = useI18n();
  if (!shown) return null;
  return (
    <button
      type="button"
      className="st-toggle st-sound st-float"
      onClick={() => setAmbience(false)}
      title={t.street.stopTitle}
    >
      <Ornament name="gramophone" className="h-[1.2rem] [--ornament-ink:currentColor]" />
      {t.street.stop}
    </button>
  );
}
