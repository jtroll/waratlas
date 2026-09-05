#!/usr/bin/env python3
"""
r15_polity_join.py — Phase 4 (r15): canonicalise belligerents into `polityIds`.

    python3 scripts/r15_polity_join.py          # idempotent; rewrites data/conflicts.json in place
    python3 scripts/r15_polity_join.py --dry    # report only

For every conflict, each `countries` label is resolved to an empire feature id of
data/empires.json whose [startYear, endYear] (or the alias table's from/to override)
overlaps the conflict's years. The slice active at the conflict's start year is
preferred; when several slices contain it the first one in the alias/family list
wins; when none contains it the first overlapping slice wins.

Resolution order per label:
  1. `empires` list of the label's entry in scripts/data/polity_aliases.json
     ("@family" references expand scripts/data/polity_families.json);
  2. exact (case-insensitive) match on an empire feature `name`.

`countries` strings are never rewritten here. `polityIds` is written after
`countries` (unique, in `countries` order) and omitted when nothing matches.
Report: scripts/data/polity_join_report.json (per label: count, matched ids, top id).
"""
from __future__ import annotations

import json
import sys
from collections import Counter, OrderedDict, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFLICTS = ROOT / 'data' / 'conflicts.json'
EMPIRES = ROOT / 'data' / 'empires.json'
ALIASES = ROOT / 'scripts' / 'data' / 'polity_aliases.json'
FAMILIES = ROOT / 'scripts' / 'data' / 'polity_families.json'
REPORT = ROOT / 'scripts' / 'data' / 'polity_join_report.json'

END_OPEN = 2100


def load_tables():
    feats = json.load(open(EMPIRES, encoding='utf-8'))['features']
    years = {f['properties']['id']: (f['properties']['startYear'], f['properties']['endYear']) for f in feats}
    by_name = defaultdict(list)
    for f in feats:
        by_name[f['properties']['name'].strip().lower()].append(f['properties']['id'])
    aliases = json.load(open(ALIASES, encoding='utf-8'))
    families = json.load(open(FAMILIES, encoding='utf-8'))['families']
    return years, by_name, aliases, families


def expand(spec, families, years, _depth=0):
    """Turn an `empires` spec into [(id, from, to)] with feature years as defaults."""
    out = []
    for item in spec:
        if isinstance(item, str) and item.startswith('@'):
            fam = families.get(item[1:])
            if fam is None:
                raise KeyError(f'unknown family {item}')
            out.extend(expand(fam, families, years, _depth + 1))
            continue
        if isinstance(item, str):
            item = {'id': item}
        fid = item['id']
        if fid not in years:
            raise KeyError(f'unknown empire id {fid!r} in alias table')
        s, e = years[fid]
        out.append((fid, item.get('from', s), item.get('to', e)))
    return out


def pick(cands, start, end):
    """Slice active at `start`; else the first slice overlapping [start, end]."""
    for fid, s, e in cands:
        if s <= start <= e:
            return fid
    for fid, s, e in cands:
        if s <= end and start <= e:
            return fid
    return None


def build_resolver():
    years, by_name, aliases, families = load_tables()
    cache = {}

    def candidates(label):
        if label in cache:
            return cache[label]
        entry = aliases.get(label)
        if entry and entry.get('empires'):
            c = expand(entry['empires'], families, years)
        else:
            c = [(fid, *years[fid]) for fid in by_name.get(label.strip().lower(), [])]
        cache[label] = c
        return c

    def resolve(label, start, end):
        return pick(candidates(label), start, end)

    return resolve, years


def with_polity_ids(rec: OrderedDict, ids: list[str]) -> OrderedDict:
    """Return the record with `polityIds` placed right after `countries` (or removed)."""
    out = OrderedDict()
    for k, v in rec.items():
        if k == 'polityIds':
            continue
        out[k] = v
        if k == 'countries' and ids:
            out['polityIds'] = ids
    if ids and 'polityIds' not in out:
        out['polityIds'] = ids
    return out


def main(dry: bool) -> None:
    raw = CONFLICTS.read_text(encoding='utf-8')
    recs = json.loads(raw, object_pairs_hook=OrderedDict)
    assert json.dumps(recs, indent=2, ensure_ascii=False) == raw, 'conflicts.json serialisation drifted; refusing to write'
    resolve, years = build_resolver()

    label_count = Counter()
    label_hits = defaultdict(Counter)
    label_imp3 = Counter()
    matched_recs = 0
    changed = 0
    era_tot, era_hit = Counter(), Counter()
    imp_tot, imp_hit = Counter(), Counter()
    out = []
    for r in recs:
        start = r['startYear']
        end = r['endYear'] if r['endYear'] is not None else END_OPEN
        ids = []
        for label in r.get('countries') or []:
            label_count[label] += 1
            if r['importance'] >= 3:
                label_imp3[label] += 1
            fid = resolve(label, start, end)
            if fid:
                label_hits[label][fid] += 1
                if fid not in ids:
                    ids.append(fid)
        era = ('ancient (<500)' if start < 500 else 'medieval (500-1499)' if start < 1500 else
               'early modern (1500-1799)' if start < 1800 else 'modern (1800-1944)' if start < 1945 else 'post-1945')
        era_tot[era] += 1
        imp_tot[r['importance'] >= 3] += 1
        if ids:
            matched_recs += 1
            era_hit[era] += 1
            imp_hit[r['importance'] >= 3] += 1
        new = with_polity_ids(r, ids)
        if list(new.get('polityIds', [])) != list(r.get('polityIds', [])):
            changed += 1
        out.append(new)

    n = len(recs)
    print(f'records: {n}; with polityIds: {matched_recs} ({100 * matched_recs / n:.1f}%); records changed: {changed}')
    hi = imp_hit[True]
    print(f'importance>=3: {hi}/{imp_tot[True]} ({100 * hi / imp_tot[True]:.1f}%)   importance<3: {imp_hit[False]}/{imp_tot[False]} ({100 * imp_hit[False] / imp_tot[False]:.1f}%)')
    for era in ['ancient (<500)', 'medieval (500-1499)', 'early modern (1500-1799)', 'modern (1800-1944)', 'post-1945']:
        print(f'  {era:26s} {era_hit[era]:5d}/{era_tot[era]:5d} ({100 * era_hit[era] / max(era_tot[era], 1):.1f}%)')
    mentions = sum(label_count.values())
    hit_mentions = sum(sum(c.values()) for c in label_hits.values())
    print(f'belligerent mentions: {mentions}; resolved: {hit_mentions} ({100 * hit_mentions / mentions:.1f}%)')

    report = OrderedDict()
    report['summary'] = OrderedDict([
        ('records', n), ('recordsWithPolityIds', matched_recs), ('mentions', mentions), ('mentionsResolved', hit_mentions),
        ('importance3plus', OrderedDict([('records', imp_tot[True]), ('matched', hi), ('rate', round(hi / imp_tot[True], 4))])),
        ('byEra', OrderedDict((e, OrderedDict([('records', era_tot[e]), ('matched', era_hit[e])])) for e in era_tot)),
    ])
    labels = OrderedDict()
    for label, cnt in label_count.most_common():
        hits = label_hits.get(label, Counter())
        labels[label] = OrderedDict([
            ('count', cnt), ('importance3plus', label_imp3[label]),
            ('matched', hits.most_common(1)[0][0] if hits else None),
            ('matchedCount', sum(hits.values())),
            ('ids', OrderedDict(hits.most_common()) if hits else {}),
        ])
    report['labels'] = labels
    REPORT.write_text(json.dumps(report, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'report -> {REPORT.relative_to(ROOT)} ({len(labels)} labels)')

    if dry:
        return
    CONFLICTS.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f'wrote {CONFLICTS.relative_to(ROOT)}')


if __name__ == '__main__':
    main('--dry' in sys.argv)
