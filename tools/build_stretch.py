"""Build a chapter's ⚡ pack (content/ms/stretch/xNN.json) from the ledger and a hand-written source.

Usage (from the repo root):
    python3 -I tools/build_stretch.py 4        # reads content/source/stretch/x04.json

Cards: one per ledger row placed «ChN (extension)», in card-ID order. A row's card ID is the ledger's card column
(the registry; tools/ledger/stretch_batch.py assigns them), and the card text is the ledger's (Malay, meanings, POS, affix tag),
like a class card. The source adds a short note per row (a string, or {"en", "ja", "register": "formal"} for a note in two
languages and a register label), 4 to 6 frames (with decoy tiles) and the dialogue (lines with
"choices" are reply steps). IDs: frames ms-xNN-fNN, lines ms-xNN-dNN, in source order. Whether the pack ships is
tools/import-overrides.json "live_stretch". Optional "cari": {"scene": <Dunia picture scene>, "images": {ledger ID: emoji}, "core": [drawn
core card IDs of that scene]} adds Cari Benda ⚡ (design note section 4). A second run gives an identical file.
"""

import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OVR = json.loads((ROOT / "tools" / "import-overrides.json").read_text(encoding="utf-8"))


def main(chapter):
    xid = f"x{chapter:02d}"
    src = json.loads((ROOT / f"content/source/stretch/{xid}.json").read_text(encoding="utf-8"))
    kelas = json.loads((ROOT / f"content/ms/kelas/c{chapter:02d}.json").read_text(encoding="utf-8"))
    place = re.compile(rf"^\s*Ch\s*{chapter}\s*\(extension\)", re.I)
    with open(ROOT / "content/ledger/malay-ledger.csv", newline="", encoding="utf-8") as f:
        rows = [r for r in csv.DictReader(f) if place.match(r["Kata-Kata place"]) and r["Review status"] != "Retired"]
    cards = []
    for r in rows:
        ids = re.findall(rf"ms-{xid}-\d{{3}}", r["Kata-Kata (card IDs)"])
        if len(ids) != 1:
            raise SystemExit(f"{r['ID']} {r['Malay']}: the ledger card column must hold one ms-{xid}-NNN ID (has {r['Kata-Kata (card IDs)']!r})")
        if r["ID"] not in src["notes"]:
            raise SystemExit(f"{r['ID']} {r['Malay']}: no note in the source")
        note = src["notes"][r["ID"]]
        if isinstance(note, str):
            note = {"en": note}
        card = {
            "id": ids[0],
            "lang": "ms",
            "term": r["Malay"].strip(),
            "gloss_en": r["Meaning (EN)"].strip(),
            "gloss_ja": r["Meaning (JA)"].strip(),
            "pos": r["POS"].strip(),
            "affix_tag": r["Affix tag"].strip() or note.get("tag") or "root",  # "tag" in the source note: only when the ledger cell is blank
            "note": note["en"],
            "links": [{"type": "babak", "target": f"stretch-{xid}"}],
            "scene": f"stretch-{xid}",
            "chapter": chapter,
        }
        if note.get("ja"):
            card["note_ja"] = note["ja"]
        if note.get("register"):
            card["register"] = note["register"]
        if r["ID"] in src.get("cari", {}).get("images", {}):
            card["image"] = src["cari"]["images"][r["ID"]]
        cards.append(card)
    cards.sort(key=lambda c: c["id"])
    extra = set(src["notes"]) - {r["ID"] for r in rows}
    if extra:
        raise SystemExit(f"notes for rows that are not «Ch{chapter} (extension)»: {sorted(extra)}")
    frames = []
    for i, f in enumerate(src["frames"], 1):
        words = f["example"].split()
        for d in f.get("decoys", []):
            if d in words:
                raise SystemExit(f"frame {i}: decoy {d!r} is a tile of the sentence")
        frames.append({"id": f"ms-{xid}-f{i:02d}", "frame": f["frame"], "example": f["example"], "meaning_en": f["meaning_en"],
                       "meaning_ja": f.get("meaning_ja"), "decoys": f.get("decoys", [])})
    lines = []
    for i, l in enumerate(src["lines"], 1):
        line = {"id": f"ms-{xid}-d{i:02d}", "speaker": l["speaker"], "ms": l["ms"], "en": l["en"]}
        if l.get("choices"):
            if i == 1 or len(l["choices"]) != 2 or len(l.get("choices_en", [])) != 2:
                raise SystemExit(f"line {i}: a reply line needs a line before it, two choices and two choices_en")
            line["choices"], line["choices_en"] = l["choices"], l["choices_en"]
        if l.get("note"):  # {"en", "ja"}: a usage note shown with the line in the reply step
            line["note"], line["note_ja"] = l["note"]["en"], l["note"]["ja"]
        lines.append(line)
    replies = sum(1 for l in lines if l.get("choices"))
    if not (4 <= len(frames) <= 6 and 8 <= len(lines) <= 14 and 3 <= replies <= 5):
        raise SystemExit(f"⚡ {chapter}: {len(frames)} frames (4 to 6), {len(lines)} lines (8 to 14), {replies} replies (3 to 5)")
    pack = {
        "schema": "katakata.pack/1",
        "lang": "ms",
        "kind": "stretch",
        "id": xid,
        "chapter": chapter,
        "status": "live" if xid in OVR.get("live_stretch", []) else "draft",
        "ja_review": "pending",
        "title": kelas["title"],
        "cards": cards,
        "frames": frames,
        "scenario": {"title_en": src.get("scenario_title_en"), "title_ja": src.get("scenario_title_ja"), "lines": lines},
    }
    if src.get("cari"):
        # Cari Benda ⚡: at least four drawn extension nouns, and core objects (with pictures) from the named picture scene.
        scene = json.loads(next((ROOT / "content/ms/dunia").rglob(f"{src['cari']['scene']}.json")).read_text(encoding="utf-8"))
        drawn = {c["id"]: c for c in scene["cards"] if c.get("image")}
        bad = [i for i in src["cari"]["core"] if i not in drawn]
        if bad or sum(1 for c in cards if c.get("image")) < 4 or len(src["cari"]["core"]) < 3:
            raise SystemExit(f"⚡ {chapter} cari: needs 4+ drawn extension nouns and 3+ drawn core objects of {src['cari']['scene']} (not drawn there: {bad})")
        pack["cari"] = {"scene": src["cari"]["scene"], "core": src["cari"]["core"]}
    out = ROOT / f"content/ms/stretch/{xid}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(pack, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"stretch {xid}: {len(cards)} cards, {len(frames)} frames, {len(lines)} lines ({replies} replies), {pack['status']}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(int(sys.argv[1]))
