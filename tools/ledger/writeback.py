"""Plan and verify a Kata-Kata write-back to the ledger sheet (card IDs and places).

Usage (from the repo root):
    python3 -I tools/ledger/writeback.py plan   <before.json> <map.json>  > plan.json
    python3 -I tools/ledger/writeback.py verify <before.json> <after.json> <map.json>

<before.json> / <after.json>: reads of Ledger!A1:T<last row> before and after the write (the Google Sheets
get_values JSON; when one read is too large, join the parts: {"values": part1 + part2}).
<map.json>: what tools/make_vocab_bank_vN.py --map wrote ({ledger id: {"ids": [...], "place": "..."}}). An entry may also carry
"both": "Yes" (column M, "In both"; step 6c-2); a map entry without "ids" and "place" only sets M.

plan prints, per changed row, the sheet row number, the cells (J = Kata-Kata (card IDs), K = Kata-Kata place),
before and after, so the writes can be made with update_values. verify exits 1 unless the cells that differ
between the two reads are exactly the planned ones.
"""

import json
import sys

J, K, M = 9, 10, 12  # zero-based columns J, K and M


def load(path):
    return [r + [""] * (20 - len(r)) for r in json.load(open(path, encoding="utf-8"))["values"]]


def plan(before, mapping):
    rows = {r[0]: i + 1 for i, r in enumerate(before)}
    out = []
    for lid, m in mapping.items():
        n = rows[lid]
        r = before[n - 1]
        want = []
        if "ids" in m:
            want.append((J, ", ".join(m["ids"])))
        if "place" in m:
            want.append((K, m["place"]))
        if "both" in m:
            want.append((M, m["both"]))
        cells = [(col, r[col], val) for col, val in want if r[col] != val]
        if cells:
            out.append({"lid": lid, "row": n, "cells": [{"col": "ABCDEFGHIJKLMNOPQRST"[c], "before": b, "after": a} for c, b, a in cells]})
    return sorted(out, key=lambda p: p["row"])


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode == "plan" and len(sys.argv) == 4:
        print(json.dumps(plan(load(sys.argv[2]), json.load(open(sys.argv[3], encoding="utf-8"))), ensure_ascii=False, indent=1))
        return 0
    if mode == "verify" and len(sys.argv) == 5:
        before, after = load(sys.argv[2]), load(sys.argv[3])
        planned = {(p["row"], c["col"], c["before"], c["after"]) for p in plan(before, json.load(open(sys.argv[4], encoding="utf-8"))) for c in p["cells"]}
        if len(before) != len(after):
            print(f"row count changed: {len(before)} -> {len(after)}")
            return 1
        diff = set()
        for i, (b, a) in enumerate(zip(before, after), 1):
            for c in range(20):
                if b[c] != a[c]:
                    diff.add((i, "ABCDEFGHIJKLMNOPQRST"[c], b[c], a[c]))
        print(f"{len(diff)} cells changed, {len(planned)} planned")
        for d in sorted(diff ^ planned):
            print("unexpected" if d in diff else "missing", d)
        return 0 if diff == planned else 1
    raise SystemExit(__doc__)


if __name__ == "__main__":
    sys.exit(main())
