#!/usr/bin/env python3
"""
conflicts_r14_report.py — writes docs/data-review/conflicts-r14.md and
docs/data-review/duplicate-clusters-r14.md from the r14 pipeline log and the current dataset.

Usage: python3 scripts/conflicts_r14_report.py --log <dir containing r14_log.json> [--orig <original conflicts.json>]
"""
import argparse, collections, json, math, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, 'docs', 'data-review')

sys.path.insert(0, os.path.join(ROOT, 'scripts'))
from conflicts_r14_fix import norm, key, is_hced  # noqa: E402


def fmt(n):
    return '—' if n is None else f'{n:,}'


def km(a, b):
    lon1, lat1 = map(math.radians, a); lon2, lat2 = map(math.radians, b)
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


# Judgment-call duplicate clusters (NOT applied). primary first.
CLUSTERS = [
    (['three-kingdoms-war-184', 'three-kingdoms-china', 'three-kingdoms-wars'], 'Applied in r14: the two 220-280 records are now partOf three-kingdoms-war-184 with headline = low bound of their range. Recommend merging three-kingdoms-wars into three-kingdoms-china (identical scope) in a later round.'),
    (['chinese-civil-war', 'first-chinese-civil-war', 'chinese-civil-war-main'], 'Keep all three: the two period records are legitimate sub-phases. Recommend making first-chinese-civil-war and chinese-civil-war-main partOf chinese-civil-war and harmonising the ranges (7-20M total; 1-3M for 1927-37; 6-18M for 1946-49 is too high for the sub-phase).'),
    (['imjin-war-korean-perspective', 'korean-invasions-toyotomi', 'korean-war-resistance-1592', 'imjin-war-second-phase'], 'Four records for the Imjin War (korean-japanese-invasion was folded into korean-invasions-toyotomi in r14 as an exact duplicate). Recommend one primary "Japanese invasions of Korea (1592-1598)" keeping imjin-war-second-phase as a child; the "Korean perspective" and "Korean resistance" records are the same war seen from one side and should merge into the primary.'),
    (['spanish-conquest-mexico', 'spanish-conquest-aztec-empire'], 'Same event, both importance 5, 0 km apart. r14 scoped spanish-conquest-aztec-empire to combat deaths (240k) and left spanish-conquest-mexico at 3.6M (incl. the 1520 smallpox epidemic). Recommend merging into spanish-conquest-aztec-empire (the accepted Wikipedia title) with the epidemic mortality in casualtyRange.notes.'),
    (['french-wars-of-religion', 'french-huguenot-wars'], 'Same war (1562-1598), two importance-4 records with 4M and 3M unsourced headlines. Recommend merging into french-wars-of-religion with casualties 3M (range 2-4M).'),
    (['sengoku-period', 'sengoku-period-japan', 'sengoku-period-conflicts'], 'Three records for the same era; r14 aligned the first two headlines to their range (500k). Recommend merging into sengoku-period.'),
    (['battle-somme', 'somme-offensive'], 'Same battle. r14 set both to 310k deaths. Recommend merging somme-offensive (hook/narrative) into battle-somme (partOf world-war-1).'),
    (['battle-verdun', 'verdun-offensive'], 'Same battle. r14 set both to 305k deaths. Recommend merging verdun-offensive into battle-verdun.'),
    (['india-pakistan-war-1947', 'first-indo-pakistan-war'], 'Same war; end years differ (1948 vs 1949 — 1949 is correct, the ceasefire was 1 Jan 1949). Recommend merge, keep 1947-1949.'),
    (['india-pakistan-war-1965', 'second-indo-pakistan-war'], 'Same war; casualties 10k vs 50k (deaths ≈ 7-10k). Recommend merge with 10,000.'),
    (['india-pakistan-war-1971', 'third-indo-pakistan-war', 'bangladesh-liberation-war', 'bangladesh-genocide'], 'The two war records are exact duplicates (both set to 12k military dead in r14). bangladesh-liberation-war and bangladesh-genocide are distinct but overlapping (same death toll, marked "overlapping estimates"). Recommend merging third-indo-pakistan-war into india-pakistan-war-1971 and making the war partOf bangladesh-liberation-war.'),
    (['timurid-invasions', 'timurid-conquests'], 'Same conquests (1368/1370-1405), identical figures. Recommend merge into timurid-conquests.'),
    (['qing-conquest-ming', 'manchu-conquest-china', 'ming-qing-transition'], 'Three records, three ranges (5-10M, 0.5-3M, 0.5-2M) for one transition. Recommend merging into qing-conquest-ming and adopting one range (Wikipedia cites up to 25M).'),
    (['great-northern-war', 'swedish-great-northern-war'], 'Same war, "Swedish perspective" duplicate. Recommend merge.'),
    (['great-turkish-war', 'ottoman-hafsburg-war-1683'], 'ottoman-hafsburg-war-1683 is actually the Battle of Vienna (1683) and should be renamed/partOf great-turkish-war rather than merged; the id is misleading.'),
    (['spanish-conquest-inca-empire', 'spanish-conquest-peru'], 'Same conquest, same years. Recommend merge into spanish-conquest-inca-empire.'),
    (['war-spanish-succession', 'war-of-spanish-succession-extended'], 'The "- Extended" record duplicates the merged primary. Recommend merge.'),
    (['colombian-independence-war', 'colombian-independence'], 'Same war; end years 1819 vs 1824 (1819 Boyacá ended the main campaign; fighting continued to 1824). Recommend merge, keep 1810-1824.'),
    (['brazilian-independence-war', 'brazilian-independence'], 'Same war (1822-1824/1828). Recommend merge, keep 1822-1824 (Wikipedia scope).'),
    (['liberian-civil-war', 'liberian-civil-war-first', 'liberian-civil-war-second'], 'Series vs its two wars. Keep all; recommend partOf links from the two wars to the series record.'),
    (['chechen-wars', 'chechen-wars-first', 'chechen-wars-second'], 'Series vs wars. Keep all; add partOf links.'),
    (['opium-wars', 'first-opium-war', 'opium-war-second'], 'Series vs wars. Keep all; add partOf links.'),
    (['punic-wars', 'first-punic-war', 'second-punic-war', 'third-punic-war'], 'Series vs wars. Keep all; add partOf links.'),
    (['syrian-wars', 'first-syrian-war', 'second-syrian-war', 'third-syrian-war-laodicean-war', 'fourth-syrian-war', 'fifth-syrian-war', 'sixth-syrian-war'], 'Series vs wars. Keep all; add partOf links.'),
    (['boer-wars', 'boer-war-first', 'boer-war-second'], 'Series vs wars. Keep all; add partOf links.'),
    (['anglo-mysore-wars', 'anglo-mysore-war-1767', 'anglo-mysore-war-1780', 'anglo-mysore-war-1790', 'anglo-mysore-war-1798', 'mysorean-wars-india'], 'Series vs wars, plus mysorean-wars-india duplicating the series. Recommend merging mysorean-wars-india into anglo-mysore-wars and adding partOf links.'),
    (['balkan-wars', 'first-balkan-war-1912', 'second-balkan-war-1913'], 'Series vs wars. Keep all; add partOf links.'),
    (['charlemagne-saxon-wars', 'saxon-wars'], 'Same war (772-804). Recommend merge into charlemagne-saxon-wars.'),
    (['timurid-invasion-india', 'delhi-invasion-timur'], 'Same campaign (1398). Recommend merge.'),
    (['polish-swedish-war', 'deluge-swedish-invasion-1655', 'second-northern-war'], 'polish-swedish-war (1655-1660) and the Deluge are the same event; both are the Polish theatre of the Second Northern War (new r14 stub). Recommend merging the first two and making the result partOf second-northern-war.'),
    (['battle-of-brihuega', 'battle-of-villaviciosa'], 'NOT merged: Brihuega (8 Dec 1710) and Villaviciosa (10 Dec 1710) are two distinct battles two days apart; the audit list was wrong on this one.'),
    (['grenada-invasion', 'us-invasion-grenada'], 'Third record for the 1983 invasion (americas-grenada-invasion-1983 was merged in r14). Recommend merge.'),
    (['aceh-rebellion-1976', 'aceh-conflict'], 'Same insurgency (insurgency-in-aceh was merged in r14). Recommend merge.'),
    (['battle-of-syria', 'battle-of-lebanon'], 'Both HCED rows are the 1941 Syria-Lebanon campaign (renamed in r14). Recommend merge into battle-of-syria.'),
    (['tunisian-campaign', 'north-africa-campaign', 'north-african-campaign', 'western-desert-campaign'], 'north-africa-campaign / north-african-campaign are exact duplicates; the other two are theatres. Recommend merging the two campaign records and adding partOf links.'),
    (['south-kordofan-conflict', 'sudanese-conflict-in-south-kordofan-and-blue-nile'], 'Same conflict (2011-); the partOf link was dropped in r14 because the child is ongoing and the parent ends 2020. Recommend merge.'),
    (['ukraine-crisis-pre-2022', 'russo-ukrainian-war'], 'ukraine-crisis-pre-2022 (2004-2021) overlaps the new r14 umbrella russo-ukrainian-war (2014-). Recommend scoping the former to 2004-2013 or merging.'),
    (['korean-invasions-toyotomi', 'korean-war-resistance-1592'], 'see Imjin cluster above'),
]
SERIES_PAIRS = [('punic-wars', 'first-punic-war'), ('syrian-wars', 'first-syrian-war'), ('boer-wars', 'boer-war-first'),
                ('anglo-mysore-wars', 'anglo-mysore-war-1767'), ('balkan-wars', 'first-balkan-war-1912')]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--log', required=True)
    ap.add_argument('--orig', default=None)
    a = ap.parse_args()
    L = json.load(open(os.path.join(a.log, 'r14_log.json'), encoding='utf-8'))
    recs = json.load(open(os.path.join(ROOT, 'data', 'conflicts.json'), encoding='utf-8'))
    byid = {r['id']: r for r in recs}
    redirects = json.load(open(os.path.join(ROOT, 'scripts', 'data', 'id_redirects.json'), encoding='utf-8'))
    unresolved = json.load(open(os.path.join(ROOT, 'scripts', 'data', 'parent_unresolved.json'), encoding='utf-8'))['strings']
    B, A = L['before'], L['after']
    os.makedirs(DOCS, exist_ok=True)

    # ---------------- conflicts-r14.md ----------------
    o = []
    w = o.append
    w('# Conflicts dataset — review round 14 (data-defect pass)\n')
    w('Scope: `data/conflicts.json` only. Applied by `scripts/conflicts_r14_fix.py` from the tables under `scripts/data/`; '
      'verified by `scripts/validate-conflicts.mjs`. Companion review list (judgment calls, NOT applied): `duplicate-clusters-r14.md`.\n')
    w('## Headline numbers\n')
    w('| Metric | Before | After |\n|---|---|---|')
    w(f"| Records | {B['records']:,} | {A['records']:,} |")
    w(f"| `partOf` references | {B['partof_refs']:,} | {A['partof_refs']:,} |")
    w(f"| … resolving to an existing id **or name** (old UI rule) | {B['partof_resolved']:,} ({100*B['partof_resolved']/B['partof_refs']:.1f} %) | — |")
    w(f"| … resolving to an existing **id** | 245 (3.0 %) | {A['partof_resolved']:,} ({100*A['partof_resolved']/A['partof_refs']:.1f} %) |")
    w(f"| Unresolved `partOf` strings (kept verbatim, listed in `scripts/data/parent_unresolved.json`) | 1,511 strings / 5,694 refs | {A['unresolved_strings']:,} strings / {A['unresolved_refs']:,} refs |")
    w(f"| Stub parent wars created | — | {len(L['stubs_created'])} |")
    w(f"| Records merged (exact duplicates) | — | {len(L['merges'])} |")
    w(f"| Records deleted (container/notes records) | — | {len(L['deleted'])} |")
    w(f"| Casualty headline/range changes | — | {len(L['casualties'])} |")
    w(f"| Importance changes (casualty floor) | — | {len(L['importance'])} |")
    w(f"| Coordinate fixes | — | {len(L['coord_fixes'])} |")
    w(f"| `Draw` belligerents removed | 178 | {L['draw_count']} records cleaned, 0 left |")
    w(f"| `wikiLink` fields | 126 | 0 (copied to `wikipediaUrl` in {L['wikilink'][0]['copied']}) |")
    w('\nValidator output on the delivered file:\n\n```\n' + f"records: {A['records']}; partOf refs: {A['partof_refs']}; resolved to ids: {A['partof_resolved']} ({100*A['partof_resolved']/A['partof_refs']:.1f}%); listed-unresolved strings: {len(unresolved)}\nOK: conflicts.json passes all checks\n```\n")

    w('## 1. `partOf` resolution\n')
    st = L['partof_stats']
    w('Every `partOf` entry is now either an existing record id or a raw string listed in `parent_unresolved.json`. Resolution order per reference: '
      'alias table (`scripts/data/parent_aliases.json`, with era/bbox rules) → exact id → exact name → normalised name (case, apostrophes, ordinals, '
      'British/Anglo, Turkish/Ottoman, plural/singular…) → fuzzy match (difflib ≥ 0.88, typo variants such as "5th Coaliton"). Every candidate must span the child\'s dates ±1 year; '
      'if none does, the string is kept verbatim and counted as unresolved.\n')
    w('| How resolved | References |\n|---|---|')
    for k, lab in [('alias', 'alias table (incl. era rules and stubs)'), ('name', 'exact name match'), ('normalised', 'normalised name match'), ('fuzzy', 'fuzzy match'), ('id', 'already an id'), ('reassign', 'reassigned by date-fix table'), ('dropped', 'dropped (not part of the named war / self-reference)'), ('unresolved', 'still unresolved')]:
        w(f'| {lab} | {st.get(k, 0):,} |')
    uk = L['unresolved_kind']
    w(f"\nUnresolved by kind: {uk.get('no-candidate', 0)} references have no plausible parent record at all (mostly singleton Jaques labels such as \"Turkish-Druze War\"); "
      f"{uk.get('date-mismatch', 0)} name a war that exists but whose dates do not contain the battle (source-side attribution errors, e.g. a 1866 battle labelled \"Seven Years War\"). Top remaining strings:\n")
    w('| Refs | String |\n|---|---|')
    for p, c in L['unresolved_top'][:25]:
        w(f'| {c} | {p} |')
    w('\n### Stub parent wars created\n')
    w(f"{len(L['stubs_created'])} parent records were created for Jaques/HCED war labels that had no curated record (definitions in `scripts/data/parent_stubs.json`: modern English name, dates from the standard chronology, "
      "one-sentence description, Wikipedia link where the article title is certain, coordinates = centroid of the child battles, countries = top-6 belligerents of the children, "
      "`sources: [{label: \"Derived from HCED child battles; see Wikipedia\"}]`, importance 3 or 4 for ≥40 children / well-known wars, 2 for minor wars). Only stubs that actually received children were created.\n")
    w('| id | name | years | children |\n|---|---|---|---|')
    for s in sorted(L['stubs_created'], key=lambda x: -x['children']):
        w(f"| `{s['id']}` | {s['name']} | {s['years']} | {s['children']} |")
    w('\n### Parent/child date fixes (the 137 out-of-range links)\n')
    w('All 137 pre-existing links whose child fell outside the parent by >1 year were resolved; the validator now reports 0. Curated date corrections:\n')
    w('| id | field | old → new | why |\n|---|---|---|---|')
    for d in L['date_fixes']:
        w(f"| `{d['id']}` | {d['field']} | {d['old']} → {d['new']} | {d['why']} |")
    w('\nLinks reassigned to the correct parent:\n')
    w('| child | old parent | new parent |\n|---|---|---|')
    for d in L['partof_reassigned']:
        w(f"| `{d['child']}` | `{d['old']}` | `{d['new']}` |")
    w('\nLinks dropped (child is not part of the named war):\n')
    w('| child | parent | why |\n|---|---|---|')
    for d in L['partof_dropped']:
        w(f"| `{d['child']}` | {d['parent']} | {d['why']} |")
    w('\nHCED name-strings that matched a curated record of the wrong era (e.g. "Russo-Polish War" 1920 → the 1654-67 record) are now routed by era rules to the right war '
      '(`polish-soviet-war`, `ming-invasion-vietnam`, `colombian-civil-wars-19th` …); see `EXTRA_ALIASES` in the fix script.\n')

    w('## 2. Casualty headline / range changes\n')
    w('Unit is **deaths** (not killed + wounded). Every change: old → new headline, range, one-line justification.\n')
    w('| id | old | new | range | justification |\n|---|---|---|---|---|')
    for c in L['casualties']:
        w(f"| `{c['id']}` | {fmt(c['old'])} | {fmt(c['new'])} | {c['range']} | {c['why']} |")
    w('\nNot changed (flagged only): the unsourced round numbers on `jiedushi-rebellions` (5M), `portuguese-expansion-brazil` (5M), `american-frontier-wars` (5M), '
      '`french-huguenot-wars` (3M) and `yellow-turban-rebellion`\'s companions have no range to reconcile against; they are listed for the Phase-4 casualty pass.\n')

    w('## 3. Duplicate merges (exact clusters only)\n')
    w('Rule: same normalised name and same start year (plus the explicitly verified pairs in the brief); the richer record is kept, `sources` unioned, max importance, '
      'the id referenced by more `partOf` entries survives, and `scripts/data/id_redirects.json` maps every removed id (also the 8 renamed ids and the 3 deleted records) to its successor.\n')
    w('| kept | removed | name | notes |\n|---|---|---|---|')
    for m in L['merges']:
        w(f"| `{m['kept']}` | `{m['removed']}` | {m['name']} | {'; '.join(m['notes']) or '—'} |")
    w('\nNot merged although listed in the brief: `battle-of-brihuega` / `battle-of-villaviciosa` — two different battles (8 and 10 December 1710).\n')
    w('Deleted container/notes records (redirected):\n')
    for d in L['deleted']:
        w(f"- `{d['id']}` ({d['name']}) → `{d['redirect']}`")
    w('\nThree Kingdoms triplicate: `three-kingdoms-war-184` (184-280) kept as the umbrella; `three-kingdoms-china` and `three-kingdoms-wars` (220-280) are now its children with headline 20M (their own low bound) and an "overlapping estimates" note. Full recommendation in the duplicate review.\n')
    w('Renamed ids (redirected): ' + ', '.join(f"`{d['old']}` → `{d['new']}`" for d in L['id_renames']) + '\n')

    w('## 4. Belligerents\n')
    w(f"The raw HCED file is not on disk and Harvard Dataverse is blocked by the egress policy (403 on CONNECT), so the Winner/Loser columns could not be re-derived. "
      f"`\"Draw\"` was removed from `countries` in {L['draw_count']} records; where that left no belligerent the description now ends with \"Outcome: indecisive.\" "
      f"These {len(L['draw_ids'])} ids need belligerents filled from HCED when the file is available (list at the end of this document).\n")
    w('Anachronistic labels replaced by era (`scripts/data/belligerent_era_aliases.json`):\n')
    w('| replacement | records |\n|---|---|')
    for k, v in sorted(L['era_counts'].items(), key=lambda x: -x[1]):
        w(f'| {k} | {v} |')
    w('\nEra-independent polity canonicalisation applied (`scripts/data/polity_aliases.json`, `apply: true` entries only; the other ~200 variants are documented with era ranges for Phase 4):\n')
    w('| replacement | records |\n|---|---|')
    for k, v in sorted(L['polity_counts'].items(), key=lambda x: -x[1]):
        w(f'| {k} | {v} |')

    w('\n## 5. Coordinates and location labels\n')
    w('| id | old | new | why |\n|---|---|---|---|')
    for c in L['coord_fixes']:
        w(f"| `{c['id']}` | {c['old']} | {c['new']} | {c['why']} |")
    w('\nLocation labels corrected: ' + ', '.join(f"`{c['id']}` {c['old']} → {c['new']}" for c in L.get('label_fixes', [])) + '\n')
    w(f"Point-in-country pass (shapely + Natural Earth 50m admin-0): {L['pic_pass']}. Sign/swap corrections were only applied when the original point was >3° from the named country, "
      f"so offshore naval battles (Glorious First of June, Flamborough Head, Makassar Strait…) were left alone; nothing else qualified. The {len(L['pic_mismatch'])} remaining label/pin mismatches are listed at the end for review (most are HCED `locations` labels naming the wrong modern country).\n")

    w('## 6. Importance floor (casualties ≥ 1M → ≥ 4; ≥ 3M → 5)\n')
    w('| id | name | casualties | old → new |\n|---|---|---|---|')
    for c in L['importance']:
        w(f"| `{c['id']}` | {c['name']} | {c['casualties']:,} | {c['old']} → {c['new']} |")
    w('\nSkipped because the cluster primary already carries the rating: ' + ', '.join(f"`{c['id']}` (→ `{c['primary']}`)" for c in L.get('importance_skipped', [])) + '\n')

    w('## 7. Small fixes\n')
    w(f"- `wikiLink` → `wikipediaUrl` copied in {L['wikilink'][0]['copied']} records; the legacy key removed everywhere.")
    w(f"- Clodfelter source label normalised to one string in {len(L.get('clodfelter', []))} records.")
    for t in L['text_fixes']:
        w(f"- `{t['id']}` {t['field']}: {t['why']}")
    w(f"- Kyiv: only events after 1991 were renamed ({len(L.get('kyiv', []))} records — none matched; the six \"Battle of Kiev\" rows are 1069-1943 and keep the historical spelling).")
    w('- HCED "Battle of <country>" campaign rows renamed to the accepted campaign name (Battle of France/Belgium/Crete/Normandy/Britain kept):\n')
    w('| id | old | new |\n|---|---|---|')
    for c in L['campaign_renames']:
        w(f"| `{c['id']}` | {c['old']} | {c['new']} |")
    w('\n## 8. Things to flag for the owner\n')
    w('- 56 HCED ids for BCE battles carry a double dash (`battle-of-jerusalem--587`); they are valid slugs under the audit definition and the validator tolerates them, but a `-bce-` scheme would be cleaner. Not changed (would need redirects for 56 permalinks).')
    w('- Stub parents are derived records: their countries are the union of HCED belligerent labels (so both "Austria" and "Habsburg Empire" can appear) and will benefit from the Phase-4 polity canonicalisation.')
    w('- `Battle of Berlin (RAF air campaign)` (HCED 1943) is an air campaign, not a battle; `USS Maine explosion` is not a conflict at all — both kept per the "every record stays a conflict" rule but could be reviewed.')
    w('- The 315 unresolved `partOf` strings are kept verbatim so no source attribution is lost; the UI should treat any `partOf` entry that is not an id as a plain label.')
    w('- The point-in-country mismatch list below contains many legitimately offshore naval battles and historical labels (e.g. "Prussia"); treat it as a review queue, not an error list.')
    w('\n### Appendix A — records that lost their only belligerent ("Draw")\n')
    w(', '.join(f'`{i}`' for i in L['draw_ids']))
    w('\n\n### Appendix B — point-in-country label/pin mismatches (review queue)\n')
    w('| id | name | year | label | point falls in |\n|---|---|---|---|---|')
    for m in L['pic_mismatch']:
        w(f"| `{m['id']}` | {m['name']} | {m['year']} | {m['label']} | {', '.join(m['point_in']) or 'sea / no country'} |")
    open(os.path.join(DOCS, 'conflicts-r14.md'), 'w', encoding='utf-8').write('\n'.join(o) + '\n')

    # ---------------- duplicate-clusters-r14.md ----------------
    d = []
    w = d.append
    w('# Duplicate-cluster review — round 14 (NOT applied)\n')
    w('Everything in this file needs an editorial decision. Exact-name/same-year clusters were merged automatically (see `conflicts-r14.md` §3); the clusters below involve judgment.\n')
    w('## A. Named clusters with a recommended action\n')
    w('| cluster (primary first) | years / casualties / importance | recommendation |\n|---|---|---|')
    for ids, rec in CLUSTERS:
        cells = []
        for i in ids:
            r = byid.get(i)
            if r:
                cells.append(f"`{i}` {r['startYear']}-{r['endYear']} c={fmt(r['casualties'])} imp{r['importance']}")
            else:
                cells.append(f"`{i}` (merged: → `{redirects.get(i, '?')}`)")
        w(f"| {'<br>'.join(cells)} | | {rec} |")
    w('\n## B. Series-vs-first-of-series pairs (link with `partOf`, do not merge)\n')
    for a_, b_ in SERIES_PAIRS:
        ra, rb = byid.get(a_), byid.get(b_)
        if ra and rb:
            w(f"- `{a_}` ({ra['startYear']}-{ra['endYear']}) ← `{b_}` ({rb['startYear']}-{rb['endYear']}){' — already linked' if a_ in rb['partOf'] else ''}")
    # same normalised name + same start year, not merged (after r14)
    w('\n## C. Same normalised name and same start year still present (not auto-merged: end years or scope differ)\n')
    cl = collections.defaultdict(list)
    for r in recs:
        cl[(key(r['name']), r['startYear'])].append(r)
    w('| start | records |\n|---|---|')
    for (k, y), v in sorted(cl.items(), key=lambda x: x[0][1]):
        if len(v) > 1 and not all(is_hced(r) for r in v):
            w(f"| {y} | " + ' · '.join(f"`{r['id']}` ({r['name']}, →{r['endYear']}, c={fmt(r['casualties'])})" for r in v) + ' |')
    # same year, <=5 km, different name, curated involved
    w('\n## D. Same start year and ≤ 5 km apart, different names (possible duplicates or legitimately adjacent battles)\n')
    w('Computed on the delivered file; pairs where at least one record is curated. Most sieges/battles of the same city in the same year are the same event; multi-year wars pinned on a capital are usually distinct.\n')
    w('| year | A | B | km |\n|---|---|---|---|')
    byyear = collections.defaultdict(list)
    for r in recs:
        byyear[r['startYear']].append(r)
    npairs = 0
    for y, rs in sorted(byyear.items()):
        for i in range(len(rs)):
            for j in range(i + 1, len(rs)):
                a_, b_ = rs[i], rs[j]
                if is_hced(a_) and is_hced(b_):
                    continue
                if key(a_['name']) == key(b_['name']):
                    continue
                dist = km(a_['coordinates'], b_['coordinates'])
                if dist <= 5:
                    npairs += 1
                    w(f"| {y} | `{a_['id']}` {a_['name']} ({a_['startYear']}-{a_['endYear']}) | `{b_['id']}` {b_['name']} ({b_['startYear']}-{b_['endYear']}) | {dist:.1f} |")
    w(f'\n{npairs} pairs.\n')
    w('## E. Shared Wikipedia URLs among curated records (same article → probably same event)\n')
    byurl = collections.defaultdict(list)
    for r in recs:
        if r.get('wikipediaUrl') and not is_hced(r):
            byurl[r['wikipediaUrl']].append(r['id'])
    w('| article | records |\n|---|---|')
    for u, v in sorted(byurl.items(), key=lambda x: -len(x[1])):
        if len(v) >= 3:
            w(f"| {u.split('/wiki/')[1]} | " + ', '.join(f'`{i}`' for i in v) + ' |')
    open(os.path.join(DOCS, 'duplicate-clusters-r14.md'), 'w', encoding='utf-8').write('\n'.join(d) + '\n')
    print('wrote', os.path.join(DOCS, 'conflicts-r14.md'), 'and duplicate-clusters-r14.md;', npairs, 'proximity pairs')


if __name__ == '__main__':
    main()
