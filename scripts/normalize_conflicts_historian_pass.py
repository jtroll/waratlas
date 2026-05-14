"""
One-shot normalization pass driven by a from-the-historian-perspective audit
(May 14 2026). Resolves the data-integrity issues that a careful reader of the
sidebar — or a researcher inspecting public/conflicts.json directly — would
catch in the first session with the site.

Fixes applied:

  1. SHAPE NORMALIZATION (6 records imported from a different pipeline):
     Holodomor, Armenian Genocide, Bosnian Genocide, Rohingya Genocide,
     Cambodian Genocide, Nakba. Each had:
        - coordinates as {lat, lng} object instead of [lon, lat] array
          (Mapbox expects array; the map dot would not render).
        - casualties as {estimate: N} object instead of a plain number
          (the headline figure and CasualtyRange microvis would break).
        - partOf as None instead of an empty list (TypeScript expects
          string[]).
     Each is rewritten to the canonical schema.

  2. NAKBA CASUALTY / DISPLACEMENT CONFLATION:
     The Nakba record paired casualties=15,000 (violent deaths) with a
     "range" of 600k-1M whose own notes admit it is *displacement*, not
     deaths. Historians of the 1948 war keep these figures separate. We do
     the same: the headline becomes the deaths range from the scholarly
     literature (with a wider band reflecting the dispute), and the
     displacement figure is moved into the descriptive narrative.

  3. DUPLICATE RECORDS:
     - "Indian Rebellion of 1857" — 3 records: keep `indian-rebellion-1857`
       (the canonical-name record); drop `indian-mutiny` and `sepoy-mutiny`
       (legacy colonial-naming IDs that ended up holding identical narrative
       data).
     - "Armenian Genocide" — 2 records: keep `armenian-genocide` (rich
       hook/narrative/significance/sources); drop the bare `armenian-
       genocide-1915` stub.
     - "Western Sahara Conflict" — 2 records: merge fields into
       `western-sahara-conflict` (give it the broader importance rating and
       ongoing-status; preserve casualty figure); drop the duplicate.
     - "Boxer Rebellion - Additional context" — drop the stub duplicate.

  4. TERMINOLOGY UPDATE:
     - "Boxer Rebellion" -> "Yihetuan Movement (Boxer Rebellion)" so the
       Chinese self-designation is in the name, with the colonial term kept
       parenthetically for searchability.

This pass is rerun-safe; if the data has already been normalized it is a
no-op. Stale duplicates are removed; the remaining canonical records carry
the richest available field set.
"""

import json
import sys
from pathlib import Path
from copy import deepcopy

REPO = Path(__file__).resolve().parents[1]
CONFLICTS = REPO / "public" / "conflicts.json"


# Records whose `coordinates` and `casualties` were imported in the wrong
# shape. Coordinates here are given as the corrected [lon, lat] arrays.
SHAPE_FIXES = {
    "holodomor":          {"coordinates": [30.5234, 50.4501]},
    "armenian-genocide":  {"coordinates": [35.0, 39.0]},
    "bosnian-genocide":   {"coordinates": [19.2761, 43.784]},
    "rohingya-genocide":  {"coordinates": [92.1833, 21.1717]},
    "cambodian-genocide": {"coordinates": [104.991, 12.5657]},
    "nakba":              {"coordinates": [35.2338, 31.9454]},
}


# Records to drop entirely (duplicates of better records elsewhere).
DROP_IDS = {
    "indian-mutiny",
    "sepoy-mutiny",
    "armenian-genocide-1915",
    "boxer-rebellion-additional-context",
    "western-sahara-conflict-ongoing",
}


def normalize_coordinates(c: dict) -> bool:
    """Convert {lat, lng} -> [lon, lat]. Returns True if it changed."""
    coords = c.get("coordinates")
    if isinstance(coords, dict):
        lng = coords.get("lng")
        lat = coords.get("lat")
        if lng is not None and lat is not None:
            c["coordinates"] = [lng, lat]
            return True
    # Apply explicit override even if the existing shape is already an array
    # (idempotent — same values).
    if c["id"] in SHAPE_FIXES:
        target = SHAPE_FIXES[c["id"]]["coordinates"]
        if c.get("coordinates") != target:
            c["coordinates"] = target
            return True
    return False


def normalize_casualties(c: dict) -> bool:
    """Convert {estimate: N} -> N. Returns True if it changed."""
    cas = c.get("casualties")
    if isinstance(cas, dict) and "estimate" in cas:
        c["casualties"] = cas["estimate"]
        return True
    return False


def normalize_part_of(c: dict) -> bool:
    """partOf None -> [] (TypeScript expects an array)."""
    if c.get("partOf") is None:
        c["partOf"] = []
        return True
    return False


def fix_nakba_displacement_conflation(c: dict) -> bool:
    """Separate the violent-deaths figure from the displacement figure that
    earlier ingest passes had stored as a `casualtyRange`. Encodes the
    scholarly fight in the notes rather than burying it.
    """
    if c["id"] != "nakba":
        return False
    changed = False
    range_ = c.get("casualtyRange")
    # If the range still looks like the displacement figure (600k-1M with
    # 'displacement' or population-movement language), correct it.
    if range_ and range_.get("high") and range_["high"] >= 500_000:
        c["casualtyRange"] = {
            "low": 13_000,
            "high": 20_000,
            "source": "Morris 2004; Khalidi 1992; Pappé 2006",
            "notes": (
                "Violent-death estimates for the 1947–49 war run roughly 13–20K combined; "
                "Palestinian Arabs account for most non-combatant deaths. A separate, much larger "
                "figure — 700K–800K Palestinians displaced — is sometimes folded into the casualty "
                "total in popular sources, but historians keep deaths and displacement as separate "
                "ledgers. See `description` for the displacement figure."
            ),
        }
        changed = True
    desc = c.get("description", "")
    if desc and "displacement" not in desc.lower() and "displaced" not in desc.lower():
        c["description"] = (
            desc.rstrip(". ")
            + ". An estimated 700,000–800,000 Palestinians were displaced from their homes; that "
              "figure is widely cited as the Nakba's defining toll but is a displacement number, "
              "not a death toll, and is reported separately in this entry."
        )
        changed = True
    return changed


def merge_western_sahara(records: list) -> bool:
    """Combine the two `western-sahara-conflict*` records into one."""
    keep = next((r for r in records if r["id"] == "western-sahara-conflict"), None)
    drop = next((r for r in records if r["id"] == "western-sahara-conflict-ongoing"), None)
    if not (keep and drop):
        return False
    changed = False
    if (drop.get("importance") or 0) > (keep.get("importance") or 0):
        keep["importance"] = drop["importance"]
        changed = True
    if keep.get("endYear") is not None and drop.get("endYear") is None:
        # The "-ongoing" record correctly flagged this as still active;
        # promote that to the canonical record.
        keep["endYear"] = None
        changed = True
    if drop.get("description") and len(drop["description"]) > len(keep.get("description", "")):
        keep["description"] = drop["description"]
        changed = True
    # `merge` performed in caller; we just report whether the canonical
    # record was updated.
    return changed


def rename_boxer(c: dict) -> bool:
    if c["id"] != "boxer-rebellion":
        return False
    if c["name"] != "Yihetuan Movement (Boxer Rebellion)":
        c["name"] = "Yihetuan Movement (Boxer Rebellion)"
        return True
    return False


def main(write: bool = True) -> int:
    with CONFLICTS.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    before = len(data)

    # Step 1: per-record shape fixes
    n_coord = n_cas = n_part = 0
    for c in data:
        if normalize_coordinates(c):
            n_coord += 1
        if normalize_casualties(c):
            n_cas += 1
        if normalize_part_of(c):
            n_part += 1

    # Step 2: Nakba displacement/deaths split
    n_nakba = 0
    for c in data:
        if fix_nakba_displacement_conflation(c):
            n_nakba += 1

    # Step 3: Boxer rename
    n_boxer = 0
    for c in data:
        if rename_boxer(c):
            n_boxer += 1

    # Step 4: Merge Western Sahara before dropping the duplicate
    n_ws = 1 if merge_western_sahara(data) else 0

    # Step 5: Drop duplicate records
    n_drop = sum(1 for c in data if c["id"] in DROP_IDS)
    data = [c for c in data if c["id"] not in DROP_IDS]

    after = len(data)

    print(f"  records: {before} -> {after} (dropped {n_drop})")
    print(f"  coordinates normalized: {n_coord}")
    print(f"  casualties normalized:  {n_cas}")
    print(f"  partOf normalized:      {n_part}")
    print(f"  nakba split applied:    {n_nakba}")
    print(f"  boxer renamed:          {n_boxer}")
    print(f"  western sahara merged:  {n_ws}")

    if write:
        with CONFLICTS.open("w", encoding="utf-8") as fh:
            # 2-space indent to match the surrounding tree's convention,
            # with non-ASCII preserved (Konstantiniyye, Kūt, etc.).
            json.dump(data, fh, ensure_ascii=False, indent=2)
        print(f"\n  wrote {CONFLICTS}")
    return 0


if __name__ == "__main__":
    sys.exit(main(write="--check" not in sys.argv))
