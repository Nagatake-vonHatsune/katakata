"""Plan, apply and verify a ⚡ placement batch in the ledger: new «ChN (extension)» rows and promoted Jambatan rows.

Usage (from the repo root):
    python3 -I tools/ledger/stretch_batch.py plan <chapter> [docs/VOCAB-PLACEMENT-proposal.csv] > plan.json
    python3 -I tools/ledger/stretch_batch.py apply <plan.json>              # writes the planned cells into the snapshot
    python3 -I tools/ledger/stretch_batch.py csv <plan.json> <out.csv>      # the new rows and changes, for a person to paste
    python3 -I tools/ledger/stretch_batch.py verify <before.json> <after.json> <plan.json>

The proposal CSV (docs/VOCAB-PLACEMENT-proposal.csv, Sam approved the chapter 4 part on 15 Nov 2026) lists every word with its
decision. For one chapter, the rows decided «ChN (extension)» are either promoted (they have an existing ledger ID: a Jambatan row;
only its card IDs, J, and its place, K, change) or new (a full row at the end of the tab, IDs from the first free L-number).
⚡ card IDs are ms-xNN-001…, promoted rows first, then new rows, each in CSV order (src/core/state.ts MOVED_CARDS follows it).
Hanashishou facts for a new row (home pack, band, scene count, example line) come from Hanashishou's
docs/STAGE-2-step6a2-metfirst.csv at the commit in content/bridge/hanashishou-metfirst.json; pass --hana <checkout>.

The sheet write (Sam, 15 Nov 2026): insert the rows with insert_dimension, then write them with update_values (never append_values);
sheet row N holds L-(N-1). verify exits 1 unless the two reads differ in exactly the planned cells and the new rows hold exactly the
planned values.
"""

import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT = ROOT / "content/ledger/malay-ledger.csv"
COLS = "ABCDEFGHIJKLMNOPQRST"
J, K = 9, 10
ORIGIN = "Kata-Kata placement batch 2 (Sam approved 15 Nov)"
DATE = "2026-11-17"  # Build B1 (chapters 1 to 3 and 5 to 9); the x04 plan of 15 Nov keeps its own date
BY = "Claude (Sam approved)"


def snapshot():
    with open(SNAPSHOT, newline="", encoding="utf-8") as f:
        return list(csv.reader(f))


def example(line, word):
    """The sentence of a scene line that holds the word (lines can be long narration)."""
    parts = re.split(r"(?<=[.!?…])\s+", line.strip())
    hit = next((p for p in parts if re.search(rf"(?<![\w-]){re.escape(word)}(?![\w-])", p, re.I)), parts[0])
    return hit.strip()


def plan(chapter, proposal, hana):
    rows = snapshot()
    header, body = rows[0], rows[1:]
    by_id = {r[0]: (i + 2, r) for i, r in enumerate(body)}  # sheet row = index in the tab, 1-based, header is row 1
    place = f"Ch{chapter} (extension)"
    picked = [r for r in csv.DictReader(open(proposal, encoding="utf-8")) if r["decision"] == place]
    promoted = [r for r in picked if r["existing ledger ID"]]
    new = [r for r in picked if not r["existing ledger ID"]]
    met = {r["word"]: r for r in csv.DictReader(open(Path(hana) / "docs/STAGE-2-step6a2-metfirst.csv", encoding="utf-8"))}
    card = lambda n: f"ms-x{chapter:02d}-{n:03d}"
    out = {"chapter": chapter, "place": place, "changes": [], "new": [], "cards": {}}
    for n, r in enumerate(promoted, 1):
        lid = r["existing ledger ID"]
        row_n, row = by_id[lid]
        if row[1] != r["word"]:
            raise SystemExit(f"{lid}: ledger says {row[1]!r}, the proposal {r['word']!r}")
        if not row[K].startswith("Jambatan · "):
            raise SystemExit(f"{lid}: place {row[K]!r} is not a Jambatan place")
        out["changes"].append({"lid": lid, "row": row_n, "word": r["word"], "cells": [
            {"col": "J", "before": row[J], "after": card(n)},
            {"col": "K", "before": row[K], "after": place},
        ]})
        out["cards"][card(n)] = {"lid": lid, "moved_from": row[J]}
    last = max(int(r[0][2:]) for r in body)
    if body[-1][0] != f"L-{last:04d}" or len(body) != last:
        raise SystemExit("the snapshot is not L-0001 to L-<last> in order")
    for i, r in enumerate(new):
        n = len(promoted) + i + 1
        lid = f"L-{last + 1 + i:04d}"
        m = met.get(r["word"]) or {}
        scenes = int(r["Hanashishou scenes count"] or 0)
        hs = f"{m['home_pack']} · band {m['band']}" if m else ""
        note = f"Placement batch 2: {r['reason']}."
        if m:
            note += f" Hanashishou: {scenes} scene{'s' if scenes != 1 else ''}; e.g. «{example(m['example_line'], r['scene form'] or r['word'])}» ({m['example_scene']})."
        if r["flags"]:
            note += f" {r['flags']}."
        values = [lid, r["word"], r["meaning (English)"], r["meaning (Japanese draft)"], r["POS"], r["affix tag"], r["root"],
                  "Not yet checked", "", card(n), place, hs, "Yes" if m else "", r["meaning (English)"] if m else "", ORIGIN, "Draft",
                  "KD4 check", note, DATE, BY]  # column N (Hanashishou meaning): the English meaning (Sam, 17 Nov 2026)
        assert len(values) == len(header) == 20
        out["new"].append({"lid": lid, "row": last + 2 + i, "values": values})
        out["cards"][card(n)] = {"lid": lid}
    return out


def apply(p):
    rows = snapshot()
    index = {r[0]: r for r in rows[1:]}
    for c in p["changes"]:
        r = index[c["lid"]]
        for cell in c["cells"]:
            col = COLS.index(cell["col"])
            if r[col] not in (cell["before"], cell["after"]):
                raise SystemExit(f"{c['lid']} {cell['col']}: snapshot has {r[col]!r}, the plan expects {cell['before']!r}")
            r[col] = cell["after"]
    have = {r[0] for r in rows[1:]}
    rows += [n["values"] for n in p["new"] if n["lid"] not in have]
    with open(SNAPSHOT, "w", encoding="utf-8", newline="") as f:
        csv.writer(f, lineterminator="\r\n").writerows(rows)
    print(f"snapshot: {len(p['changes'])} rows changed, {len(p['new'])} new, {len(rows) - 1} rows")


def to_csv(p, out):
    with open(out, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["action", "sheet row", *snapshot()[0]])
        for n in p["new"]:
            w.writerow(["insert", n["row"], *n["values"]])
        for c in p["changes"]:
            w.writerow(["change", c["row"], c["lid"], c["word"], *[f"{x['col']}: {x['before']} -> {x['after']}" for x in c["cells"]]])
    print(f"wrote {out}")


def load(path):
    return [r + [""] * (20 - len(r)) for r in json.load(open(path, encoding="utf-8"))["values"]]


def verify(before, after, p):
    ok = True
    n_old = len(before)
    if len(after) != n_old + len(p["new"]):
        print(f"row count: {len(before)} -> {len(after)}, expected +{len(p['new'])}")
        return 1
    planned = {(c["row"], x["col"], x["before"], x["after"]) for c in p["changes"] for x in c["cells"]}
    diff = set()
    for i, (b, a) in enumerate(zip(before, after[:n_old]), 1):
        for c in range(20):
            if b[c] != a[c]:
                diff.add((i, COLS[c], b[c], a[c]))
    for d in sorted(diff ^ planned):
        print("unexpected" if d in diff else "missing", d)
        ok = False
    for n in p["new"]:
        got = after[n["row"] - 1]
        if got != n["values"]:
            print("new row differs", n["lid"], [(COLS[i], g, w) for i, (g, w) in enumerate(zip(got, n["values"])) if g != w])
            ok = False
    for i, r in enumerate(after[1:], 2):  # sheet row N holds L-(N-1)
        if r[0] != f"L-{i - 1:04d}":
            print(f"row {i} holds {r[0]}")
            ok = False
            break
    print(f"{len(diff)} changed cells in existing rows ({len(planned)} planned), {len(p['new'])} new rows: {'OK' if ok else 'MISMATCH'}")
    return 0 if ok else 1


def main(argv):
    hana = "../hanashishou"
    if "--hana" in argv:
        i = argv.index("--hana")
        hana = argv[i + 1]
        del argv[i : i + 2]
    if argv[:1] == ["plan"] and len(argv) in (2, 3):
        print(json.dumps(plan(int(argv[1]), argv[2] if len(argv) == 3 else ROOT / "docs/VOCAB-PLACEMENT-proposal.csv", hana), ensure_ascii=False, indent=1))
        return 0
    if argv[:1] == ["apply"] and len(argv) == 2:
        apply(json.load(open(argv[1], encoding="utf-8")))
        return 0
    if argv[:1] == ["csv"] and len(argv) == 3:
        to_csv(json.load(open(argv[1], encoding="utf-8")), argv[2])
        return 0
    if argv[:1] == ["verify"] and len(argv) == 4:
        return verify(load(argv[1]), load(argv[2]), json.load(open(argv[3], encoding="utf-8")))
    raise SystemExit(__doc__)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
