# War Atlas — Visual Redesign Brief

## What this project is
War Atlas is an interactive map of every named war in human history — ~1,340 conflicts, ~370 empires with shifting borders, and ~700 historical city-name records spanning ~10,000 BCE to today. Built in Next.js 14 + React 18 + TypeScript on top of Mapbox GL JS. The user scrubs a timeline, watches empires expand and contract over the dark Mapbox basemap, and clicks individual conflicts to see tiered narratives, casualty estimate ranges, source attributions, and parent/child conflict graphs.

## Who it's for
Three audiences in tension:
1. **General curious public** — should feel inviting and browsable, not textbook-dry.
2. **History enthusiasts and educators** — wants depth on demand without dumbing things down.
3. **Researchers and journalists** — needs source attribution, casualty estimate ranges, exportable data (CSV/GeoJSON), and citable per-conflict permalinks.

## What I want
**Premium but seriously scholarly.** Think *The Atlantic*'s long-form interactives, the British Museum's digital exhibits, NYT's data-driven conflict pieces, or Stripe's documentation site. Calm. Confident. Earned authority. Editorial-grade typography. Restrained motion — the map and the timeline are the show, the chrome should recede. Color used like a scholar would: sparingly, meaningfully, no gradients-for-the-sake-of-gradients.

Open to moves like:
- A real serif display face for empire and conflict names (Tiempos, Source Serif, GT Sectra) paired with a clean sans (Inter, Söhne) for UI.
- A genuine typographic hierarchy in the conflict sidebar — right now Hook / Narrative / Significance / Sources / Belligerents all feel about equal weight.
- Rethinking the timeline at the bottom; it's the most-touched element and feels like a generic slider.
- Treating the casualty-range visualization, era panels, and conflict graph as small bespoke data-vis, not generic UI cards.
- Making the opening tour feel like an exhibit guide rather than a wizard.
- Empty states (no conflicts in selected year/region) that feel intentional, not broken.

## Current aesthetic
Near-black dark theme over Mapbox's `dark-v11` style. Tailwind tokens:

```
wars-bg       #0a0e17   deep navy-black canvas
wars-panel    #111827   slate panels
wars-border   #1f2937   hairline dividers
wars-text     #e5e7eb   primary text
wars-muted    #9ca3af   secondary text
wars-red      #e63946   conflict markers (point dots, casualty bar)
wars-accent   #f59e0b   warm amber — current-year ticks, highlights
```

Functional and dense but currently reads more like a developer tool than a finished product: heavy use of tiny text, generic Tailwind borders, utilitarian rounded buttons, weak typographic hierarchy. Mobile-responsive but not delightful on mobile.

## What NOT to change
- Mapbox stays as the map engine; the dark basemap style should be honored.
- Information density — the dataset is the point. Don't strip features.
- Casualty figures must remain visible as **ranges with source attribution**, not just headline numbers. This is a researcher-credibility requirement.
- The solid-vs-dashed empire-border distinction encodes how historically accurate the polygon is — that visual distinction must survive any restyle.
- Disputed-territory disclaimers stay visible.

## Components in the codebase
You'll find these under `components/`:

`TopBar` · `Timeline` · `MapView` · `Sidebar` (conflict detail) · `FilterPanel` · `ConflictListPanel` · `EraPanel` · `BorderLegend` · `CasualtyBar` · `ConflictGraph` · `OpeningTour` · `AboutModal` · `CityTimelineModal` · `ExportMenu` · `DisputedTerritoryNote` · `ErrorBoundary`

The top-level page composition is in `app/page.tsx`. Per-conflict permalink page at `app/c/[id]/page.tsx`. Tailwind tokens live in `tailwind.config.ts`.

## Deliverables I'd love back
1. **Redesigned desktop view** — top bar + map + timeline + open conflict sidebar — at year ~1942 so you have a meaty data state to design against.
2. **Mobile view** of the same state.
3. **Conflict detail sidebar** with a proper typographic hierarchy across Hook / What happened / Why it mattered / Belligerents / Casualty range / Sources / Conflict graph.
4. **The opening tour** restyled as an editorial moment, not a wizard modal.
5. **Casualty-range microvisualization** treated as bespoke data-vis.
6. Any net-new design-system tokens (typography scale, spacing scale, replacement colors, motion timings) called out explicitly so I can carry them back into `tailwind.config.ts` and the components.

## Reference data state to design against
At year **1942**: the Empire of Japan, Nazi Germany, Soviet Union, British Empire, and US are all visible simultaneously; ~30 active conflicts including WWII (with its many sub-conflicts as children in the conflict graph); Manchukuo and Vichy France appear as dashed-border puppet states. This is the densest, most recognizable state and a good stress test for any layout.

At year **-490** (Greco-Persian Wars): much sparser — good for testing how the design holds up at low information density.
