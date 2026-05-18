# Push notes — Africa coverage audit (2026-05-18)

## Suggested commit message

```
Africa audit: 784 named wars added across 25 sub-region × era cells

Region-by-region audit of African coverage following the SEA precedent.
Africa was sliced as {North, West, East, Central, South} × {Ancient
(pre-700 CE), Medieval (700-1500), Early Modern (1500-1800), Colonial
(1800-1945), Post-1945} — a 25-cell matrix.

Pre-audit coverage was 914 African conflicts of 1,532 total (inclusive
text-based classifier). The thinnest cells were Central · Early Modern (1
entry: a single Kongo expansion aggregate), Central · Colonial (2 entries),
West · Early Modern (7), and East · Ancient (4). The Colonial cell across
North/West/East/South turned out to hold the largest absolute gaps:
Cape Frontier Wars (all nine missing as individuals), the West African
jihad sequence (Sokoto/Macina/Toucouleur/Tijaniyya), the French Conquest
of Algeria umbrella, Menelik II's southern conquests, Mahdist War battles.

Reference list of 965 candidate named wars compiled by five parallel
sub-agents, one per sub-region, anchored against UNESCO General History
of Africa, Cambridge History of Africa, Iliffe, Vansina, Thornton,
Reid (E. Africa), Pakenham, Vandervort, the Correlates of War dataset,
and the relevant Wikipedia category trees. After exact-name + URL-slug
diff (80 matches), 6 manual near-match dedups, and within-list dedup
(95 cross-regional duplicates), 784 entries merged.

Confidence mix: 572 high, 167 medium, 45 low.
Importance mix: 45 importance-5, 176 importance-4, 362 importance-3,
191 importance-2, 10 importance-1.

Notable additions (importance 5, high confidence):
Muslim Conquest of Egypt/Maghreb (639-709), Banu Hilal Invasion
(1050-1110), Battle of Megiddo (15th c. BCE), Battle of Alcacer Quibir
(1578), Saadi Conquest of Songhai + Battle of Tondibi (1590-91),
French Conquest of Algeria umbrella (1830-1903), Algerian Civil War
(1991-2002), First Libyan Civil War (2011), Sosso-Mandinka War /
Battle of Kirina (1235), Sonni Ali's Conquests, Asante-Denkyira War,
Sokoto Jihad of Usman dan Fodio, Yoruba Civil Wars umbrella,
Toucouleur Wars / Umarian Jihad, Franco-Mandingo Wars / Samori,
Northern Mali Conflict (2012-), Kushite / Assyrian / Aksumite conquests
of Egypt and Meroë, Aksumite invasion of Himyar under Kaleb,
Amda Seyon's campaigns, Battle of Wayna Daga (1543), Oromo migrations
(1522-1618), Zemene Mesafint, Menelik II's southern conquests, Battle
of Omdurman, both East African Campaigns (WWI + WWII), Ikiza 1972
Burundi genocide, Tanzania-Uganda War, Lord's Resistance Army
insurgency, Battle of Mbwila (1665), Kongo Civil War, Portuguese-Njinga
Wars, Cuito Cuanavale, Battles of Isandlwana and Rorke's Drift, full
nine Cape Frontier Wars, Mfecane state-formation cycle, both Anglo-Boer
wars with named sieges, Herero/Nama/Bondelswarts wars.

Net: 1,532 → 2,316 conflicts. Africa coverage 914 → 1,684.

Schema: all 784 entries valid, no ID collisions, all coordinates inside
Africa+margin bbox (lon -25 to 55, lat -40 to 40) except Seychelles 1981
Mercenary Raid (legitimately 0.45° east of margin).

Wikipedia URL verification: 408/784 confirmed 200 on first parallel HEAD
pass; 50 confirmed 404s patched (44 reassigned to canonical articles, 6
nulled where no English article exists); 326 rate-limited 429s pending
serial re-check follow-up.

Methodology and full per-entry tables: AFRICA_AUDIT_2026-05-18.md.
Five follow-ups documented for next session (URL re-check, aggregate-
parent consolidation, partOf cross-linking, coordinate axis-swap audit,
low-confidence review).
```

## Files to commit

**Modified:**
- `public/conflicts.json` — data file. 1,532 → 2,316 conflicts. +784 Africa
  additions appended and re-sorted by `(startYear, endYear, name)`. No
  existing entries were modified (other than 50 Wikipedia URL patches to
  entries the audit added in the same merge).

**New:**
- `AFRICA_AUDIT_2026-05-18.md` — methodology, before/after coverage tables by
  sub-region × era, sources surveyed, full highlights per cell with
  confidence flags, data-quality issues found, known limitations, verification
  results, follow-up list.
- `outputs/africa_tables.md` — per-entry tables of all 784 additions with
  Wikipedia links, grouped by sub-region × era, sortable.
- `outputs/africa_ref_north.json`, `africa_ref_west.json`, `africa_ref_east.json`,
  `africa_ref_central.json`, `africa_ref_south.json` — five regional
  reference lists (965 candidates total) compiled by parallel sub-agents,
  saved for re-runnability and audit-trail.

**Backups (do not commit, keep locally for rollback):**
- `backups/conflicts_20260518_080245_pre_africa_audit.json` — pre-audit backup.
  `backups/` is not tracked; safe to leave untouched.

## Files NOT to commit (carry-over noise from prior sessions)

Same exclusion list as the SEA audit push notes — these were modified
before this Africa session and shouldn't be in this commit:
- `.gitignore`, `SEA_AUDIT_2026-05-17.md` — touched by post-SEA cleanup work
- `app/globals.css`, `app/page.tsx`, `components/DisputedTerritoryNote.tsx`,
  `components/FilterPanel.tsx`, `components/TopBar.tsx` — UI work from a
  separate session
- `scripts/hand_trace_borders.py`, `scripts/scan_shape_pathology.py` — border-
  tracing work
- `MONETIZATION_RESEARCH.md`, `introducing-war-atlas.md`
- `border_changes_preview.html`, `scripts/__pycache__/` — review/runtime artifacts

Audit-internal scratch files (also not committed): `outputs/africa_inventory.json`,
`africa_diff.json`, `africa_gaps_final.json`, `africa_new_entries.json`,
`africa_url_check_raw.json`, `africa_url_patches.json`, `africa_matrix_summary.json`,
`africa_existing_*.json` — generated artifacts from intermediate diff/merge
steps. Keeping them out of the repo since they can be re-derived from the
reference lists and conflicts.json.

## Pre-push checks done

- **Schema validation**: 0 problems on all 2,316 entries. No missing required
  fields, no date inversions, all coordinates in valid lon/lat range, no ID
  collisions, all `importance` values in 1–5.
- **partOf integrity**: 0 broken references. New entries all have empty
  `partOf`; the existing partOf graph was not modified.
- **Coordinate sanity**: 783/784 new entries' coordinates fall inside the
  Africa+margin bbox (lon −25 to 55, lat −40 to 40). The 1 outlier is the
  Seychelles 1981 Mercenary Raid at (55.45, −4.62) — legitimately the
  Seychelles, 0.45° east of the margin.
- **Wikipedia URLs**: HEAD-checked all 784 in parallel. 408/784 confirmed 200,
  50/784 confirmed 404 (all 50 patched: 44 reassigned to canonical articles,
  6 nulled where no English article exists), 326/784 rate-limited 429s
  pending serial re-check. Spot-check sample suggests true 200 rate after
  patching is 88–93% — natural follow-up.

## Known issue: git index corruption (recurrence)

Same issue flagged in the SEA push notes recurred this session. `.git/index`
was corrupt (`fatal: unable to read dd0545bde81cfe56d25893000000000000000000`,
`git fsck` reported `error: bad index file sha1 signature`). Pre-existing,
not caused by this session.

This session's fix (since `rm` was blocked by the sandbox mount permissions):

```bash
GIT_INDEX_FILE=.git/index.new git read-tree HEAD
mv .git/index .git/index.bad
mv .git/index.new .git/index
```

Same outcome as `rm .git/index && git reset`. Left `.git/index.bad` and
`.git/index.corrupt` in place for forensics; safe to delete.

## Verification commands the reviewer can run

```bash
# Total conflict count
python3 -c "
import json
d = json.load(open('public/conflicts.json'))
print(f'Total: {len(d)}')
"
# Expected: Total: 2316

# Schema sanity
python3 -c "
import json
d = json.load(open('public/conflicts.json'))
ids = [c['id'] for c in d]
assert len(ids) == len(set(ids)), 'ID collisions'
for c in d:
    assert c['startYear'] is not None
    assert c.get('endYear') is None or c['endYear'] >= c['startYear']
    lon, lat = c['coordinates']
    assert -180 <= lon <= 180