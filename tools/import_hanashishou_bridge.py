"""Build the Jambatan (bridge) packs from the ledger and a Hanashishou checkout.

Usage (from the Kata-Kata repo root):
    python3 -I tools/import_hanashishou_bridge.py ../hanashishou [--map <map.json>]

A Jambatan card is owed to every live ledger row that a Hanashishou scene "meets first" (a word in a scene's
`firstMet` list in content/packs/<pack>/targets/ms/course.json that Kata-Kata does not place in a class chapter or a
Dunia scene), so the learner already knows it when the scene comes up (Sam, 14 Nov 2026; Stage 2 build step 6b).
Which scene meets which ledger row is Hanashishou's own audit (scripts/malay-audit.ts), kept in
content/bridge/hanashishou-metfirst.json (remake it with tools/bridge-metfirst.sh when the ledger or Hanashishou's
scenes change). This script does not walk the stories.

Writes:
  content/ms/jambatan/jambatan-<pack>.json  one Dunia scene per Hanashishou pack (the row's pack in the ledger's
                                            "Hanashishou (pack · band)" column; the pack with most scenes where that cell
                                            is empty), cards ordered by how many scenes meet the word.
  content/bridge/hanashishou-ms.json        every Malay word in Hanashishou's deck (word -> band, pack), so Kata-Kata can
                                            mark cards "also in Hanashishou" and the export can say how many words carry over.
  --map <file>                              {ledger id: {"ids": [...], "place": "..."}} for the rows whose card IDs or place
                                            the sheet must now show (tools/ledger/writeback.py plan reads it).

Card text comes from the ledger row (Malay, meanings, POS, affix tag), like a class card. The note gives one real line
from a scene, the standard/spoken partner where the ledger or Sam names one, and the scenes that use the word.
Card IDs are permanent (progress is keyed by them): a row keeps the ID it has in the ledger's card column, new cards are
numbered after the highest ID in their pack, and the ID of a dropped card is never reused.
Re-run after the ledger or Hanashishou's Malay scenes change; a second run gives identical files.
"""

import csv
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCENES = {
    "office": ("Pejabat", "At work", "仕事で"),
    "daily-life": ("Kehidupan harian", "Daily life", "毎日の暮らし"),
    "home-condo": ("Rumah dan kondo", "Home and condo", "家とコンド"),
    "health": ("Kesihatan", "Health", "健康"),
    "social": ("Bersosial", "Social life", "人づきあい"),
    "tutorial": ("Cara bermain", "How to play", "遊び方"),
}
# Spoken form and its standard partner (Sam, 14 Nov 2026): both cards say so.
SPOKEN = {"pasal": "tentang", "nyanyi": "menyanyi", "benda": "perkara"}
STANDARD = {std: spoken for spoken, std in SPOKEN.items()}
# Sam's pairs: both forms are fine; the card for the one in the ledger names the other.
BOTH_FINE = {"pusat beli-belah": "mall", "mall": "pusat beli-belah", "parkir": "tempat letak kereta", "tempat letak kereta": "parkir",
             "pesawat": "kapal terbang", "kapal terbang": "pesawat"}
SHOWN_SCENES = 4
# Words with a ber-/be-/meN- shape are left out of an example from Hanashishou's vocabulary file (the root-word rule of the first Jambatan packs).
ALLOW = {"berat", "bersih", "belok", "belakang", "belas", "belum", "beli", "besar", "bebas", "beliau", "berus", "merah", "meja",
         "meter", "mesyuarat", "mereka", "mendung", "menu", "belanja", "menang", "berapa", "belajar", "melati", "melaka"}


def affixed(sentence):
    out = []
    for w in re.findall(r"[A-Za-z][A-Za-z'-]*", sentence or ""):
        lw = w.lower()
        if lw not in ALLOW and (lw.startswith("ber") or re.match(r"^be[kl]", lw) or re.match(r"^me[^aeiou\W]", lw)):
            out.append(w)
    return out
# IDs of Jambatan cards dropped since they were first published (step 3c: jiran, pindah, sepupu became class cards): never reused.
RETIRED_IDS = ["ms-j-health-22"]


def read_ledger():
    with open(ROOT / "content/ledger/malay-ledger.csv", newline="", encoding="utf-8") as f:
        return {r["ID"]: r for r in csv.DictReader(f)}


def jambatan_ids(row):
    return re.findall(r"ms-j-[a-z0-9-]+", row["Kata-Kata (card IDs)"])


def main(hana, map_out=None):
    hana = Path(hana).resolve()
    commit = subprocess.run(["git", "-C", str(hana), "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
    ledger = read_ledger()
    metfirst = json.load(open(ROOT / "content/bridge/hanashishou-metfirst.json", encoding="utf-8"))
    if not metfirst["source"].startswith(f"hanashishou@{commit} "):
        raise SystemExit(f"content/bridge/hanashishou-metfirst.json is from {metfirst['source']}, not hanashishou@{commit}: run tools/bridge-metfirst.sh")
    rows = metfirst["rows"]

    # Hanashishou deck index (every Malay word, any band) and the scenes' English titles.
    index = {}
    titles = {}
    vocab_example = {}  # Hanashishou's own example line for a word (band 1, else band 2), when it has none of the affixed shapes
    for pack in sorted(p.name for p in (hana / "content/packs").iterdir()):
        vf = hana / f"content/packs/{pack}/targets/ms/vocab.json"
        if not vf.exists():
            continue
        for word, card in json.load(open(vf, encoding="utf-8")).items():
            index[word] = {"band": card["band"], "pack": pack}
            ex = card.get("examples", {})
            line = next((ex[b] for b in ("1", "2") if ex.get(b) and not affixed(ex[b])), None)
            if line and word.lower() not in vocab_example:
                vocab_example[word.lower()] = line
        en = json.load(open(hana / f"content/packs/{pack}/targets/ms/lang/en.json", encoding="utf-8"))
        for k, v in en.items():
            m = re.fullmatch(r"episode\.(.+)\.title", k)
            if m:
                titles[m.group(1)] = v

    # Existing cards: the ledger's card column (the sheet is the registry) says which row owns which ID, so a second run
    # before the write-back numbers the new cards the same way.
    registered = {i for row in ledger.values() for i in jambatan_ids(row)}
    old = {}
    for f in sorted((ROOT / "content/ms/jambatan").glob("jambatan-*.json")):
        pack = f.stem.removeprefix("jambatan-")
        for c in json.load(open(f, encoding="utf-8"))["cards"]:
            if c["id"] in registered:
                old[c["id"]] = (pack, c)
    missing = registered - set(old)
    if missing:
        raise SystemExit(f"ledger lists Jambatan cards that no pack has: {sorted(missing)}")
    next_n = {}
    for cid in list(old) + RETIRED_IDS:
        pack = cid[len("ms-j-"):].rsplit("-", 1)[0]
        next_n[pack] = max(next_n.get(pack, 0), int(cid.rsplit("-", 1)[1]))

    def home_pack(lid, eps):
        cell = ledger[lid]["Hanashishou (pack · band)"].split(" · ")[0]
        if cell:
            return cell
        count = {}
        for pack, _ in eps:
            count[pack] = count.get(pack, 0) + 1
        return min(count, key=lambda p: (-count[p], p))

    # Which cards exist after this run: (ledger id, pack, card, scene count)
    wanted = {}
    for lid, r in rows.items():
        row = ledger.get(lid)
        if row is None or row["Review status"] == "Retired":
            raise SystemExit(f"{lid} is met first but is not a live ledger row: remake hanashishou-metfirst.json")
        wanted[lid] = (home_pack(lid, r["eps"]), r)
    for lid, row in ledger.items():  # cards that already exist keep their place even if no scene meets the word now
        if lid not in wanted and jambatan_ids(row):
            pack = old[jambatan_ids(row)[0]][0]
            wanted[lid] = (pack, {"eps": [], "example": None, "forms": []})

    def scene_titles(eps):
        names = sorted({titles.get(e, e) for _, e in eps})
        if not names:
            return None
        shown = ", ".join(names[:SHOWN_SCENES]) + (f" and {len(names) - SHOWN_SCENES} more" if len(names) > SHOWN_SCENES else "")
        return f"In {len(eps)} Hanashishou scene{'s' if len(eps) != 1 else ''}: {shown}."

    def note_for(row, r, old_card):
        term = row["Malay"]
        alts = [a.strip().lower() for a in re.sub(r"\(.*?\)", "", term).split("/") if a.strip()]
        parts = []
        ex = next((vocab_example[a] for a in [term.strip().lower()] + alts if a in vocab_example), None)
        if ex is None and r["example"]:
            ex = r["example"]["text"].strip()
        ex = ex.strip() if ex else None
        if ex:
            parts.append(f"Hanashishou: {ex}" if ex[-1] in ".!?…»\"" else f"Hanashishou: {ex}.")
        for a in alts:
            if a in SPOKEN:
                parts.append(f"Spoken form; standard: {SPOKEN[a]}.")
            elif a in STANDARD:
                parts.append(f"Spoken form: {STANDARD[a]}.")
            if a in BOTH_FINE:
                parts.append(f"Both are fine: {BOTH_FINE[a]}.")
        sc = scene_titles(r["eps"])
        if sc:
            parts.append(sc)
        return " ".join(parts) or None

    # Build the packs. Existing cards keep their IDs; new cards are numbered in scene-count order.
    packs = {}
    card_of = {}
    for lid, (pack, r) in sorted(wanted.items(), key=lambda kv: (-len(kv[1][1]["eps"]), ledger[kv[0]]["Malay"].lower(), kv[0])):
        if pack not in SCENES:
            raise SystemExit(f"{lid}: no Jambatan scene for Hanashishou pack {pack!r}")
        row = ledger[lid]
        ids = jambatan_ids(row)
        if ids:
            cid, old_card = ids[0], old[ids[0]][1]
            if old[cid][0] != pack:
                raise SystemExit(f"{lid}: card {cid} is in {old[cid][0]} but the ledger says {pack}")
        else:
            next_n[pack] = next_n.get(pack, 0) + 1
            cid, old_card = f"ms-j-{pack}-{next_n[pack]:02d}", None
        term = row["Malay"]
        card_of[lid] = cid
        packs.setdefault(pack, []).append({
            "id": cid,
            "lang": "ms",
            "term": term,
            "gloss_en": row["Meaning (EN)"].strip(),
            "gloss_ja": row["Meaning (JA)"].strip(),
            "pos": row["POS"].strip(),
            "affix_tag": row["Affix tag"].strip() or ("chunk" if " " in term else "root"),
            "note": note_for(row, r, old_card),
            "links": [{"type": "babak", "target": f"dunia-jambatan-{pack}"}],
            "scene": f"dunia-jambatan-{pack}",
            "chapter": 9,
        })

    plan = {}
    for pack in sorted(packs):
        ms, en, ja = SCENES[pack]
        setting_en = f"Words you will meet in Hanashishou's {en.lower()} episodes, so they are already familiar when you arrive."
        setting_ja = f"話匠の「{ja}」のエピソードに出てくる言葉。先に覚えておけば、話匠に進んだときに見覚えがあります。"
        if pack == "tutorial":
            setting_en = "Words you will meet in Hanashishou's how-to-play tutorial, so they are already familiar when you arrive."
            setting_ja = "話匠の「遊び方」チュートリアルに出てくる言葉。先に覚えておけば、話匠に進んだときに見覚えがあります。"
        out = {
            "schema": "katakata.pack/1",
            "lang": "ms",
            "kind": "dunia",
            "id": f"jambatan-{pack}",
            "chapter": 9,
            "status": "live",
            "ja_review": "pending",
            "source": f"hanashishou@{commit} content/packs/{pack}/targets/ms/course.json firstMet words with a ledger row (content/bridge/hanashishou-metfirst.json)",
            "world": {"id": "jambatan", "ms": "Jambatan", "en": "Bridge to Hanashishou", "ja": "話匠への橋"},
            "title": {"ms": ms, "en": en, "ja": ja},
            "setting": {"en": setting_en, "ja": setting_ja},
            "cards": packs[pack],
        }
        path = ROOT / f"content/ms/jambatan/jambatan-{pack}.json"
        path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"jambatan-{pack}: {len(packs[pack])} cards")
    print(f"jambatan cards: {sum(len(c) for c in packs.values())}")

    (ROOT / "content/bridge/hanashishou-ms.json").write_text(
        json.dumps({"source": f"hanashishou@{commit}", "words": index}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )
    print(f"hanashishou-ms.json: {len(index)} words")

    if map_out:  # the J and K cells the sheet should show for every row whose Jambatan card is new
        mapping = {}
        for lid, (pack, _) in wanted.items():
            row = ledger[lid]
            if jambatan_ids(row):
                continue
            ids = [i.strip() for i in row["Kata-Kata (card IDs)"].split(",") if i.strip()] + [card_of[lid]]
            place = [p for p in [row["Kata-Kata place"].strip()] if p] + [f"Jambatan · {SCENES[pack][1]}"]
            mapping[lid] = {"ids": ids, "place": "; ".join(place)}
        Path(map_out).write_text(json.dumps(mapping, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"map: {len(mapping)} rows")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:]]
    map_out = None
    if "--map" in args:
        i = args.index("--map")
        map_out = args[i + 1]
        del args[i : i + 2]
    if len(args) != 1:
        raise SystemExit(__doc__)
    main(args[0], map_out)
