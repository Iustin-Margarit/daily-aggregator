'use client';

import '@/styles/street-theatre.css';
import { useEffect, useSyncExternalStore } from 'react';
import { Ornament } from '@/components/site/ornament';
import {
  isAmbiencePaused,
  isAmbiencePlaying,
  isAmbienceStageInView,
  setAmbience,
  setAmbiencePaused,
  subscribeAmbience,
} from '@/lib/ambience';
import { useI18n } from '@/lib/i18n/client';
import { useReaderPref } from '@/lib/use-reader-pref';

/**
 * The street sound keeps playing while the reader moves around the site. This
 * ticket waits in the corner whenever the sound is audible (on, and the banner
 * not paused) and the banner, with its own Sound ticket, is out of sight, so
 * turning it off is always one click. On phones it is just the gramophone.
 *
 * It is on every page, so it also keeps the sound in step with the banner's
 * Pause setting: a paused banner holds the sound everywhere, not only on the
 * front page.
 */
export function SoundTicket() {
  const paused = useReaderPref('banner') === 'still';
  useEffect(() => setAmbiencePaused(paused), [paused]);
  const shown = useSyncExternalStore(
    subscribeAmbience,
    () => isAmbiencePlaying() && !isAmbiencePaused() && !isAmbienceStageInView(),
    () => false,
  );
  const { t } = useI18n();
  if (!shown) return null;
  return (
    <button
      type="button"
      className="st-toggle st-sound st-float"
      onClick={() => setAmbience(false)}
      aria-label={t.street.stop}
      title={t.street.stopTitle}
    >
      <Ornament name="gramophone" className="h-[1.2rem] [--ornament-ink:currentColor]" />
      <span className="st-float-label">{t.street.stop}</span>
    </button>
  );
}
