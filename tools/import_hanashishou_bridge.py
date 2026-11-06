"""Build the Jambatan (bridge) packs from a Hanashishou checkout.

Usage (from the Kata-Kata repo root):
    python3 -I tools/import_hanashishou_bridge.py ../hanashishou

Writes:
  content/ms/jambatan/jambatan-<pack>.json  Hanashishou's band 1-2 Malay words that Kata-Kata does not
                                            teach yet, one scene per Hanashishou setting, so learners meet
                                            them before they move on (spec 2, stage 3 "Jambatan").
  content/bridge/hanashishou-ms.json        every Malay word in Hanashishou's deck (word -> band, pack), so
                                            Kata-Kata can mark cards "also in Hanashishou" and the export
                                            can say how many words carry over.

Meanings (English, Japanese) come from Hanashishou's own language files, so both apps say the same thing.
Re-run after Hanashishou's Malay vocabulary changes.
"""

import glob
import json
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
}
BRIDGE_BANDS = {1, 2}
ALLOW = {"berat", "bersih", "belok", "belakang", "belas", "belum", "beli", "besar", "bebas", "beliau", "berus", "merah", "meja",
         "meter", "mesyuarat", "mereka", "mendung", "menu", "belanja", "berapa", "belajar", "melati", "melaka"}


def affixed(sentence):
    """Words with a ber-/be-/meN- shape (same rule as tools/affix-guard.mjs)."""
    import re
    out = []
    for w in re.findall(r"[A-Za-z][A-Za-z'-]*", sentence or ""):
        lw = w.lower()
        if lw in ALLOW:
            continue
        if lw.startswith("ber") or re.match(r"^be[kl]", lw) or re.match(r"^me[^aeiou\W]", lw):
            out.append(w)
    return out


def meaning(text):
    return (text or "").strip().rstrip(".。").strip()


def main(hana):
    hana = Path(hana).resolve()
    commit = subprocess.run(["git", "-C", str(hana), "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
    known = set()
    for f in glob.glob(str(ROOT / "content/ms/kelas/*.json")) + glob.glob(str(ROOT / "content/ms/dunia/**/*.json"), recursive=True):
        for c in json.load(open(f, encoding="utf-8"))["cards"]:
            known.add(c["term"].lower())

    index = {}
    for pack in sorted(p.name for p in (hana / "content/packs").iterdir()):
        vf = hana / f"content/packs/{pack}/targets/ms/vocab.json"
        if not vf.exists():
            continue
        vocab = json.load(open(vf, encoding="utf-8"))
        lang = {l: json.load(open(hana / f"content/packs/{pack}/targets/ms/lang/{l}.json", encoding="utf-8")) for l in ("en", "ja")}
        cards = []
        for word, card in vocab.items():
            index[word] = {"band": card["band"], "pack": pack}
            if pack not in SCENES or card["band"] not in BRIDGE_BANDS or word.lower() in known:
                continue
            ex = card.get("examples", {})
            # Only band 1-2 examples that keep Kata-Kata's root-word rule.
            example = next((ex[b] for b in ("1", "2") if ex.get(b) and not affixed(ex[b])), None)
            cards.append({
                "id": f"ms-j-{pack}-{len(cards) + 1:02d}",
                "lang": "ms",
                "term": word,
                "gloss_en": meaning(lang["en"].get(f"vocab.{word}.meaning")),
                "gloss_ja": meaning(lang["ja"].get(f"vocab.{word}.meaning")),
                "pos": card.get("pos", ""),
                "affix_tag": "chunk" if " " in word else "root",
                "note": f"Hanashishou: {example}" if example else None,
                "links": [{"type": "babak", "target": f"dunia-jambatan-{pack}"}],
                "scene": f"dunia-jambatan-{pack}",
                "chapter": 9,
            })
        if not cards:
            continue
        ms, en, ja = SCENES[pack]
        out = {
            "schema": "katakata.pack/1",
            "lang": "ms",
            "kind": "dunia",
            "id": f"jambatan-{pack}",
            "chapter": 9,
            "status": "live",
            "ja_review": "pending",
            "source": f"hanashishou@{commit} content/packs/{pack}/targets/ms (bands 1-2)",
            "world": {"id": "jambatan", "ms": "Jambatan", "en": "Bridge to Hanashishou", "ja": "話匠への橋"},
            "title": {"ms": ms, "en": en, "ja": ja},
            "setting": {
                "en": f"Words you will meet in Hanashishou's {en.lower()} episodes, so they are already familiar when you arrive.",
                "ja": f"話匠の「{ja}」のエピソードに出てくる言葉。先に覚えておけば、話匠に進んだときに見覚えがあります。",
            },
            "cards": cards,
        }
        path = ROOT / f"content/ms/jambatan/jambatan-{pack}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"jambatan-{pack}: {len(cards)} cards")

    (ROOT / "content/bridge/hanashishou-ms.json").write_text(
        json.dumps({"source": f"hanashishou@{commit}", "words": index}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )
    print(f"hanashishou-ms.json: {len(index)} words")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
