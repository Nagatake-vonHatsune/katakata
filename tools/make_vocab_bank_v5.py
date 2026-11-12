"""One-off: build Vocab Bank v5 from v4 by applying the Kata-Kata clean-up after Cikgu Sensai Stage 1.

Usage (from the repo root):
    python3 -I tools/make_vocab_bank_v5.py <v4.xlsx> <out-v5.xlsx> [--through N] [--map out.json]

Source of the list: docs/kata-kata-cleanup.md in the Cikgu Sensai repository (12 Nov 2026), plus the five
rows Sam approved afterwards (L-1084 to L-1088) and Sam's in-session answers to the brief's proposals
(12 Nov 2026). The Malay ledger (content/ledger/malay-ledger.csv, a snapshot of the Google Sheet) is the
source of truth: every new card takes its ledger row's Malay, meanings, part of speech, affix tag and
chapter. The script only adds notes (usage notes from the ledger or Sam's decisions, never new
etymology), moves, removals and the frame/scenario corrections.

--through N applies chapters 1..N only (the repo's commits are one chapter each); --map writes, for every
ledger row touched, the card IDs and place the sheet should now show.

Run tools/import_vocab_bank.py on the result, then tools/import_hanashishou_bridge.py (against the same
Hanashishou commit as before) so Jambatan drops words that are now class cards.
"""

import argparse
import csv
import json
import re
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent

POS = {
    "noun": "noun", "verb": "verb", "adj": "adj", "adjective": "adj", "adverb": "adv", "adv": "adv",
    "preposition": "prep", "prep": "prep", "conjunction": "conj", "conj": "conj", "question word": "question",
    "question": "question", "number": "number", "particle": "particle", "interj": "interj", "copula": "copula",
    "classifier": "counter", "phrase": "phrase", "det / pron": "det", "pron": "pron", "aspect": "aspect",
}


def norm(term):
    """Same rule as the app's card matching (src/core/content.ts)."""
    return re.sub(r"[.!?,]", "", term.lower()).strip()


def pos_of(row):
    p = row["POS"].strip().lower()
    return POS.get(p, p)


def clean_pending(place):
    """'Ch2 (pending; hobby word bank)' -> 'Ch2 (hobby word bank)'."""
    p = re.sub(r"\(pending\)", "", place)
    p = re.sub(r"\(pending; ", "(", p)
    p = re.sub(r"; pending\)", ")", p)
    p = re.sub(r"\s+;", ";", p)
    p = re.sub(r"\s{2,}", " ", p)
    return p.strip(" ;")


class Bank:
    def __init__(self, src, ledger_csv):
        self.wb = openpyxl.load_workbook(src)
        self.kv, self.kf, self.ks = self.wb["Kelas vocab"], self.wb["Kelas frames"], self.wb["Kelas scenarios"]
        self.ds, self.di = self.wb["Dunia scenes"], self.wb["Dunia index"]
        if self.ds.cell(1, 14).value != "Note":
            self.ds.cell(1, 14).value = "Note"
        self.ledger = {r["ID"]: r for r in csv.DictReader(open(ledger_csv, encoding="utf-8", newline=""))}
        # The highest number ever used per ID prefix, taken before any edit, so IDs are never reused.
        self.max = {}
        for ws in (self.kv, self.ds):
            for (cid,) in ws.iter_rows(min_row=2, max_col=1, values_only=True):
                if cid:
                    prefix, n = cid.rsplit("-", 1)
                    self.max[prefix] = max(self.max.get(prefix, 0), int(n))
        self.touched = set()  # normalised terms of cards added or moved: their Dunia twins get the 'seen in class' chip
        self.map = {}  # ledger id -> {"ids": [...], "place": str, "note": str}

    # --- lookups -------------------------------------------------------------------------------------------
    @staticmethod
    def row_of(ws, key, col=1):
        for r in range(2, ws.max_row + 1):
            if ws.cell(r, col).value == key:
                return r
        raise KeyError(key)

    def vocab(self, card_id):
        r = self.row_of(self.kv, card_id)
        h = [c.value for c in self.kv[1]]
        return r, {h[i]: self.kv.cell(r, i + 1).value for i in range(len(h))}

    def next_id(self, prefix):
        self.max[prefix] = self.max.get(prefix, 0) + 1
        return f"{prefix}-{self.max[prefix]:03d}" if prefix.startswith("ms-c") else f"{prefix}-{self.max[prefix]:02d}"

    # --- ledger bookkeeping --------------------------------------------------------------------------------
    def led(self, lid, ids=None, place=None, drop=(), add=(), add_place=None):
        """Record what the sheet's 'Kata-Kata (card IDs)' and 'Kata-Kata place' should say for a ledger row."""
        row = self.ledger[lid]
        cur = self.map.get(lid) or {
            "ids": [i.strip() for i in row["Kata-Kata (card IDs)"].split(",") if i.strip()],
            "place": row["Kata-Kata place"],
        }
        if ids is not None:
            cur["ids"] = list(ids)
        else:
            cur["ids"] = [i for i in cur["ids"] if i not in drop] + [i for i in add if i not in cur["ids"]]
        if place is not None:
            cur["place"] = place
        elif add_place:
            cur["place"] = f"{cur['place']}; {add_place}" if cur["place"] else add_place
        cur["place"] = clean_pending(cur["place"])
        self.map[lid] = cur
        return cur

    # --- Kelas ---------------------------------------------------------------------------------------------
    def add_kelas(self, ch, lid, note=None, drop=(), place=None, **over):
        """A new class card from a ledger row (Malay, meanings, POS, tag and chapter come from the ledger)."""
        row = self.ledger[lid]
        if not re.search(rf"\bCh{ch}\b", row["Kata-Kata place"]):
            raise SystemExit(f"{lid}: ledger place is '{row['Kata-Kata place']}', not Ch{ch}")
        cid = self.next_id(f"ms-c{ch:02d}")
        tag = over["tag"] if "tag" in over else row["Affix tag"]
        term = over["term"] if "term" in over else row["Malay"]
        self.kv.append([
            cid, ch, term, over["en"] if "en" in over else row["Meaning (EN)"], over["ja"] if "ja" in over else row["Meaning (JA)"],
            over["pos"] if "pos" in over else pos_of(row), tag, note, f"cub::ms::c{ch:02d} {tag}",
        ])
        self.touched.add(norm(term))
        self.led(lid, drop=drop, add=[cid], place=place)
        return cid

    def edit_kelas(self, card_id, **fields):
        """fields: chapter, term, en, ja, pos, tag, note (use note=None to clear)."""
        r, _ = self.vocab(card_id)
        col = {"chapter": 2, "term": 3, "en": 4, "ja": 5, "pos": 6, "tag": 7, "note": 8}
        for k, v in fields.items():
            self.kv.cell(r, col[k]).value = v
        if "chapter" in fields or "tag" in fields:
            _, d = self.vocab(card_id)
            self.kv.cell(r, 9).value = f"cub::ms::c{int(d['Chapter']):02d} {d['Affix tag']}"
        if "chapter" in fields:
            self.touched.add(norm(self.kv.cell(r, 3).value))

    def remove_kelas(self, card_id):
        self.kv.delete_rows(self.row_of(self.kv, card_id))

    # --- frames and scenarios ------------------------------------------------------------------------------
    def edit_frame(self, fid, frame=None, example=None, meaning=None):
        r = self.row_of(self.kf, fid)
        for col, v in ((3, frame), (4, example), (5, meaning)):
            if v is not None:
                self.kf.cell(r, col).value = v

    def add_frame(self, ch, fid, frame, example, meaning):
        self.kf.append([fid, ch, frame, example, meaning])

    def edit_line(self, lid, ms=None, en=None, speaker=None):
        r = self.row_of(self.ks, lid)
        for col, v in ((4, speaker), (5, ms), (6, en)):
            if v is not None:
                self.ks.cell(r, col).value = v

    def retitle_scenario(self, ch, title):
        for r in range(2, self.ks.max_row + 1):
            if self.ks.cell(r, 2).value == ch:
                self.ks.cell(r, 3).value = title

    # --- Dunia ---------------------------------------------------------------------------------------------
    def dunia_row(self, did):
        r = self.row_of(self.ds, did)
        h = [c.value for c in self.ds[1]]
        return r, {h[i]: self.ds.cell(r, i + 1).value for i in range(len(h))}

    def edit_dunia(self, did, **fields):
        """fields: term, en, ja, pos, tag, hook_type, hook, seen, note."""
        r, _ = self.dunia_row(did)
        col = {"term": 5, "en": 6, "ja": 7, "pos": 8, "tag": 9, "hook_type": 10, "hook": 11, "seen": 12, "note": 14}
        for k, v in fields.items():
            self.ds.cell(r, col[k]).value = v

    def add_dunia(self, scene_id, lid=None, note=None, hook_type=None, hook=None, seen=None, place=None, **over):
        """A new Dunia card. With a ledger id it takes that row's Malay, meanings, POS and tag."""
        r = self.row_of(self.di, scene_id)
        world, scene_ms, scene_en, primes = (self.di.cell(r, c).value for c in (2, 3, 4, 5))
        row = self.ledger[lid] if lid else None
        did = self.next_id(f"ms-d-{scene_id}")
        term = over["term"] if "term" in over else (row["Malay"] if row else None)
        tag = over["tag"] if "tag" in over else (row["Affix tag"] if row else "root")
        pick = lambda key, field: over[key] if key in over else (row[field] if row else None)
        self.ds.append([
            did, world, f"{scene_ms} ({scene_en})", primes, term, pick("en", "Meaning (EN)"), pick("ja", "Meaning (JA)"),
            over["pos"] if "pos" in over else (pos_of(row) if row else None),
            tag, hook_type, hook, seen, f"katakata::ms::dunia::{scene_id}", note,
        ])
        if lid:
            scene_label = self.scene_label(scene_id)
            self.led(lid, add=[did], place=place, add_place=None if place else f"Dunia · {scene_label} (primes Ch{primes})")
        self.di.cell(r, 6).value = sum(1 for x in self.ds.iter_rows(min_row=2, max_col=1, values_only=True) if x[0] and x[0].startswith(f"ms-d-{scene_id}-"))
        return did

    def scene_label(self, scene_id):
        return self.di.cell(self.row_of(self.di, scene_id), 3).value

    def add_scene(self, scene_id, world, scene_ms, scene_en, primes, setting):
        self.di.append([scene_id, world, scene_ms, scene_en, primes, 0, setting])

    def rename_scene(self, scene_id, scene_ms, scene_en, setting):
        r = self.row_of(self.di, scene_id)
        self.di.cell(r, 3).value, self.di.cell(r, 4).value, self.di.cell(r, 7).value = scene_ms, scene_en, setting
        for rr in range(2, self.ds.max_row + 1):
            if (self.ds.cell(rr, 1).value or "").startswith(f"ms-d-{scene_id}-"):
                self.ds.cell(rr, 3).value = f"{scene_ms} ({scene_en})"

    def mark_seen_twins(self):
        """A Dunia card that repeats a class word is marked 'seen in class' (Rules tab), when the class
        chapter is not later than the chapter the scene primes."""
        kelas = {}
        for cid, ch, term in self.kv.iter_rows(min_row=2, max_col=3, values_only=True):
            if cid:
                kelas.setdefault(norm(term), ch)
        marked = []
        for r in range(2, self.ds.max_row + 1):
            did, term, primes, seen = self.ds.cell(r, 1).value, self.ds.cell(r, 5).value, self.ds.cell(r, 4).value, self.ds.cell(r, 12).value
            if not did or seen or norm(term) not in self.touched:
                continue
            ch = kelas.get(norm(term))
            if ch and ch <= primes:
                self.ds.cell(r, 12).value = f"Ch{ch}"
                marked.append((did, ch))
        return marked


# ---- chapters ---------------------------------------------------------------------------------------------

def ch1(b):
    # New cards (ledger L-0983, L-0984).
    b.add_kelas(1, "L-0983", note="Saya pun baik. = I'm fine too. pun comes after the word it adds to.")
    b.add_kelas(1, "L-0984")
    # Moved cards: learners say "Saya Tanaka" and "Saya minta diri dulu" in chapter 1; the greeting words
    # sit with the greetings. Card IDs stay (progress is keyed by them); Ch4 and Ch2 keep a review.
    b.edit_kelas("ms-c02-001", chapter=1, note="Saya Tanaka. Saya minta diri dulu.")
    b.led("L-0036", place="Ch1 (moved from Ch2; reviewed in Ch2)")
    for cid, lid, w in (("ms-c04-008", "L-0162", "pagi"), ("ms-c04-009", "L-0163", "tengah hari"),
                        ("ms-c04-010", "L-0164", "petang"), ("ms-c04-011", "L-0165", "malam")):
        b.edit_kelas(cid, chapter=1, note=f"Part of Selamat {w}. Returns in Ch4 with the clock.")
        b.led(lid, place="Ch1 (moved from Ch4; reviewed in Ch4)")
    # Removed: faith-specific greeting (Sam, 11 Nov 2026; Rules tab).
    b.remove_kelas("ms-c01-009")
    b.led("L-0009", ids=[], place="Retired: card removed (not taught)")
    # New Dunia scene for chapter 1 (Sam, in session 12 Nov 2026): greetings at the office, built only from
    # Ch1 ledger words. Every card repeats a class card, so each carries the 'seen in class' chip.
    b.add_scene("pejabat-salam", "Pejabat (Office)", "Salam di pejabat", "Greetings at the office", 1,
                "Tanaka's first week: he greets the team in the morning, meets someone in the lift, and says goodbye in the evening.")
    for cid in ("ms-c01-002", "ms-c01-012", "ms-c01-014", "ms-c01-034", "ms-c01-035", "ms-c01-018",
                "ms-c01-016", "ms-c01-017", "ms-c01-004", "ms-c01-022", "ms-c01-026", "ms-c01-007"):
        _, v = b.vocab(cid)
        lid = next(k for k, r in b.ledger.items() if cid in [i.strip() for i in r["Kata-Kata (card IDs)"].split(",")])
        b.add_dunia("pejabat-salam", lid, seen="Ch1", term=v["Malay"], en=v["English"], ja=v["Japanese (draft)"],
                    pos=v["POS"], tag=v["Affix tag"])


CHAPTERS = {1: ch1}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--through", type=int, default=9)
    ap.add_argument("--map")
    ap.add_argument("--ledger", default=str(ROOT / "content" / "ledger" / "malay-ledger.csv"))
    a = ap.parse_args()
    b = Bank(a.src, a.ledger)
    for n in sorted(CHAPTERS):
        if n <= a.through:
            CHAPTERS[n](b)
    marked = b.mark_seen_twins()
    b.wb["README"]["A1"] = (
        "Kata-Kata: Malay Vocab Bank v5 (12 Nov 2026). v4 plus the clean-up after Cikgu Sensai Stage 1 "
        "(tools/make_vocab_bank_v5.py): new cards from ledger rows L-0983 to L-1088, moved and removed cards, "
        "corrected notes, frames and scenarios, and the general 'Rumah terbuka' scene. Built through chapter "
        f"{min(a.through, max(CHAPTERS))}. All new rows are Claude drafts: check before students see them."
    )
    b.wb.save(a.out)
    print(f"wrote {a.out}; 'seen in class' set on {len(marked)} Dunia cards: {marked}")
    if a.map:
        Path(a.map).write_text(json.dumps(b.map, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"wrote {a.map}: {len(b.map)} ledger rows")


if __name__ == "__main__":
    sys.exit(main())
