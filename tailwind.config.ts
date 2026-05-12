import type { Config } from 'tailwindcss'

/**
 * War Atlas — design tokens carried back from the redesign handoff.
 * Source of truth lives in app/globals.css under :root (OKLCH values + CSS
 * vars for fonts/spacing/motion). Tailwind reads them here so utilities like
 * `bg-wars-bg`, `text-wars-text`, `font-display` resolve to the same values.
 *
 * Editorial scholarly direction:
 *   - Source Serif 4 for empire/conflict names + narrative body
 *   - Inter Tight for UI labels and chrome
 *   - JetBrains Mono for data, IDs, coordinates, ticks
 *   - Warm parchment ivory text instead of cold gray
 *   - Oxidized vermilion instead of fire-engine red
 *   - Single amber accent — current year, editorial highlights only
 *   - Hairlines via opacity, not new gray ramps
 *   - Radii ≤ 4px (atlases don't have rounded corners)
 */
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ─ Surface (cool ink base, kept low-chroma so the basemap reads as the
        //   darkest thing on screen) ─
        'wars-bg':       'oklch(0.16 0.012 250)', // canvas under the map
        'wars-panel':    'oklch(0.20 0.014 250)', // panel surface
        'wars-surface':  'oklch(0.24 0.014 250)', // raised surface / chip — NEW
        'wars-border':   'oklch(0.30 0.014 250)', // strong divider

        // ─ Text (warm ivory, hue 85) ─
        'wars-text':     'oklch(0.94 0.012 85)',  // primary
        'wars-text-2':   'oklch(0.78 0.012 85)',  // secondary — NEW
        'wars-muted':    'oklch(0.62 0.010 85)',  // tertiary / labels
        'wars-faint':    'oklch(0.46 0.008 85)',  // meta / IDs — NEW

        // ─ Editorial accents (chroma 0.14, vary by hue) ─
        'wars-red':      'oklch(0.62 0.18 28)',   // oxidized vermilion
        'wars-red-dim':  'oklch(0.50 0.16 28)',   // darker vermilion pair
        'wars-accent':   'oklch(0.78 0.14 78)',   // amber — current year, single highlight
        'wars-indigo':   'oklch(0.58 0.14 264)',  // researcher links / sources — NEW
        'wars-moss':     'oklch(0.62 0.10 145)',  // "active in this year" only — NEW
        'wars-uncertain':'oklch(0.66 0.06 78)',   // dashed-border accent — NEW
      },
      fontFamily: {
        display: ['var(--font-display)', '"Source Serif 4"', '"Source Serif Pro"', 'Georgia', 'serif'],
        ui:      ['var(--font-ui)', '"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
        sans:    ['var(--font-ui)', '"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', '"JetBrains Mono"', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Editorial type scale. Pairs (size, lineHeight) per the handoff.
        'display-xl':   ['34px', { lineHeight: '36px', letterSpacing: '-0.018em' }],
        'display-l':    ['26px', { lineHeight: '29px', letterSpacing: '-0.018em' }],
        'display-m':    ['20px', { lineHeight: '23px', letterSpacing: '-0.012em' }],
        'display-s':    ['17px', { lineHeight: '22px', letterSpacing: '-0.005em' }],
        'body':         ['14px', { lineHeight: '22px', letterSpacing: '-0.005em' }],
        'body-s':       ['13px', { lineHeight: '20px', letterSpacing: '-0.005em' }],
        'ui':           ['12.5px', { lineHeight: '18px' }],
        'meta':         ['11px',  { lineHeight: '15px' }],
        'eyebrow':      ['10.5px', { lineHeight: '14px', letterSpacing: '0.10em' }],
        'mono':         ['11px',  { lineHeight: '15px', letterSpacing: '0.02em' }],
        'mono-xs':      ['10px',  { lineHeight: '13px', letterSpacing: '0.02em' }],
      },
      spacing: {
        'gutter': '24px',
        'column': '16px',
        'inset': '12px',
        'inset-s': '8px',
        'inset-xs': '4px',
      },
      borderRadius: {
        card: '4px',
        chip: '2px',
      },
      boxShadow: {
        panel: '0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 32px -16px rgba(0,0,0,0.6)',
        pop:   '0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 40px -18px rgba(0,0,0,0.8)',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.32, 0.72, 0, 1)',
        out:      'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '180ms',
        slow: '280ms',
      },
    },
  },
  plugins: [],
}
export default config
