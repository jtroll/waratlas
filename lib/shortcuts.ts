/**
 * Keyboard shortcuts owned by the map / page layer. The About modal renders
 * its own list of timeline shortcuts; it can import MAP_SHORTCUTS and append
 * these so the list stays in one place.
 */
export interface Shortcut {
  /** Key(s) as shown to the user, e.g. "[ / ]". */
  keys: string;
  /** What it does. */
  description: string;
}

export const MAP_SHORTCUTS: readonly Shortcut[] = [
  {
    keys: '[ / ]',
    description: 'Step through this year’s conflicts by importance (selects and flies to each)',
  },
  {
    keys: '← → ↑ ↓',
    description: 'Pan the map when the map has focus (Tab to the map first); otherwise ← → scrub the timeline',
  },
];
