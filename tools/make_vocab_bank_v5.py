"""One-off: build Vocab Bank v5 from v4 by applying the Kata-Kata clean-up after Cikgu Sensai Stage 1.

Usage (from the repo root):
    python3 -I tools/make_vocab_bank_v5.py <v4.xlsx> <out-v5.xlsx> [--through N] [--map out.json]

Source of the list: docs/kata-kata-cleanup.md in the Cikgu Sensai repository (12 Nov 2026), plus the five
rows Sam approved afterwards (L-1084 to L-1088) and Sam's in-session answers to the brief's proposals
(12 Nov 2026). The Malay ledger (content/ledger/malay-ledger.csv, a snapshot of the Google Sheet) is the
source of truth (the script starts from the baseline snapshot in git, see LEDGER_BASELINE): every new card takes its ledger row's Malay, meanings, part of speech, affix tag and
chapter. The script only adds notes (usage notes from the ledger or Sam's decisions, never new
etymology), moves, removals and the frame/scenario corrections.

--through N applies chapters 1..N only (the repo's commits are one chapter each); --map writes, for every
ledger row touched, the card IDs and place the sheet should now show.

Run tools/import_vocab_bank.py on the result, then tools/import_hanashishou_bridge.py (against the same
Hanashishou commit as before) so Jambatan drops words that are now class cards.
"""

import argparse
import csv
import io
import json
import re
import subprocess
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent

# The ledger snapshot before this clean-up touched its Kata-Kata columns (commit "Ledger snapshot matches the
# sheet (L-0001 to L-1088)"). The script always starts from it, so a re-run gives the same result.
LEDGER_BASELINE = "aa87ffb"

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
        text = (open(ledger_csv, encoding="utf-8", newline="").read() if ledger_csv else
                subprocess.run(["git", "-C", str(ROOT), "show", f"{LEDGER_BASELINE}:content/ledger/malay-ledger.csv"],
                               capture_output=True, text=True, check=True).stdout)
        self.ledger = {r["ID"]: r for r in csv.DictReader(io.StringIO(text, newline=""))}
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
    def led(self, lid, ids=None, place=None, drop=(), add=(), add_place=None, front=False):
        """Record what the sheet's 'Kata-Kata (card IDs)' and 'Kata-Kata place' should say for a ledger row."""
        row = self.ledger[lid]
        cur = self.map.get(lid) or {
            "ids": [i.strip() for i in row["Kata-Kata (card IDs)"].split(",") if i.strip()],
            "place": row["Kata-Kata place"],
        }
        if ids is not None:
            cur["ids"] = list(ids)
        else:
            kept = [i for i in cur["ids"] if i not in drop]
            new = [i for i in add if i not in kept]
            cur["ids"] = new + kept if front else kept + new
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
        # The class card goes first when the place text starts with the chapter, like the other rows.
        self.led(lid, drop=drop, add=[cid], place=place, front=True)
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

    def replace_everywhere(self, old, new):
        """Text replacement in every string cell of the five content tabs (e.g. a Japanese rendering Sam chose)."""
        n = 0
        for ws in (self.kv, self.kf, self.ks, self.ds, self.di):
            for row in ws.iter_rows():
                for c in row:
                    if isinstance(c.value, str) and old in c.value:
                        c.value = c.value.replace(old, new)
                        n += 1
        return n

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


def ch2(b):
    # New cards from ledger rows: cakap, bolehkah, badminton, ini, itu, kelas, adakah, the language words and
    # the hobby word bank (Sam, 11 Nov). Notes come from the ledger rows and Sam's decisions.
    n = {
        "L-0473": "Saya boleh cakap bahasa Melayu sedikit.",
        "L-0783": "boleh + -kah (both taught in this chapter): the polite form of boleh.",
        "L-0968": None,
        "L-0985": None,
        "L-0986": None,
        "L-0987": None,
        "L-0988": "ada + -kah (both taught in this chapter). Adakah ...? opens a yes/no question.",
        "L-1016": "bahasa Melayu, bahasa Inggeris, bahasa Jepun.",
        "L-1017": "Also in baju Melayu (the open-house scene).",
        "L-1018": "Malaysian spelling: Inggeris.",
        "L-1019": "Malaysian spelling: muzik.",
        "L-1020": "Malaysian spelling: filem.",
        "L-1021": None,
        "L-1022": None,
        "L-1023": "suka masak = like cooking. masakan (food, cooking) is already in this chapter.",
        "L-1024": None,
        "L-1025": None,
        "L-1026": "Also spelt cafe in signs and speech: both are used.",
        "L-1027": "Spoken (an English loan), not a standard word.",
        "L-1028": "Saya suka jalan-jalan. Covers 'travelling for fun' for now.",
        "L-1029": "Spoken (an English loan). The standard word comes later (Ch11).",
        "L-1030": "Spoken (an English loan). The standard phrase comes later (Ch11).",
        "L-1031": "From the Japanese 推し活, used among fans. It is not in Kamus Dewan.",
    }
    for lid, note in n.items():
        b.add_kelas(2, lid, note=note)
    # Moved: sedikit / sikit (Ch5 to Ch2) so learners can say "Saya boleh cakap bahasa Melayu sedikit."
    b.edit_kelas("ms-c05-008", chapter=2, note="Saya boleh cakap bahasa Melayu sedikit. sikit is the spoken form (sikit je, just a little).")
    b.led("L-0216", place="Ch2 (moved from Ch5; reviewed in Ch5)")
    # Scenario: «dari mana» is a Ch7 question word. Ask about the hometown with Ch2 language instead; the
    # answer uses frame ms-c02-f03 «Asal saya dari ___.».
    b.edit_line("ms-c02-s03", ms="Kampung encik di mana?", en="Where is your hometown?")


def ch3(b):
    # 17 new cards: the number words the chapter's examples already need, a few everyday words and three fruits.
    notes = {
        "L-0989": None, "L-0990": None, "L-0991": None, "L-0992": None, "L-0993": None, "L-0994": None,
        "L-0995": None, "L-0996": None, "L-0997": None, "L-0998": None, "L-0999": None,
        "L-1000": "sahaja is the standard form; saja is the spoken form.",
        "L-1001": "Pairs with sebelum. Returns in Ch4 with the clock.",
        "L-1002": "Pairs with selepas.",
        "L-1003": None, "L-1004": None, "L-1005": None,
    }
    for lid, note in notes.items():
        b.add_kelas(3, lid, note=note)


def ch4(b):
    # 19 new cards. sarapan and hujung minggu had only Jambatan cards; the Jambatan twins drop out when the
    # bridge importer is re-run (class words are not repeated there), so the ledger rows lose those IDs.
    b.add_kelas(4, "L-0614", note="Sarapan pukul tujuh.", drop=["ms-j-daily-life-25"], place="Ch4")
    b.add_kelas(4, "L-0702", drop=["ms-j-social-01"], place="Ch4")
    b.add_kelas(4, "L-1006")
    b.add_kelas(4, "L-1007")
    b.add_kelas(4, "L-1032", note="Apa tarikh hari ini? asks the full date. Hari ini hari bulan berapa? asks the day of the month "
                                  "(answer: hari bulan sebelas).")
    spelling = {"L-1035": "Mac", "L-1038": "Jun", "L-1039": "Julai", "L-1040": "Ogos", "L-1044": "Disember"}
    for n in range(1033, 1045):
        lid = f"L-{n}"
        b.add_kelas(4, lid, note=f"Malaysian spelling: {spelling[lid]}." if lid in spelling else None)
    b.add_kelas(4, "L-1046", note="Tunggu sekejap. = Wait a moment.")
    b.add_kelas(4, "L-1047", note="Everyday word for 'late'; lambat also means slow.")
    # Frames that used words from later chapters (kopi Ch5, ke Ch7, durian not in the ledger). Frame IDs stay.
    b.edit_frame("ms-c04-f02", example="Saya bangun setiap pagi.", meaning="I get up every morning.")
    b.edit_frame("ms-c04-f04", example="Saya akan balik bulan depan.", meaning="I'll go home next month.")
    b.edit_frame("ms-c04-f06", example="Saya belum pernah makan mangga.", meaning="I've never eaten a mango.")
    # Scenario: kedai mamak (Ch5/7), nasi kandar (not in the ledger) and "di sana" (Ch7) are replaced by Ch1-4 words.
    b.edit_line("ms-c04-s06", ms="Saya biasanya makan di pejabat. Encik pula?", en="I usually eat at the office. And you?")
    b.edit_line("ms-c04-s07", ms="Saya kadang-kadang makan dengan kawan. Setiap Jumaat saya makan dengan isteri saya.",
                en="Sometimes I eat with friends. Every Friday I eat with my wife.")
    b.edit_line("ms-c04-s08", ms="Hari ini boleh saya makan dengan encik?", en="May I eat with you today?")
    b.edit_line("ms-c04-s09", ms="Boleh! Jom, hari ini kita makan sama-sama!", en="Of course! Come on, let's eat together today!")


def ch5(b):
    b.add_kelas(5, "L-0688", note="The answer to kenapa: Kenapa? Sebab ...", drop=["ms-j-office-12"], place="Ch5")
    b.add_kelas(5, "L-1008")
    b.add_kelas(5, "L-1009", note="Answer with sebab or kerana (Sam).")
    b.add_kelas(5, "L-1048", note="roti canai dengan kuah.")
    b.add_kelas(5, "L-1049", note="Same as kenapa. A fixed word, not a verb with me-.")
    b.add_kelas(5, "L-1050", note="Answers kenapa / mengapa, like sebab.")
    # New frame (Sam said yes in session): the "why" set in one place.
    b.add_frame(5, "ms-c05-f06", "Kenapa / Mengapa / Apa sebab ___? Sebab / Kerana ___.", "Kenapa awak marah? Sebab saya penat.",
                "Why are you angry? Because I'm tired.")
    # Frames and scenario that used nasi lemak (Ch8) and baju (Ch8), and sambalnya (not in the ledger).
    b.edit_frame("ms-c05-f02", example="Bagaimana rasa roti canai ini? Sedap, tetapi pedas.", meaning="How is this roti canai? Delicious, but spicy.")
    b.edit_frame("ms-c05-f03", example="Saya mahu kopi yang panas.", meaning="I want the hot coffee.")
    b.edit_line("ms-c05-s06", ms="Roti canai satu. Kuahnya pedas?", en="One roti canai. Is the gravy spicy?")
    # Cards: oren / jingga (Sam: both correct), tawar (ledger L-0520 has both senses).
    b.edit_kelas("ms-c05-020", note="jingga is the standard word; oren is the everyday one. Both are correct.")
    b.edit_kelas("ms-c05-015", en="to bargain; bland", ja="値切る；味がない", note="Also 'unsweetened' (of a drink).")
    # Dunia "Di klinik": hospital, not rumah sakit (L-0416 Retired; L-0336 hospital is the Malaysian word).
    b.edit_dunia("ms-d-badan-klinik-11", term="hospital", en="hospital", ja="病院", hook_type=None, hook=None)
    b.led("L-0416", ids=[], place="Retired: use L-0336 hospital")
    b.led("L-0336", ids=["ms-d-badan-klinik-11", "ms-c07-042"], place="Dunia · Di klinik (primes Ch5); Ch7")
    # Dunia "Lepak di kedai mamak": Sam's rendering ママック everywhere; the mamak note Sam approved for Cikgu
    # Sensai unit 5; tapau is everyday speech (Sam, 12 Nov).
    b.replace_everywhere("ママッ", "ママック")
    b.edit_dunia("ms-d-lepak-mamak-01", note="A mamak stall is a casual eatery, traditionally run by Indian-Muslim families and often open late, "
                 "so it is also where people lepak and sembang after work. Use the word for the stall, not for a person.")
    b.edit_dunia("ms-d-lepak-mamak-07", note="Spoken: an everyday word.")


CHAPTERS = {1: ch1, 2: ch2, 3: ch3, 4: ch4, 5: ch5}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--through", type=int, default=9)
    ap.add_argument("--map")
    ap.add_argument("--ledger", help=f"ledger CSV to start from (default: the baseline snapshot, git {LEDGER_BASELINE})")
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
