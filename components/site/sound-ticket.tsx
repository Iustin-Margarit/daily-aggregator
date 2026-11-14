'use client';

import '@/styles/street-theatre.css';
import { useSyncExternalStore } from 'react';
import { Ornament } from '@/components/site/ornament';
import { isAmbiencePlaying, isAmbienceStageInView, setAmbience, subscribeAmbience } from '@/lib/ambience';

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
  if (!shown) return null;
  return (
    <button
      type="button"
      className="st-toggle st-sound st-float"
      onClick={() => setAmbience(false)}
      title="The Victorian street sound is playing: click to stop it"
    >
      <Ornament name="gramophone" className="h-[1.2rem] [--ornament-ink:currentColor]" />
      Stop sound
    </button>
  );
}
