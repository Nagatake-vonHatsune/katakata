"""Import the Kata-Kata Vocab Bank workbook into JSON content packs.

Usage (from the repo root):
    python3 -I tools/import_vocab_bank.py path/to/KataKata_VocabBank_vN.xlsx

Writes one pack per chapter (content/ms/kelas/cNN.json) and one per Dunia scene
(content/ms/dunia/<world>/<scene>.json). Hand-written extras (Japanese drafts,
emoji, which packs are live) come from tools/import-overrides.json.

Re-running overwrites the packs, so edit the workbook or the overrides file,
not the generated JSON, if you want changes to survive a re-import.

Optional workbook column: "Note" on the Dunia scenes tab (a card note, e.g. one line per festival).
Optional overrides key: "sedia_kelas_review": {"4": ["ms-c04-008", ...]} adds cards that live in other
chapters (moved or merged cards) to a chapter's Sedia Kelas list, so the chapter still reviews them.
"""

import json
import re
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
OVR = json.loads((ROOT / "tools" / "import-overrides.json").read_text(encoding="utf-8"))
SCHEMA = "katakata.pack/1"

HOOK_TYPES = {"bunyi", "kanji", "pinjam", "keluarga", "amaran"}
WORD_RE = re.compile(r"[A-Za-z][A-Za-z'-]*")


def rows(ws):
    it = ws.iter_rows(values_only=True)
    header = next(it)
    for r in it:
        if r and any(c is not None for c in r):
            yield dict(zip(header, r))


def clean(v):
    if v is None:
        return None
    v = str(v).strip()
    return v or None


def tokens(text):
    return [t.lower().strip("-'") for t in WORD_RE.findall(text or "")]


def term_alternatives(term):
    # "tidak / tak", "Abang / Kakak (Kak)" -> one token set per alternative
    alts = []
    for alt in re.split(r"/", re.sub(r"\(.*?\)", " ", term)):
        toks = {t for t in tokens(alt) if t}
        if toks:
            alts.append(toks)
    return alts


def used_in(term, used):
    """True when every word of at least one alternative of the term is used."""
    return any(alt <= used for alt in term_alternatives(term))


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main(xlsx):
    wb = openpyxl.load_workbook(xlsx, data_only=True)
    vocab = list(rows(wb["Kelas vocab"]))
    frames = list(rows(wb["Kelas frames"]))
    scen = list(rows(wb["Kelas scenarios"]))
    dunia = list(rows(wb["Dunia scenes"]))
    index = list(rows(wb["Dunia index"]))
    images = OVR["images"]

    scene_rows = {}
    for r in index:
        sid = r["Scene ID"]
        scene_rows[sid] = r

    # Which Dunia scene primes each chapter (first in index order).
    primes = {}
    for r in index:
        primes.setdefault(int(r["Primes chapter"]), r["Scene ID"])

    for ch in range(1, 10):
        cid = f"c{ch:02d}"
        ch_frames = [f for f in frames if f["Chapter"] == ch]
        ch_scen = [s for s in scen if s["Chapter"] == ch]
        scen_title = ch_scen[0]["Scenario"] if ch_scen else None
        cards = []
        for v in (v for v in vocab if v["Chapter"] == ch):
            tag = clean(v["Affix tag"])
            note = clean(v["Note"])
            card = {
                "id": v["ID"],
                "lang": "ms",
                "term": clean(v["Malay"]),
                "gloss_en": clean(v["English"]),
                "gloss_ja": clean(v["Japanese (draft)"]),
                "pos": clean(v["POS"]),
                "affix_tag": tag,
                "note": note,
                "links": [{"type": "babak", "target": f"kelas-{cid}"}],
                "scene": f"kelas-{cid}",
                "chapter": ch,
            }
            if tag == "pe(N)-" or (note and "recognise only" in note.lower()):
                card["recognise_only"] = True
            cards.append(card)

        # Sedia Kelas core words: cards whose words appear in the chapter's
        # frames or scenario (what the student needs to follow the class).
        used = set()
        for f in ch_frames:
            used.update(tokens(f["Frame"]))
            used.update(tokens(f["Example"]))
        for s in ch_scen:
            used.update(tokens(s["Malay"]))
        core = [c["id"] for c in cards if not c.get("recognise_only") and used_in(c["term"], used)]
        core += [i for i in OVR.get("sedia_kelas_review", {}).get(str(ch), []) if i not in core]

        pack = {
            "schema": SCHEMA,
            "lang": "ms",
            "kind": "kelas",
            "id": cid,
            "chapter": ch,
            "status": "live" if cid in OVR["live_kelas"] else "draft",
            "ja_review": "pending",
            "title": OVR["chapter_titles"][str(ch)],
            "cards": cards,
            "frames": [
                {
                    "id": f["ID"],
                    "frame": clean(f["Frame"]),
                    "example": clean(f["Example"]),
                    "meaning_en": clean(f["Meaning"]),
                    "meaning_ja": OVR["frame_meaning_ja"].get(f["ID"]),
                }
                for f in ch_frames
            ],
            "scenario": {
                "title_en": scen_title,
                "title_ja": OVR["scenario_titles_ja"].get(str(ch)),
                "lines": [
                    {"id": s["ID"], "speaker": clean(s["Speaker"]), "ms": clean(s["Malay"]), "en": clean(s["English"])}
                    for s in ch_scen
                ],
            },
            "sedia_kelas": {
                "cards": core,
                "frames": [f["ID"] for f in ch_frames[:2]],
                "scene": primes.get(ch),
            },
        }
        write(ROOT / "content" / "ms" / "kelas" / f"{cid}.json", pack)
        print(f"kelas {cid}: {len(cards)} cards, {len(ch_frames)} frames, {len(core)} core, scene={primes.get(ch)}")

    by_scene = {}
    for d in dunia:
        sid = d["ID"].removeprefix("ms-d-").rsplit("-", 1)[0]
        by_scene.setdefault(sid, []).append(d)

    for sid, items in by_scene.items():
        meta = scene_rows[sid]
        world_name = meta["World"]
        world = OVR["world_slugs"][world_name]
        ch = int(meta["Primes chapter"])
        ja = OVR["scene_ja"].get(sid, {})
        cards = []
        for d in items:
            links = [{"type": "babak", "target": f"dunia-{sid}"}]
            ht = clean(d["Hook type"])
            if ht:
                if ht not in HOOK_TYPES:
                    raise SystemExit(f"{d['ID']}: unknown hook type {ht}")
                links.append({"type": ht, "text": clean(d["Hook / association"])})
            card = {
                "id": d["ID"],
                "lang": "ms",
                "term": clean(d["Malay"]),
                "gloss_en": clean(d["English"]),
                "gloss_ja": clean(d["Japanese (draft)"]),
                "pos": clean(d["POS"]),
                "affix_tag": clean(d["Affix tag"]),
                "note": clean(d.get("Note")),
                "links": links,
                "scene": f"dunia-{sid}",
                "chapter": ch,
            }
            seen = clean(d["Seen in class"])
            if seen:
                card["seen_in_class"] = int(seen.removeprefix("Ch"))
            if d["ID"] in images:
                card["image"] = images[d["ID"]]
            cards.append(card)
        en_world = re.search(r"\((.*)\)", world_name)
        pack = {
            "schema": SCHEMA,
            "lang": "ms",
            "kind": "dunia",
            "id": sid,
            "chapter": ch,
            "status": "live" if sid in OVR["live_dunia"] else "draft",
            "ja_review": "pending",
            "world": {
                "id": world,
                "ms": world_name.split(" (")[0],
                "en": en_world.group(1) if en_world else world_name,
                "ja": OVR["world_ja"].get(world),
            },
            "title": {"ms": clean(meta["Scene"]), "en": clean(meta["English"]), "ja": ja.get("title")},
            "setting": {"en": clean(meta["Setting"]), "ja": ja.get("setting")},
            "cards": cards,
        }
        write(ROOT / "content" / "ms" / "dunia" / world / f"{sid}.json", pack)
        print(f"dunia {sid}: {len(cards)} cards, world={world}, primes={ch}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
