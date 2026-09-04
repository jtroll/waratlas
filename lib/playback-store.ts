'use client';

import { useSyncExternalStore } from 'react';

/**
 * Tiny external store for the smooth (float) playback year.
 *
 * During auto-play the rAF loop in app/page.tsx advances the year ~60×/s.
 * Committing that into React state re-rendered the whole tree every frame;
 * instead the loop writes the float here and commits React state only when
 * the integer year changes. The only thing that needs the float — the
 * Timeline playhead — subscribes through usePlaybackYear(), so a frame
 * re-renders exactly one small leaf component.
 */

type Listener = () => void;

let currentYear = 0;
const listeners = new Set<Listener>();

function getYear(): number {
  return currentYear;
}

function setYear(year: number): void {
  if (year === currentYear) return;
  currentYear = year;
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const playbackStore = { getYear, setYear, subscribe };

/** The float playback year. Re-renders the calling component per frame
 *  while the loop runs — keep the subscriber small. */
export function usePlaybackYear(): number {
  return useSyncExternalStore(subscribe, getYear, getYear);
}
