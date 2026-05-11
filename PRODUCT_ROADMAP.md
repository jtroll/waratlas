# Wars Atlas — Product Roadmap to "Press-Ready"

Five parallel audits assessed: UX polish, educational value, researcher credibility, public sensitivity, and technical readiness. Detailed reports are in `outputs/audit_*.md`. This is the synthesis.

## TL;DR — Where the product stands today

The interactive mechanics are solid. The data backbone is real. The map renders beautifully. **What's missing is the connective tissue that turns a reference into an experience worth viral attention and a citation worth professional trust.**

Three strategic gaps came up in every audit independently:

1. **No methodology layer.** The user can't see WHERE the data came from, WHAT a dashed border means, or HOW casualties were estimated. Without this, the app fails the first check from a researcher and the second check from a critical Twitter audience.
2. **No narrative layer.** Users see facts (when, where, who) but not stories (why, what changed, what connects). 79% of conflict descriptions are under 100 characters.
3. **No defensive layer.** Contested borders (Crimea, Taiwan, Palestine, Kashmir), contested terminology ("Indian Mutiny" vs. "Rebellion"), Eurocentric importance ratings, and casualty figures shown as point estimates rather than ranges — every one of these is a viral hot take waiting to happen.

These three gaps are connected: solving methodology transparency simultaneously protects against criticism AND builds researcher trust AND lets the educational layer tell better stories.

---

## Priority Matrix — by impact × effort

### 🔴 P0 — Ship-blockers if going wide

These should land before the project is shared in any high-traffic context.

| # | Item | Source | Effort |
|---|---|---|---|
| 1 | **"About the Data" page** — methodology, sources, accuracy classification, casualty methodology, known biases. Single static page; link from header. | Credibility, Sensitivity | 1 day |
| 2 | **Empire border legend** — solid = real political/coastal borders, dashed = approximate historical extent. Visible in the UI, not hidden in docs. | UX, Credibility | 2 hours |
| 3 | **Disputed-territory disclaimers** — Crimea, Taiwan, Kashmir, Israel/Palestine, Tibet, Western Sahara, Northern Cyprus, Somaliland. Tooltip on hover for current contested regions. | Sensitivity | 1 day |
| 4 | **Mobile responsive layout** — currently unusable on phones (sidebars hardcoded 448px on 375px screen). Add breakpoints, drawer pattern. | UX, Technical | 2-3 days |
| 5 | **Error boundaries + missing-token fallback** — app currently crashes silently if Mapbox token expires or JSON 404s. | Technical | 4 hours |
| 6 | **Casualty figures as ranges** — present "3M (est. 1–5M)" with source attribution rather than single numbers, especially for contested events. | Credibility, Sensitivity | 1 day data + 4h UI |
| 7 | **Fix 152 broken `partOf` references** — orphaned parent-war links suggest data wasn't validated. | Credibility | 2 hours |

### 🟡 P1 — Differentiators that make it remarkable

These are what turn a "neat tool" into something The Atlantic would actually feature.

| # | Item | Source | Effort |
|---|---|---|---|
| 8 | **Tiered conflict descriptions** — currently 79% are <100 chars. Expand top 200 importance-rated conflicts to: hook (1 sentence) → causal narrative (paragraph) → significance (paragraph). | Educational | 30-50 hours data work |
| 9 | **Per-conflict permalinks + OG images** — `/c/world-war-2` route with proper `<title>`, meta description, generated preview card. Critical for sharing and SEO. | Technical, UX | 1 day |
| 10 | **Deep links by year** — `?year=1492&lat=...&lon=...&zoom=...` so professors can link to "the world in 1492". | Technical, Credibility | 4 hours |
| 11 | **Guided opening tour** — first-time visitor: 60-second cinematic playthrough hitting Bronze Age → Classical → Medieval → 20th century with brief annotations. Currently the first impression is a static map. | UX, Educational | 2-3 days |
| 12 | **Conflict graph viewer** — when looking at WWII, show its 30+ child conflicts (Battle of Britain, Pacific Theater, etc.) and parent context. The `partOf` data is there; the UI doesn't exploit it. | Educational, UX | 2-3 days |
| 13 | **Era context panel** — when the timeline crosses an era boundary (Bronze Age → Iron Age, etc.), brief explainer pops in with what defined the era. | Educational | 1-2 days data + 1 day UI |
| 14 | **CSV / GeoJSON export** for date range or region — researchers want this. | Credibility | 1 day |
| 15 | **Audit empire `accurate=false` ratio per region** — currently 87% are dashed. That's honest but means most things on the map are approximations. Try to flip more to solid by sourcing canonical historical atlas data (e.g., Euratlas, Talbert's Barrington Atlas). | Credibility | 1-2 weeks |

### 🟢 P2 — Polish for sustained engagement

| # | Item | Source | Effort |
|---|---|---|---|
| 16 | **Filtering & comparison** — filter by importance, type (civil/colonial/religious/etc.), region, casualty range. Compare two empires or two centuries side-by-side. | Educational | 3-4 days |
| 17 | **Casualty visualization** — replace numbers with proportional graphics (% of population, recovery time). | Educational | 2 days |
| 18 | **Code-split Mapbox** — currently loads in main bundle (~1.2 MB). Lazy-load to cut FCP from 5.5s to 2.5s on slow connections. | Technical | 4 hours |
| 19 | **Accessibility pass** — ARIA labels, keyboard nav for timeline, reduced-motion CSS, focus indicators. WCAG 2.1 AA. | Technical | 2 days |
| 20 | **Service Worker / offline cache** — once visited, works offline. Important for embedded use cases. | Technical | 1 day |
| 21 | **City name through-time view** — clicking a city shows the timeline of names (Byzantium → Constantinople → Konstantiniyye → Istanbul). The data is unique; the UI doesn't surface it. | Educational | 1-2 days |
| 22 | **Empty-state messaging** — when scrubbed to a year with no active conflicts, show "the world is at relative peace right now" rather than nothing. | UX | 2 hours |
| 23 | **Sitemap + structured data** — schema.org for events, sitemap.xml. Discoverability via Google. | Technical | 4 hours |
| 24 | **Source attribution per conflict** — beyond Wikipedia URL, show the actual source for casualty figure (Britannica, Clodfelter, specific monograph). | Credibility | weeks of data work |
| 25 | **Timeline density viz refinement** — current red bars are dense; could use logarithmic scaling or hover preview. | UX | 1 day |

---

## Specific issues identified that need quick fixes

These are the "you didn't realize this was off" findings:

- **Empire borders coverage bias**: 80% of features are Eurasian, 10% Americas, 10% Africa. Major missing: Bantu expansion-era polities, Aksum-Himyar Wars detail, much of pre-colonial sub-Saharan polities. (Sensitivity, Credibility)
- **Naming inconsistencies**: "USSR" vs "Soviet Union", "Kiev" vs "Kyiv", "Bombay" vs "Mumbai", "Burma" vs "Myanmar", "Constantinople" used for centuries past 1930. (Sensitivity, Credibility)
- **Importance ratings appear Eurocentric**: spot-checking suggests European wars are systematically rated higher than African or Asian wars of comparable casualty count. Audit + recalibrate. (Sensitivity)
- **Genocide naming**: Holodomor, Armenian Genocide, Holocaust, Rwandan Genocide, Bosnian Genocide, Rohingya, Nakba — should each be present and named with the canonical accepted term, with notes on contested designation where applicable. (Sensitivity)
- **"Indian Mutiny" / "Boxer Rebellion" / similar colonial-era naming**: actively delegitimizes indigenous resistance. Update to "Indian Rebellion of 1857" / "Yihetuan Movement" with the colonial name as alt. (Sensitivity)
- **Modern country borders fade-in starts at 1900**: this is somewhat arbitrary; many borders crystallized later (1920s-50s). Consider per-region fade dates or smarter logic. (UX, Credibility)
- **No indication that the timeline is being scrubbed during play**: a visible "playing" state would help. (UX)

---

## Suggested 3-phase rollout

### Phase 1 — "Defensible" (1-2 weeks)
Land everything in the P0 list. After this, the project is safe to share publicly and won't get torn apart for sloppy methodology or sensitivity blind spots.

### Phase 2 — "Press-ready" (1 month)
Land items 8-15 (P1). After this, it's something a journalist would feature, a professor would assign, a researcher would link to. The opening tour and tiered descriptions are the difference between "interesting" and "I sent it to three people".

### Phase 3 — "Reference-grade" (2-3 months)
Land items 16-25 (P2) plus the deeper data work (per-conflict source attribution, expanded narratives, accessibility). After this, it's citable in scholarly literature, embeddable in syllabi, and works on every device.

---

## Detailed audits

- `outputs/audit_ux_polish.md` — UX & visual polish (2.8K words)
- `outputs/audit_educational.md` — Educational value & storytelling (3.5K words)
- `outputs/audit_credibility.md` — Researcher credibility (2.8K words)
- `outputs/audit_sensitivity.md` — Public scrutiny & sensitivity (3.8K words)
- `outputs/audit_technical.md` — Technical/performance/sharing (3.5K words)
