"""Add rows to the Malay ledger for terms that are new in either app, keeping every existing L-#### ID.

Usage (from the Kata-Kata repo root):
    python3 -I tools/ledger/append_ledger.py ../hanashishou /path/to/kd4.txt out.json

Reads the ledger snapshot (content/ledger/malay-ledger.csv, columns A-T of the sheet) and writes out.json:
  {"new": [row, ...],          new rows (A-T) numbered after the last ID, to append to the sheet
   "changed": [[row_no, col, before, after], ...]}   existing rows whose app columns moved
and appends the new rows to the snapshot CSV. The sheet stays the source of truth: upload "new" and
"changed", log them in the Journal, then check the Check tab says ALL MATCH.
"""

import csv
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_ledger as bl  # noqa: E402

CSV = bl.ROOT / "content/ledger/malay-ledger.csv"
V4 = {"lepak-mamak", "pejabat-sembang", "badan-bayi", "sukan-badminton", "simpulan-harian"}
COLS = ["ID", "Malay", "Meaning (EN)", "Meaning (JA)", "POS", "Affix tag", "Root (KD4)", "KD4 check", "KD4 ref (PDF page)",
        "Kata-Kata", "Kata-Kata place", "Hanashishou", "In both", "Hanashishou meaning (if different)", "Origin",
        "Review status", "Action", "Sam's notes", "Last changed", "Changed by"]


def main(hs, kd4_txt, out, today="2026-11-06"):
    head, blocks = bl.kd4_index(kd4_txt)
    rows = list(csv.reader(open(CSV, encoding="utf-8")))
    header, body = rows[0], rows[1:]
    kk, hsv = bl.load_katakata(), bl.load_hanashishou(hs)
    for r in kk:
        if any(r["id"].startswith(f"ms-d-{s}-") for s in V4):
            r["origin"] = "Vocab Bank v4 (Claude)"

    def alts(term):
        """"pintu masuk / pintu keluar" -> itself, "pintu masuk", "pintu keluar"; "(Kak)" notes are dropped."""
        return list(dict.fromkeys([bl.norm(term)] + [bl.norm(a) for a in re.sub(r"\(.*?\)", "", term).split("/") if a.strip()]))

    kk_by, hs_by = {}, {}
    for r in kk:
        for a in alts(r["term"]):
            kk_by.setdefault(a, []).append(r)
    for w in hsv:
        for a in alts(w):
            hs_by.setdefault(a, w)

    exact = {bl.norm(r[1]): i for i, r in enumerate(body)}

    def place(term):
        """Cards for a term: its own, plus cards met only as an alternative ("abang" in "Abang / Kakak").
        A card or word with a ledger row of its own stays there ("jam (spoken)" is not "jam")."""
        me = exact.get(bl.norm(term))
        mine = lambda t: exact.get(bl.norm(t), me) == me  # noqa: E731
        every = list({r["id"]: r for a in alts(term) for r in kk_by.get(a, [])}.values())
        cards = [r for r in every if mine(r["term"])] or every
        ws = [hs_by[a] for a in alts(term) if a in hs_by]
        w = next((x for x in ws if mine(x)), None)
        h = {**hsv[w], "word": w} if w else None
        app = {
            "Kata-Kata": ", ".join(r["id"] for r in cards),
            "Kata-Kata place": "; ".join(dict.fromkeys(r["loc"] for r in cards)),
            "Hanashishou": f"{h['pack']} · band {h['band']}" if h else "",
            "In both": "Yes" if cards and h else "",
        }
        return cards, h, app

    new, changed, covered = [], [], set()
    for i, r in enumerate(body):
        covered.update(alts(r[1]))
        _, _, app = place(r[1])
        for col, val in app.items():
            c = COLS.index(col)
            if r[c] != val:
                changed.append([i + 2, col, r[c], val])

    next_id = max(int(r[0][2:]) for r in body) + 1
    for term in [r["term"] for r in kk] + list(hsv):
        if any(a in covered for a in alts(term)):
            continue
        covered.update(alts(term))
        cards, h, app = place(term)
        e = {"term": term}
        k0 = cards[0] if cards else None
        status, ref, root = bl.kd4_check(e["term"], head, blocks)
        actions, hs_en = [], ""
        if k0 and h and bl.meanings_differ(k0["en"], h["en"]):
            hs_en = h["en"]
            actions.append("Meanings differ between the apps: agree one wording")
        if h and h.get("breaks"):
            actions.append("Hanashishou root-word rule: " + "; ".join(h["breaks"]))
        if status == "Not found":
            actions.append("Not in KD4: loanword or colloquial? Confirm it is the form to teach")
        if status == "Spelling differs":
            actions.append(f"KD4 standard spelling differs ({ref}): keep ours or switch?")
        row = {
            "ID": f"L-{next_id:04d}", "Malay": e["term"],
            "Meaning (EN)": k0["en"] if k0 else h["en"], "Meaning (JA)": k0["ja"] if k0 else h["ja"],
            "POS": k0["pos"] if k0 else h["pos"], "Affix tag": k0["affix"] if k0 else "", "Root (KD4)": root,
            "KD4 check": status, "KD4 ref (PDF page)": ref, **app, "Hanashishou meaning (if different)": hs_en,
            "Origin": k0["origin"] if k0 else "Hanashishou", "Review status": "Draft", "Action": "; ".join(actions),
            "Sam's notes": "", "Last changed": today, "Changed by": "Claude",
        }
        new.append([row[c] for c in COLS])
        next_id += 1
    with open(CSV, "a", encoding="utf-8", newline="") as f:
        csv.writer(f).writerows(new)
    json.dump({"new": new, "changed": changed}, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(new)} new rows (from {new[0][0] if new else '-'}), {len(changed)} changed cells")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    main(*sys.argv[1:])
