"""Build Vocab Bank v6 from v5: Stage 2 chapter packs, one function per chapter (c10 first).

Usage (from the repo root):
    python3 -I tools/make_vocab_bank_v6.py <v5.xlsx> <out-v6.xlsx> [--through N] [--map out.json]

Source of each chapter: Cikgu Sensai's docs/stage-2-plan.md (unit word tables, section 3 affix rules,
section 5 scenes) and docs/stage-2-decisions.md (Sam's answers, 13 Nov 2026). The Malay ledger is the
source of truth: every class card takes its ledger row's Malay, meanings (English and the draft Japanese),
part of speech and affix tag. The script always starts from the ledger snapshot in git LEDGER_BASELINE
(the sync of the sheet after Cikgu Sensai's Stage 2 ledger writes), so a re-run gives the same result.

It reuses the Bank helpers of tools/make_vocab_bank_v5.py. --through N builds chapters 10..N only (one
chapter per commit); --map writes, for every ledger row touched, the card IDs and place the sheet should
now show (used for the ledger write-back).

Then run:
    python3 -I tools/import_vocab_bank.py <out-v6.xlsx>
    python3 -I tools/import_hanashishou_bridge.py ../hanashishou   (Hanashishou at e5e167c, the commit the
                                                                    Jambatan packs come from)
so the Jambatan packs drop the words that became class cards.
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))  # -I leaves the script's folder off sys.path; the v5 helpers live there

import make_vocab_bank_v5 as v5  # noqa: E402

# "Ledger snapshot matches the sheet (L-0001 to L-1266, Stage 2 rows)": the sheet after Cikgu Sensai's
# Stage 2 build steps 1 and 2, before Kata-Kata wrote any chapter 10 card ID.
LEDGER_BASELINE = "acff0ca"
v5.LEDGER_BASELINE = LEDGER_BASELINE


def ch10(b):
    """Chapter 10: ber- verbs. Unit 10A (routines, work and movement) and 10B (background).

    Every chapter 10 ledger row gets a class card (40 core rows and the recognition row L-0667 «pindah»).
    Each ber- card shows its root: the ledger's "Root (KD4)" column, and where the root is a Kata-Kata card,
    the chapter it was taught in. Spelling notes (be- before r and in bekerja) are the plan's section 3
    and the charter (R7). No other etymology is added.
    """
    ber = "ber-"
    cards = [
        # --- unit 10A ---
        ("L-1089", "ber- + kerja (Ch2). Spelt be-: the first syllable of kerja ends in -er. Standard for «Saya kerja di …»: Saya bekerja di Kuala Lumpur.", {}),
        ("L-1090", "ber- + jalan (Ch7). Saya berjalan ke pejabat.", {}),
        ("L-1091", "ber- + cakap (Ch2). The standard form: Saya bercakap bahasa Melayu dengan jiran saya.", {}),
        ("L-1092", "ber- + main (Ch2). Saya bermain badminton.", {}),
        ("L-1093", "ber- + rehat. Spelt be- before r: berehat.", {}),
        ("L-1094", "ber- + senam.", {}),
        ("L-1095", "ber- + renang. Spelt be- before r: berenang.", {}),
        ("L-1096", "ber- + lari.", {}),
        ("L-1097", "ber- + basikal (Dunia, Ch7).", {}),
        ("L-1098", "ber- + jumpa (Ch1). Jumpa lagi! is everyday; the verb: Saya berjumpa dengan kawan saya.", {}),
        ("L-1099", "ber- + bual. Nanti kita berbual lagi.", {}),
        ("L-1100", "ber- + atur. Sila beratur.", {}),
        ("L-1101", "ber- + sarapan (Ch4). Everyday speech often just says sarapan.", {}),
        ("L-1102", "ber- + mula (Ch4). Mesyuarat bermula pukul sembilan.", {}),
        ("L-1103", "ber- + henti. Bas berhenti di sini. Careful: berhenti kerja = to quit a job.", {}),
        ("L-0807", "ber- + siap (Ch9). Saya bersiap untuk ke pejabat.", {"tag": ber}),
        ("L-0916", "ber- + sedia. Saya sudah bersedia.", {"tag": ber}),
        ("L-1104", "ber- + latih.", {}),
        ("L-1105", "Itu rutin saya setiap hari.", {}),
        ("L-1106", "ber- + tolak (push, Ch9): with ber- the meaning changes to 'set off'. Pukul berapa kita bertolak?", {}),
        # --- unit 10B ---
        ("L-1107", "ber- + umur (Ch3). Standard; everyday speech says «Umur saya …».", {}),
        ("L-1108", "ber- + kahwin. Saya sudah berkahwin.", {}),
        ("L-1109", "ber- + keluarga (Ch2).", {}),
        ("L-1110", "ber- + asal (Ch2). Asal saya dari Osaka. = Saya berasal dari Osaka.", {}),
        ("L-1111", "ber- + nama (Ch2). Written or formal; everyday speech says «Nama saya …».", {}),
        ("L-1112", "ber- + sekolah (Ch2). Anak saya masih bersekolah.", {}),
        ("L-1113", "ber- + kawan (Ch2).", {}),
        ("L-0779", "ber- + jiran (this chapter). Kami berjiran. = We are neighbours.", {"tag": ber}),
        ("L-1114", "ber- + pindah (this chapter). The standard form: Saya baru berpindah ke sini.", {}),
        ("L-1115", "ber- + cuti (Dunia, Ch2). Saya bercuti minggu depan.", {}),
        ("L-1116", "ber- + niaga.", {}),
        ("L-1117", "ber- + belanja. belanja on its own (to treat someone) comes in Ch17.", {}),
        ("L-1118", "ber- + kumpul.", {}),
        ("L-0781", "ber- + kenalan. You know it from Selamat berkenalan (Ch1).", {"tag": ber}),
        ("L-1119", "ber- + minat. Saya berminat untuk belajar bahasa Melayu.", {}),
        ("L-1120", "ber- + pakaian (root pakai, to wear: Dunia, Ch4). Mostly in berpakaian kemas (neatly dressed).", {}),
        ("L-0660", "Jiran saya baik. Also in berjiran.", {"drop": ["ms-j-home-condo-12"], "place": "Ch10 (unit 10B)"}),
        ("L-0714", "Sepupu saya tinggal di Osaka.", {"drop": ["ms-j-social-13"], "place": "Ch10 (unit 10B)"}),
        ("L-1121", "Learn it as a whole word: pe- … -an words come in Stage 3. Root in the ledger: alam.", {}),
        ("L-1122", "ber- + dua (Ch3): the two of us, as a pair. Kami tinggal berdua.", {}),
        # Recognition (plan: the spoken partner of berpindah, not a new core word).
        ("L-0667", "Spoken: the everyday word for berpindah. Saya baru pindah. Recognise only.",
         {"drop": ["ms-j-home-condo-19"], "place": "Ch10 (unit 10B, recognition: spoken partner of berpindah)"}),
    ]
    for lid, note, opt in cards:
        over = {k: v for k, v in opt.items() if k not in ("drop", "place")}
        b.add_kelas(10, lid, note=note, drop=opt.get("drop", ()), place=opt.get("place"), **over)

    # Frames: the plan's section 3 examples (bekerja di Kuala Lumpur; bercakap … dengan jiran saya) and Sam's
    # «Pukul berapa kita bertolak?» (W9). Only words placed in chapters 1 to 10 (checked by the affix guard).
    frames = [
        ("ms-c10-f01", "Setiap pagi saya ___ pukul ___.", "Setiap pagi saya bertolak pukul tujuh.", "Every morning I set off at seven."),
        ("ms-c10-f02", "Pukul berapa ___ bermula / kita bertolak?", "Pukul berapa kita bertolak?", "What time do we set off?"),
        ("ms-c10-f03", "Pada hujung minggu saya suka ___.", "Pada hujung minggu saya suka berenang dan berbasikal.",
         "At the weekend I like swimming and cycling."),
        ("ms-c10-f04", "Saya bercakap / berbual dengan ___.", "Saya bercakap bahasa Melayu dengan jiran saya.",
         "I speak Malay with my neighbour."),
        ("ms-c10-f05", "Saya berasal dari ___. Saya bekerja di ___.", "Saya berasal dari Osaka. Saya bekerja di Kuala Lumpur.",
         "I'm from Osaka. I work in Kuala Lumpur."),
        ("ms-c10-f06", "Saya sudah / belum ___.", "Saya sudah berkahwin.", "I'm married."),
    ]
    for fid, frame, example, meaning in frames:
        b.add_frame(10, fid, frame, example, meaning)

    # Scenario: the plan's two scenes. 10A: telling a colleague about the working day and the weekend.
    # 10B: meeting a neighbour and exchanging background details (fictional persona). Same evening, same week.
    title = "A working day and a new neighbour"
    lines = [
        ("Puan Aini", "Selamat pagi, Encik Tanaka! Biasanya pukul berapa encik bertolak ke pejabat?",
         "Good morning, Mr Tanaka! What time do you usually set off for the office?"),
        ("Tanaka", "Saya bertolak pukul tujuh. Saya naik bas. Bas itu berhenti di depan pejabat.",
         "I set off at seven. I take the bus. It stops in front of the office."),
        ("Puan Aini", "Encik bersarapan di rumah?", "Do you have breakfast at home?"),
        ("Tanaka", "Tidak. Saya bersarapan di kedai mamak dekat pejabat.", "No. I have breakfast at the mamak near the office."),
        ("Puan Aini", "Pada hujung minggu pula, encik buat apa?", "And at the weekend, what do you do?"),
        ("Tanaka", "Pada hari Sabtu saya berenang. Pada hari Ahad saya berbasikal dengan kawan.",
         "On Saturday I swim. On Sunday I go cycling with a friend."),
        ("Puan Aini", "Wah, encik selalu bersenam! Saya pula suka berehat di rumah.",
         "Wow, you exercise a lot! Me, I like to rest at home."),
        ("Tanaka", "Itu pun bagus!", "That's good too!"),
        ("Puan Aini", "Oh, sudah pukul sembilan. Mesyuarat kita bermula sekarang!", "Oh, it's nine already. Our meeting starts now!"),
        ("Puan Siti", "Selamat petang. Encik jiran baru, ya?", "Good evening. You're the new neighbour, aren't you?"),
        ("Tanaka", "Ya, saya baru berpindah minggu lepas. Nama saya Tanaka. Saya berasal dari Osaka.",
         "Yes, I moved in last week. My name is Tanaka. I'm from Osaka."),
        ("Puan Siti", "Selamat berkenalan! Saya Siti. Encik bekerja di mana?", "Nice to meet you! I'm Siti. Where do you work?"),
        ("Tanaka", "Saya bekerja di sebuah syarikat Jepun di Kuala Lumpur. Puan pula?",
         "I work at a Japanese company in Kuala Lumpur. And you?"),
        ("Puan Siti", "Saya berniaga. Saya ada kedai kek dekat stesen.", "I run a business. I have a cake shop near the station."),
        ("Tanaka", "Puan sudah lama tinggal di sini?", "Have you lived here long?"),
        ("Puan Siti", "Sudah sepuluh tahun. Saya sudah berkahwin. Dua orang anak saya masih bersekolah.",
         "Ten years now. I'm married. My two children are still at school."),
        ("Tanaka", "Saya pula tinggal berdua dengan isteri saya.", "And I live with my wife, just the two of us."),
        ("Puan Siti", "Pada hari Ahad, kami berkumpul di rumah saya. Encik datang, ya!",
         "On Sunday we're getting together at my place. Do come!"),
        ("Tanaka", "Baik, terima kasih! Nanti kita berbual lagi.", "Sure, thank you! Let's chat again later."),
    ]
    for i, (speaker, ms, en) in enumerate(lines, 1):
        b.ks.append([f"ms-c10-s{i:02d}", 10, title, speaker, ms, en])


CHAPTERS = {10: ch10}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--through", type=int, default=max(CHAPTERS))
    ap.add_argument("--map")
    a = ap.parse_args()
    b = v5.Bank(a.src, None)
    for n in sorted(CHAPTERS):
        if n <= a.through:
            CHAPTERS[n](b)
    marked = b.mark_seen_twins()
    built = min(a.through, max(CHAPTERS))
    b.wb["README"]["A1"] = (
        "Kata-Kata: Malay Vocab Bank v6 (13 Nov 2026). v5 plus the Stage 2 chapter packs "
        "(tools/make_vocab_bank_v6.py), from the Malay ledger and Cikgu Sensai's Stage 2 plan. "
        f"Built through chapter {built}. All new rows are Claude drafts (the Japanese is for native review)."
    )
    b.wb.save(a.out)
    print(f"wrote {a.out}; 'seen in class' set on {len(marked)} Dunia cards: {marked}")
    if a.map:
        Path(a.map).write_text(json.dumps(b.map, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"wrote {a.map}: {len(b.map)} ledger rows")


if __name__ == "__main__":
    sys.exit(main())
