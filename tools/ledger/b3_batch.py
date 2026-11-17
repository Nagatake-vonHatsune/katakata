"""Build B3 (Sam, 17 Nov 2026): the ledger plan for placement batch 2's Jambatan words, «bisnes», the chapter 17 casual words,
the «satu per satu» merge and the «Events and outings» split.

Usage (from the repo root; Hanashishou checked out at 4be57ac in ../hanashishou):
    python3 -I tools/ledger/b3_batch.py plan > tools/ledger/batches/b3-plan.json   # new rows (Jambatan J/K blank) + fixed cell changes
    python3 -I tools/ledger/stretch_batch.py apply tools/ledger/batches/b3-plan.json  # into the snapshot
    tools/bridge-metfirst.sh ../hanashishou
    python3 -I tools/import_hanashishou_bridge.py ../hanashishou --map <map.json>
    python3 -I tools/ledger/b3_batch.py fill tools/ledger/batches/b3-plan.json <map.json>  # Jambatan J/K from the importer, moved K
    (then the sheet write: insert_dimension, update_values, read back, stretch_batch.py verify)

Every planned word was checked against the whole ledger (live, Retired and Jambatan rows) first: «belon» already has a row
(L-1781, ⚡ 9) and gets none; «mengantuk» (L-0768, a Jambatan row) is promoted to ⚡ 17 instead of a new row.
"""

import csv
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stretch_batch import BY, COLS, DATE, ORIGIN, example, snapshot  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
ORIGIN_SAM = "Sam approved 17 Nov"
J, K = 9, 10
CASUAL = "Ch17 (extension)"
# Chapter 17 casual words (Sam, 17 Nov 2026: yes): standard row, then its spoken partner; ⚡ 17 card IDs in that order.
# (word, EN, JA, POS, tag, root, card, partner note)
CASUAL_ROWS = [
    ("kasihan", "pity; poor thing", "かわいそうに、気の毒な", "adj", "root", "", "ms-x17-016",
     "the standard form; spoken partner «kesian»"),
    ("kesian", "pity, poor thing (spoken, for \"kasihan\")", "かわいそうに（「kasihan」の話し言葉）", "adj", "root", "", "ms-x17-017",
     "spoken; standard partner «kasihan»"),
    ("semakin", "more and more, increasingly", "ますます", "adv", "lex", "makin", "ms-x17-018",
     "the standard form; spoken partner «makin»"),
    ("makin", "more and more (spoken, for \"semakin\")", "ますます（「semakin」の話し言葉）", "adv", "root", "", "ms-x17-019",
     "spoken; standard partner «semakin»"),
    ("emak", "mother, mum", "お母さん、母", "noun", "root", "", "ms-x17-020",
     "the standard form; spoken partner «mak»"),
    ("mak", "mum (spoken, for \"emak\")", "お母さん（「emak」の話し言葉）", "noun", "root", "", "ms-x17-021",
     "spoken; standard partner «emak»"),
    # ms-x17-022 is «mengantuk» (L-0768, promoted)
    ("ngantuk", "sleepy (spoken, for \"mengantuk\")", "眠い（「mengantuk」の話し言葉）", "adj", "root", "", "ms-x17-023",
     "spoken; standard partner «mengantuk» (L-0768)"),
]
PROMOTE = [("L-0768", "mengantuk", "ms-x17-022")]
# Proposal words that Hanashishou meets only inside a compound of this same batch: once the compound has its row, Hanashishou's audit
# never meets the word alone, so it would be a Jambatan row with no card. No row (found in the first importer run).
# Proposal cells that cannot go into a card as they are: the pack schema has no "-wan" or "di- per- -i" tag. The row's word is
# «perbaharui» (active), so its Japanese is the active verb too. Both are whole words (lex) with their root in column G.
FIX = {"bisnes": {"meaning (English)": "business (spoken, for \"perniagaan\")", "meaning (Japanese draft)": "ビジネス（「perniagaan」の話し言葉）"},
       "perbaharui": {"affix tag": "lex", "meaning (Japanese draft)": "更新する"}, "pustakawan": {"affix tag": "lex"}}
INSIDE_COMPOUND = {"pengarah": "lembaga pengarah", "jagung": "bertih jagung", "skru": "pemutar skru", "pangkat": "kenaikan pangkat"}


def proposal():
    return list(csv.DictReader(open(ROOT / "docs/VOCAB-PLACEMENT-proposal.csv", encoding="utf-8")))


def metfirst():
    return {r["word"]: r for r in csv.DictReader(open(ROOT.parent / "hanashishou/docs/STAGE-2-step6a2-metfirst.csv", encoding="utf-8"))}


def norm(s):
    return re.sub(r"\s+", " ", re.sub(r"\(.*?\)", "", s).strip().lower())


def plan():
    rows = snapshot()
    header, body = rows[0], rows[1:]
    by_id = {r[0]: (i + 2, r) for i, r in enumerate(body)}
    words = {}
    for r in body:
        for alt in r[1].split("/"):
            words.setdefault(norm(alt), []).append(r[0])
    met = metfirst()
    last = max(int(r[0][2:]) for r in body)
    if body[-1][0] != f"L-{last:04d}" or len(body) != last:
        raise SystemExit("the snapshot is not L-0001 to L-<last> in order")
    casual_words = {c[0] for c in CASUAL_ROWS} | {"mengantuk"}
    out = {"build": "B3", "changes": [], "new": [], "cards": {}, "duplicates": [], "skipped": []}
    picked = []
    for r in proposal():
        if not r["decision"].startswith("Jambatan · ") and r["word"] != "bisnes":
            continue
        if r["word"] in casual_words:  # Sam: the four spoken words go to ⚡ 17 with their standard rows, not to Jambatan
            out["skipped"].append({"word": r["word"], "why": "Ch17 (extension) casual row instead (Sam, 17 Nov)"})
            continue
        if r["word"] in INSIDE_COMPOUND:
            out["skipped"].append({"word": r["word"], "why": f"met only inside «{INSIDE_COMPOUND[r['word']]}» (a row of this batch), so it would get no card"})
            continue
        hits = words.get(norm(r["word"]), [])
        if hits:
            out["duplicates"].append({"word": r["word"], "rows": hits, "handled": "no new row (the existing row stays as it is)"})
            continue
        picked.append(r)
    for w, *_ in CASUAL_ROWS:
        if words.get(norm(w)):
            raise SystemExit(f"{w}: already has a row {words[norm(w)]}")
    # Jambatan rows in proposal order, then «bisnes» and the casual rows (Origin «Sam approved 17 Nov»)
    picked.sort(key=lambda r: r["word"] == "bisnes")
    n = last
    for r in picked:
        r = {**r, **FIX.get(r["word"], {})}
        n += 1
        lid = f"L-{n:04d}"
        m = met.get(r["word"]) or met.get(r["scene form"] or "") or {}
        if not m:
            raise SystemExit(f"{r['word']}: not in Hanashishou's metfirst CSV")
        scenes = int(r["Hanashishou scenes count"] or 0)
        bisnes = r["word"] == "bisnes"
        reason = "spoken loan, Jambatan (Sam, 17 Nov: not ⚡ 17); the card pairs it with the standard «perniagaan» (L-1655, ⚡ 10)" if bisnes else r["reason"]
        note = f"Placement batch 2: {reason}."
        note += f" Hanashishou: {scenes} scene{'s' if scenes != 1 else ''}; e.g. «{example(m['example_line'], r['scene form'] or r['word'])}» ({m['example_scene']})."
        if r["flags"] and not bisnes:
            note += f" {r['flags']}."
        place = "" if r["decision"].startswith("Jambatan · Events") else r["decision"]  # filled from the importer's map
        if bisnes:
            place = "Jambatan · Daily life"
        values = [lid, r["word"], r["meaning (English)"], r["meaning (Japanese draft)"], r["POS"], r["affix tag"], r["root"],
                  "Not yet checked", "", "", place, f"{m['home_pack']} · band {m['band']}", "Yes", r["meaning (English)"],
                  ORIGIN_SAM if bisnes else ORIGIN, "Draft", "KD4 check", note, DATE, BY]
        out["new"].append({"lid": lid, "row": n + 1, "values": values, "jambatan": True})
    for w, en, ja, pos, tag, root, card, partner in CASUAL_ROWS:
        n += 1
        lid = f"L-{n:04d}"
        m = met.get(w) or {}
        note = f"Chapter 17 casual words (Sam, 17 Nov): {partner}."
        if m:
            note += f" Hanashishou: 1 scene; e.g. «{example(m['example_line'], w)}» ({m['example_scene']})."
        note += " The shared rules have no register pair for it yet (for the later Cikgu Sensai rules update)."
        values = [lid, w, en, ja, pos, tag, root, "Not yet checked", "", card, CASUAL,
                  f"{m['home_pack']} · band {m['band']}" if m else "", "Yes" if m else "", en if m else "",
                  ORIGIN_SAM, "Draft", "KD4 check", note, DATE, BY]
        out["new"].append({"lid": lid, "row": n + 1, "values": values})
        out["cards"][card] = {"lid": lid}
    # promoted: «mengantuk»
    for lid, word, card in PROMOTE:
        row_n, row = by_id[lid]
        assert row[1] == word and row[K] == "Jambatan · Health", row
        out["changes"].append({"lid": lid, "row": row_n, "word": word, "cells": [
            {"col": "J", "before": row[J], "after": card}, {"col": "K", "before": row[K], "after": CASUAL}]})
        out["cards"][card] = {"lid": lid, "moved_from": row[J]}
    # the «satu per satu» merge (Sam, 17 Nov, answer 1)
    row_n, row = by_id["L-1532"]
    assert row[1] == "satu-satu", row
    out["changes"].append({"lid": "L-1532", "row": row_n, "word": "satu per satu", "cells": [
        {"col": "B", "before": row[1], "after": "satu per satu"},
        {"col": "F", "before": row[5], "after": "chunk"},
        {"col": "R", "before": row[17], "after": row[17] + " Build B3 (Sam, 17 Nov): now «satu per satu», the standard phrase; «satu-satu» is also heard"
         " (the card says so). L-1638 merged into this row; its card ms-x03-023 moves to ms-x03-022. Hanashishou writes «satu-satu»."}]})
    row_n, row = by_id["L-1638"]
    assert row[1] == "satu per satu" and row[15] == "Draft", row
    out["changes"].append({"lid": "L-1638", "row": row_n, "word": "satu per satu", "cells": [
        {"col": "J", "before": row[J], "after": ""},
        {"col": "K", "before": row[K], "after": "Retired: merged into L-1532"},
        {"col": "P", "before": row[15], "after": "Retired"},
        {"col": "Q", "before": row[16], "after": ""},
        {"col": "R", "before": row[17], "after": row[17] + " Retired 17 Nov (Sam, Build B3): merged into L-1532, which is now «satu per satu»;"
         " card ms-x03-023 moves to ms-x03-022. Retired, not deleted (permanent IDs)."},
        {"col": "T", "before": row[19], "after": "Claude (Sam's decision)"}]})
    return out


def fill(plan_path, map_path):
    """Jambatan rows: J and K from the importer's map; existing rows whose place the map changes (the split): K only."""
    p = json.load(open(plan_path, encoding="utf-8"))
    mp = json.load(open(map_path, encoding="utf-8"))
    rows = snapshot()
    index = {r[0]: r for r in rows[1:]}
    planned_new = {n["lid"]: n for n in p["new"]}
    missing = []
    for lid, n in planned_new.items():
        if not n.get("jambatan"):
            continue
        if lid not in mp:
            missing.append(n["values"][1])
            continue
        n["values"][J] = ", ".join(mp[lid]["ids"])
        n["values"][K] = mp[lid]["place"]
        index[lid][J], index[lid][K] = n["values"][J], n["values"][K]
    if missing:
        raise SystemExit(f"new Jambatan rows with no card (no scene meets them first): {missing}")
    p["changes"] = [c for c in p["changes"] if not c.get("split")]
    for lid, m in sorted(mp.items()):
        if lid in planned_new:
            continue
        r = index[lid]
        ids = ", ".join(m["ids"])
        if ids != r[J]:
            raise SystemExit(f"{lid}: the map changes card IDs ({r[J]!r} -> {ids!r}); only places may change")
        if m["place"] != r[K]:
            if "Events and outings" not in r[K]:
                raise SystemExit(f"{lid}: unexpected place change {r[K]!r} -> {m['place']!r}")
            p["changes"].append({"lid": lid, "row": int(lid[2:]) + 1, "word": r[1], "split": True,
                                 "cells": [{"col": "K", "before": r[K], "after": m["place"]}]})
            r[K] = m["place"]
    with open(ROOT / "content/ledger/malay-ledger.csv", "w", encoding="utf-8", newline="") as f:
        csv.writer(f, lineterminator="\r\n").writerows(rows)
    Path(plan_path).write_text(json.dumps(p, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    moved = sum(1 for c in p["changes"] if c.get("split"))
    print(f"filled {sum(1 for n in p['new'] if n.get('jambatan'))} Jambatan rows; {moved} moved rows (K only)")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["plan"]:
        print(json.dumps(plan(), ensure_ascii=False, indent=1))
    elif len(a) == 3 and a[0] == "fill":
        fill(a[1], a[2])
    else:
        raise SystemExit(__doc__)
