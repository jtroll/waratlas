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
 *
 * The store also derives the live playback rate (years per second) from
 * consecutive frames. That value is published on a separate, throttled
 * channel (usePlaybackRate, ≤ 4 updates/s, only when the displayed value
 * changes) so the "▶ 2.1 yr/s" readout never re-renders per frame.
 */

type Listener = () => void;

let currentYear = 0;
const listeners = new Set<Listener>();

// ── Rate tracking ────────────────────────────────────────────────
// Exponential moving average of Δyear/Δt over frames. A gap of more than
// RATE_RESET_MS between writes means the loop was not running (a seek, or
// Play just pressed), so the average restarts instead of spiking.
const RATE_RESET_MS = 400;
const RATE_ALPHA = 0.15;
const RATE_PUBLISH_MS = 250;

let lastWriteAt = -Infinity;
let smoothedRate = 0;          // yr/s, EMA
let publishedRate = 0;         // last value handed to subscribers (1 dp)
let lastPublishAt = -Infinity;
const rateListeners = new Set<Listener>();

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function trackRate(prevYear: number, nextYear: number): void {
  const t = now();
  const dt = (t - lastWriteAt) / 1000;
  lastWriteAt = t;
  if (!(dt > 0) || dt * 1000 > RATE_RESET_MS) {
    smoothedRate = 0;
    return;
  }
  const inst = (nextYear - prevYear) / dt;
  if (!Number.isFinite(inst)) return;
  smoothedRate = smoothedRate === 0 ? inst : smoothedRate + RATE_ALPHA * (inst - smoothedRate);
  if (t - lastPublishAt >= RATE_PUBLISH_MS) {
    const rounded = Math.round(Math.max(0, smoothedRate) * 10) / 10;
    lastPublishAt = t;
    if (rounded !== publishedRate) {
      publishedRate = rounded;
      rateListeners.forEach((l) => l());
    }
  }
}

function getYear(): number {
  return currentYear;
}

function setYear(year: number): void {
  if (year === currentYear) return;
  trackRate(currentYear, year);
  currentYear = year;
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getRate(): number {
  return publishedRate;
}

function subscribeRate(listener: Listener): () => void {
  rateListeners.add(listener);
  return () => {
    rateListeners.delete(listener);
  };
}

/** Forget the frame history (call when playback stops) so the next Play
 *  starts from a clean average and the readout does not show a stale
 *  rate. */
function resetRate(): void {
  lastWriteAt = -Infinity;
  smoothedRate = 0;
  if (publishedRate !== 0) {
    publishedRate = 0;
    rateListeners.forEach((l) => l());
  }
}

export const playbackStore = { getYear, setYear, subscribe, getRate, subscribeRate, resetRate };

/** The float playback year. Re-renders the calling component per frame
 *  while the loop runs — keep the subscriber small. */
export function usePlaybackYear(): number {
  return useSyncExternalStore(subscribe, getYear, getYear);
}

/** Smoothed playback rate in years per second, rounded to one decimal and
 *  published at most four times a second. 0 when the loop is idle. */
export function usePlaybackRate(): number {
  return useSyncExternalStore(subscribeRate, getRate, getRate);
}
