"""Trim Hanashishou's malay-audit output to the per-ledger-row data the Jambatan importer needs.

Why: a Jambatan card is owed to every ledger row that a Hanashishou scene meets before Kata-Kata teaches it
("met first", step 6a-2 and 6a-3 of Hanashishou). Which scene meets which word is worked out by Hanashishou's own
audit (scripts/malay-audit.ts: it walks every choice path of every Malay episode at bands 1 and 2 and matches words
to the ledger, longest phrase first, slash alternatives, regular di-/-nya/-kah/-lah forms by their base word).
Kata-Kata does not re-implement that; it keeps the result in content/bridge/hanashishou-metfirst.json.

Re-make the file (the Hanashishou checkout is only read; the audit runs in a scratch copy):

    tools/bridge-metfirst.sh ../hanashishou            # runs the audit in a scratch copy, then this script

or by hand: in a scratch copy of Hanashishou run `npm ci`, `npm run content` and
`npx tsx scripts/malay-audit.ts --ledger <this repo>/content/ledger/malay-ledger.csv --words-out <words.json>`, then

    python3 -I tools/bridge_metfirst.py <words.json> ../hanashishou

Output: content/bridge/hanashishou-metfirst.json, one entry per ledger row that has a met-first word:
  forms    the scene spellings that resolved to the row ("terima", "diterima")
  band     1 if a form is met at band 1, else 2
  eps      [[pack, episode], ...] the scenes that meet it (both bands), sorted
  example  one real line from a scene: a character's line or a choice first, then any line; shortest sensible one, band 1 first
"""

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def tokens(s):
    return [m.group(0) for m in re.finditer(r"[^\W\d_]+(?:['-][^\W\d_]+)*", s.lower())]


def has_word(line, form):
    t, f = tokens(line), tokens(form)
    return any(t[i : i + len(f)] == f for i in range(len(t) - len(f) + 1)) if f else False


def main(words_path, hana):
    hana = Path(hana).resolve()
    commit = subprocess.run(["git", "-C", str(hana), "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
    ep_pack = {}
    for course in sorted((hana / "content/packs").glob("*/targets/ms/course.json")):
        for ep in json.load(open(course, encoding="utf-8")):
            ep_pack[ep] = course.parts[-4]
    words = json.load(open(words_path, encoding="utf-8"))
    rows = {}
    for w in words:
        if not w["ledgerIds"]:
            continue
        r = rows.setdefault(w["ledgerIds"][0], {"forms": [], "band": 2, "eps": set(), "lines": []})
        r["forms"].append(w["word"])
        r["band"] = min(r["band"], w["band"])
        r["eps"].update(w["eps"])
        for l in w["lines"]:
            if has_word(l["text"], w["word"]):
                r["lines"].append(l)
    out = {}
    for lid, r in sorted(rows.items()):
        def rank(l):
            n = len(l["text"])
            return (0 if l["kind"] in ("dialogue", "choice") else 1, l["band"], 0 if 12 <= n <= 110 else 1, n, l["text"])
        ex = min(r["lines"], key=rank) if r["lines"] else None
        out[lid] = {
            "forms": sorted(set(r["forms"])),
            "band": r["band"],
            "eps": sorted([ep_pack[e], e] for e in r["eps"]),
            "example": {"ep": ex["ep"], "text": ex["text"]} if ex else None,
        }
    dest = ROOT / "content/bridge/hanashishou-metfirst.json"
    dest.write_text(json.dumps({"source": f"hanashishou@{commit} scripts/malay-audit.ts --words-out", "rows": out}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{dest.name}: {len(out)} ledger rows, {sum(1 for v in out.values() if not v['example'])} without an example line")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
