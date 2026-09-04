# Push notes — Africa audit follow-up cleanup (r9, 2026-05-18)

## Suggested commit message

```
Africa audit cleanup: 7 follow-ups applied (r9)

Same-day follow-up to r8. The seven follow-ups documented in the original
Africa audit report were all worked through in one cleanup pass:
URL re-checking, aggregate-parent consolidation, partOf cross-linking,
low-confidence review, continent-wide coordinate axis-swap audit, Great
Lakes tag disambiguation, and two non-canonical URL retargets.

Pre-cleanup backup at backups/conflicts_20260518_141045_pre_africa_cleanup.json.

Headline numbers:
- Atlas: 2,316 -> 2,301 conflicts (-15 net: -10 dedup deletes,
  -8 low-conf deletes, +3 new = Cape Frontier umbrella + 2nd + 7th
  Frontier Wars)
- partOf edges: 59 set in file -> 245 set on 239 entries (+186 edges)
- Wikipedia URLs patched: 112 broken URLs fixed total (50 round 1 + 62
  round 2); 14 nulled where no English article exists; spot-check of
  30 random patched URLs returned 30/30 200-OK
- Coordinate axis-swap fix: 1 entry (Franco-Prussian War, the example
  flagged in r8); atlas-wide scan found no other true swaps

Per-follow-up work:

1. Serial URL re-check finished off the 326 URLs that came back
   rate-limited in r8. Three chunked-serial passes (4 workers, then 3,
   then 4 with sleeps) drove the still-429 count to zero. Patches
   round 2 covers 62 new 404s found across passes 2 and 3: 54 patched
   to canonical article, 8 nulled. New patch patterns: figure-centric
   redirects (Anglo-Buganda war 1892 -> Mwanga II of Buganda), operation
   overrides (Nyadzonia Raid -> Operation Eland, Matola Raid ->
   Operation Beanbag, Gafsa Raid -> 1980 Gafsa Uprising), umbrella
   roll-ups (Battle of Osogbo and Battle of Ijaye both live inside
   Yoruba Wars).

2. Aggregate-parent consolidation merged nine duplicate-event clusters:
   Sokoto Jihad (2->1), Tigray War 2020 (2->1), Herero/Nama Genocide
   (3->1), Third Anglo-Asante (2->1), South Sudanese Civil War (2->1),
   Saadi/Saadian Conquest of Songhai (2->1), Songhai-Mali Wars (2->1),
   Eritrean War of Independence (2->1), Roman-Kushite War (2->1).
   Keepers got the higher-importance + more-canonical name; deleted
   records' locations and Wikipedia URLs merged in. 10 records deleted.

3. partOf cross-linking pass:
   - 27 hand-curated umbrellas got their children linked (124 partOf
     edges added): Punic Wars, Italo-Ethiopian Wars, Boer Wars,
     Anglo-Ashanti Wars, Axum kingdom expansion, Axumite Arabian
     invasions, Songhai expansion, Kongo-Portuguese Conflicts
     (14 children including Mbwila, Njinga's wars, Kombi),
     Kongo Civil War, Portuguese-Njinga Wars, Sokoto Jihad,
     Mahdist War, Anglo-Zulu War (Isandlwana, Rorke's Drift, etc.),
     Mfecane (Gqokli Hill, Mhlatuze River), South African Border War
     (full operation sequence + Cuito Cuanavale), Angolan Civil War,
     Belgian Conquest of Congo Free State, Congo Crisis, East African
     Campaigns of both world wars, Maji Maji, Yoruba Civil Wars
     (Owu/Osogbo/Ijaye/Kiriji), Italian conquest of Eritrea,
     First/Second Congo Wars, Kamerun Campaign.
   - 9 umbrellas demoted to importance 2 per SEA convention so the
     timeline doesn't pin them on top of their children: punic-wars,
     italian-ethiopian-wars, boer-wars, anglo-ashanti-wars,
     axum-kingdom-expansion, axumite-invasions, mahdist-war,
     songhai-expansion, kongo-portuguese-conflicts.
   - Cape Frontier Wars given a proper series structure: added the
     `cape-frontier-wars` umbrella plus the missing Second (1789-93)
     and Seventh (1846-47) Frontier Wars that the r8 diff had lost
     as fuzzy-match false positives; linked all nine via partOf.
   - Auto-suggestion script proposed 74 additional links via proper-
     noun-overlap + date-enclosure + parent-importance heuristic;
     after hand review, 53 applied and 21 rejected as false positives
     (the Boer-War battle of Bothaville was being matched to the
     Belgian Conquest of the Congo Free State via "free state" tokens
     since both Orange Free State and Congo Free State trip the
     keyword).

4. Low-confidence review dropped 8 of the 45 entries flagged at
   merge time: kongo-expansion-under-lukeni-lua-nimi and
   luba-empire-expansion-under-kalala-ilunga (legendary chronicle
   entries), mapungubwe-decline-conflicts and takrur-foundation-conflicts
   (archaeological/chronicle inference), sailors-of-oman-in-pemba-and-lamu,
   tio-bobangi-conflicts (gradual displacement, not a named war),
   bemba-wars and loango-expansion (umbrellas without named specifics).
   The remaining 37 low-conf entries were kept as real-but-thinly-
   sourced; several are now linked to parent umbrellas.

5. Coordinate axis-swap audit, atlas-wide. Three-heuristic scan across
   all 2,316 post-audit entries: 0 with |lon| > 180 or |lat| > 90;
   23 country-bbox candidates of which 22 were false positives
   (Italian wars fought in Eritrea, Portuguese wars in Mozambique).
   One true swap fixed: Franco-Prussian War coords were [48.8566, 2.3522]
   (lat-lon swapped Paris), corrected to [2.3522, 48.8566].

6. "Great Lakes" disambiguation. Three entries used the ambiguous tag
   in `locations`; renamed to "African Great Lakes" (Bantu expansion)
   or "North American Great Lakes" (the two Iroquois entries).

7. Non-canonical Wikipedia URLs. `central-african-conflict` was
   pointing at the topic page; retargeted to the canonical
   "Central African Republic Civil War (2012-present)". For
   `italo-senussi-war-1911`, the candidate canonical title returns
   404, so the existing URL (Italian invasion of Libya, the broader
   article) was kept.

Schema: all 2,301 entries valid, no ID collisions, all coordinates
in valid lon/lat range, 0 broken partOf refs.

Full per-follow-up writeup in AFRICA_AUDIT_2026-05-18.md (cleanup
section appended). Changelog entry: r9 in app/changelog/page.tsx.
```

## Files to commit

**Modified:**
- `public/conflicts.json` — 2,316 -> 2,301 conflicts. Net of cleanup:
  -10 dedup deletes, -8 low-conf deletes, +3 new (Cape Frontier umbrella
  + 2 missing wars), +180 partOf links, 1 coord swap fixed, 112 Wikipedia
  URLs patched (98 retargeted + 14 nulled), 3 Great Lakes tags
  disambiguated, 9 umbrellas demoted to importance 2.
- `AFRICA_AUDIT_2026-05-18.md` — appended the "Follow-up cleanup pass"
  section replacing the original "Follow-up recommended (not done in
  this pass)" stub. New file size 810 lines / 49,466 bytes.
- `app/changelog/page.tsx` — prepended the r9 entry. Entry components
  balanced (9/9), JSX braces and parens both balanced.

**New:**
- `outputs/africa_url_recheck_serial.json` — round 2 HEAD check results
  (chunked-parallel re-check of the 326 rate-limited URLs from r8)
- `outputs/africa_url_recheck_pass3.json` — round 3 HEAD check (the
  102 URLs that came back rate-limited or errored in round 2)
- `outputs/africa_url_patches_round2.json` — 62 round-2 patches
  (54 retargets + 8 nulls)
- `outputs/africa_partof_suggestions.json` — auto-suggestion script
  output for the partOf cross-linking pass (74 candidates, 53 applied)

**Backups (do not commit):**
- `backups/conflicts_20260518_141045_pre_africa_cleanup.json` — already
  written, `backups/` is gitignored.

## Pre-push checks done

- **Schema validation:** 0 errors on all 2,301 entries.
- **partOf integrity:** 0 broken references. 239 entries with partOf
  set; 245 total partOf edges.
- **Coordinate sanity:** all entries in valid lon/lat range; the
  Franco-Prussian War swap is fixed.
- **Wikipedia URLs:** cumulative across all three URL passes — 671/784
  confirmed 200, 112/784 confirmed 404 (98 retargeted to canonical
  article, 14 nulled out), 0 still rate-limited. Random spot-check of
  30 patched URLs: 30/30 200-OK.
- **Changelog JSX:** r9 entry balanced — 9 `<Entry>` open / 9
  `</Entry>` close, braces 128/128, parens 166/166, 832 lines.

## Known gotchas (from earlier in this session, repeated for clarity)

- **`git index.lock` corruption** continues to recur. Th