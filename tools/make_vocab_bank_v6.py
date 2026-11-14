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
    python3 -I tools/import_hanashishou_bridge.py ../hanashishou   (Hanashishou at 4be57ac, the commit the
                                                                    Jambatan packs come from)
so the Jambatan packs follow the ledger (step 6b: a card for every word the scenes meet first).
"""

import argparse
import csv
import io
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))  # -I leaves the script's folder off sys.path; the v5 helpers live there

import make_vocab_bank_v5 as v5  # noqa: E402

# Step 3e (Sam, 14 Nov 2026): the sheet after Journal rows 191 and 192 (L-0530 «tandatangan», 37 new rows L-1273 to L-1309).
# Before it: "Ledger snapshot after Sam's five new rows L-1268 to L-1272 (Journal row 184)": c3e4a5a plus those rows (mendaftar,
# tangguhkan, batalkan, memakai, berwarna). Before it: "Ledger snapshot after Sam's Affix-tag fixes and new row L-1267 (Journal rows 177, 178)": the sheet after the
# chapter 17 write-back plus Sam's 16 Affix tags (13 blank rows, three root ter- rows) and the new row L-1267
# «tidak boleh tahan». It replaced 323b5fc (the same rows without those changes; 323b5fc replaced acff0ca, which
# lacked Claude's four ber- tags, Journal row 152).
LEDGER_BASELINE = "00164ef"
v5.LEDGER_BASELINE = LEDGER_BASELINE


import re  # noqa: E402


def kc(b, ch, lid, note, **opt):
    """A class card for ledger row `lid`. If the row also lists Jambatan cards, the class card replaces them: they are
    dropped and the place loses its "Jambatan · …" part (as for jiran, pindah and sepupu in chapter 10)."""
    row = b.ledger[lid]
    drop = [i.strip() for i in row["Kata-Kata (card IDs)"].split(",") if i.strip().startswith("ms-j-")]
    place = re.sub(r";\s*Jambatan · [^;]+", "", row["Kata-Kata place"]) if drop else None
    b.add_kelas(ch, lid, note=note, drop=drop, place=place, **opt)


# Step 3e (Sam, 14 Nov 2026; ledger L-1273 to L-1303): 31 new class cards, each appended at the end of the pack its place names
# so no earlier card ID moves. Notes show the root and its chapter; every example passes tools/stage-check.mjs at its chapter.
STEP3E = {
    10: [
        ("L-1273", "Learn it as a phrase. renang is the root of berenang (this chapter). Saya berenang di kolam renang pada hari Sabtu."),
        ("L-1274", "A park, where people run or cycle. Saya berlari di taman."),
        ("L-1275", "se- + minggu (Ch4): one week, or «per week». tiga kali seminggu = three times a week. Saya berenang dua kali seminggu."),
        ("L-1276", "Full: a full bus, a full train. Bas itu penuh pada waktu pagi."),
    ],
    11: [
        ("L-1277", "kepada is for a person, ke (Ch7) is for a place. Saya menghantar emel kepada pengurus. Saya pergi ke pejabat."),
        ("L-1278", "se- + hari (Ch4): a day, or «per day». Kereta itu RM100 sehari. sehari = per day; setiap hari (Ch4) = every day."),
        ("L-1279", "meN- + tempah (Ch4): to book. The t drops: menempah. The standard form of tempah: Saya menempah kereta untuk hujung minggu."),
        ("L-1280", "A hill. Kami mendaki bukit pada hari Ahad."),
    ],
    12: [
        ("L-1281", "meN- + lapor + -kan: to report something to someone. Saya melaporkan kebocoran itu kepada pengurus."),
        ("L-1282", "A copy. Learn it as a whole word: -an words like this one come in Stage 3. Root in the ledger: salin. Sila simpan salinan borang itu."),
        ("L-1283", "di- + hubung + -i: the di- partner of menghubungi (above). Encik akan dihubungi pada hari Isnin."),
        ("L-1284", "di- + baiki: the di- partner of membaiki (above). Lif itu sedang dibaiki."),
    ],
    13: [
        ("L-1285", "Healthy, well. Saya sihat. Saya tidak sihat hari ini. sihat is the root of kesihatan (above)."),
        ("L-1286", "To tell, to let someone know. Written joined, as one word: beritahu. Sila beritahu doktor."),
        ("L-1287", "A pharmacist: the person who works at a farmasi (above). Learn it as a phrase. Tanya ahli farmasi."),
        ("L-1288", "tinggal (Ch2) + -kan: to leave something behind, or with someone. Saya tinggalkan beg di kaunter. tinggal on its own is to live or to stay."),
    ],
    14: [
        ("L-1289", "A word in its own right, written joined: all right then, OK (to agree or to start). Baiklah, kita buat begini. Root: baik (Ch1)."),
        ("L-1290", "Like this, this way: Kita buat begini. The standard partner of the spoken «macam ni» (Ch17)."),
        ("L-1291", "To come along, to follow. Puan Aini mahu ikut?"),
        ("L-1292", "To say: Encik Rahman kata mesyuarat bermula pukul sembilan. Also a noun: a word."),
        ("L-1293", "A notice, an announcement. Learn it as a whole word: pe- … -an words come in Stage 3. Root in the ledger: umum. Baca pengumuman itu."),
        ("L-1294", "meN- + tangguh + -kan (tangguh is above): the standard form with a doer. Cik Mei Ling menangguhkan mesyuarat itu. The t drops: menangguhkan. The bare tangguhkan is what a request or an offer uses: Kita tangguhkan ke hari Ahad."),
        ("L-1295", "meN- + batal + -kan (batal is above): the standard form with a doer. Puan Aini membatalkan mesyuarat itu. The bare batalkan is what a request or an offer uses: Kita batalkan rancangan itu."),
    ],
    15: [
        ("L-1296", "Staff, an employee. Written joined, as one word: kakitangan. Kakitangan stesen ada di kaunter."),
        ("L-1297", "A ball. Bulat, seperti bola. Bola itu bulat."),
    ],
    16: [
        ("L-1298", "The everyday answer after an accident: Encik tidak apa-apa? Saya tidak apa-apa, terima kasih. = I'm fine, it's nothing."),
        ("L-1299", "A problem. Ada masalah?"),
        ("L-1300", "ber- + laku: to happen. Apa yang berlaku?"),
        ("L-1301", "The everyday root of meminjam (Ch11): Boleh saya pinjam telefon encik? pinjamkan = to lend."),
    ],
    17: [
        ("L-1302", "To reply. Sila balas sebelum hari Rabu."),
    ],
}


def step3e(b, ch):
    for lid, note in STEP3E[ch]:
        kc(b, ch, lid, note)
    if ch == 17:
        # Step 3f (Sam, 14 Nov 2026): L-1303 «minggu depan» is Retired (chapter 4 teaches it through the depan card ms-c04-019).
        # Its card ms-c17-026 was the last card in c17, so no other ID moves; the ledger cells are cleared at the write-back.
        b.led("L-1303", ids=[], place="")


def ch10(b):
    """Chapter 10: ber- verbs. Unit 10A (routines, work and movement) and 10B (background).

    Every chapter 10 ledger row gets a class card (40 core rows and the recognition row L-0667 «pindah»).
    Each ber- card shows its root: the ledger's "Root (KD4)" column, and where the root is a Kata-Kata card,
    the chapter it was taught in. Spelling notes (be- before r and in bekerja) are the plan's section 3
    and the charter (R7). No other etymology is added.
    """
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
        ("L-0807", "ber- + siap (Ch9). Saya bersiap untuk ke pejabat.", {}),
        ("L-0916", "ber- + sedia. Saya sudah bersedia.", {}),
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
        ("L-0779", "ber- + jiran (this chapter). Kami berjiran. = We are neighbours.", {}),
        ("L-1114", "ber- + pindah (this chapter). The standard form: Saya baru berpindah ke sini.", {}),
        ("L-1115", "ber- + cuti (Dunia, Ch2). Saya bercuti minggu depan.", {}),
        ("L-1116", "ber- + niaga.", {}),
        ("L-1117", "ber- + belanja. belanja on its own (to treat someone) comes in Ch17.", {}),
        ("L-1118", "ber- + kumpul.", {}),
        ("L-0781", "ber- + kenalan. You know it from Selamat berkenalan (Ch1).", {}),
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
    step3e(b, 10)

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


def ch11(b):
    """Chapter 11: meN- active verbs and the nasal spelling changes. Unit 11A (familiar transitive pairs)
    and 11B (office actions and the deferred hobby verbs).

    43 ledger rows: 20 in 11A, 21 in 11B and the recognition rows L-0604 «tukar» and L-0678 «deadline».
    The ledger's Affix tag is blank for L-0865, L-0792, L-0819 (cards say meN-) and L-0849 (card says chunk).
    Every meN- card shows its root (the ledger's "Root (KD4)" column) and the chapter where Kata-Kata teaches it,
    its nasal spelling (the plan's section 3 and the 11A/11B tables) and, where Chapter 9 teaches the di- form,
    the passive partner. No di- passive is shown for verbs that take no object or have no Chapter 9 form.
    """
    cards = [
        # --- unit 11A ---
        ("L-1123", "meN- + beli (Ch3). mem- before b. Passive: dibeli (Ch9).", {}),
        ("L-1124", "meN- + baca (Dunia, Ch4). mem- before b. Aini membaca buku itu. = Buku itu dibaca oleh Aini (dibaca, Ch9).", {}),
        ("L-1125", "meN- + tulis (Dunia, Ch4). The t of tulis drops: menulis. Passive: ditulis (Ch9).", {}),
        ("L-1126", "meN- + masak (Ch2). me- before m: the root keeps its m. Passive: dimasak (Ch9).", {}),
        ("L-1127", "meN- + ambil (Dunia, Ch4). meng- before a vowel. Passive: diambil (Ch9).", {}),
        ("L-1128", "meN- + buat (Ch9). mem- before b. Passive: dibuat (Ch9).", {}),
        ("L-1129", "meN- + buka (Dunia, Ch4). mem- before b. Passive: dibuka (Ch9).", {}),
        ("L-1130", "meN- + tutup (Dunia, Ch4). The t of tutup drops: menutup. Passive: ditutup (Ch9).", {}),
        ("L-1131", "meN- + bawa (Dunia, Ch4). mem- before b. Passive: dibawa (Ch9).", {}),
        ("L-1132", "meN- + bayar (Ch3). mem- before b. Passive: dibayar (Ch9).", {}),
        ("L-1133", "meN- + cari (Dunia, Ch7). men- before c.", {}),
        ("L-1134", "meN- + cuci (Ch9). men- before c. Passive: dicuci (Ch9).", {}),
        ("L-1135", "meN- + panggil (Ch9). The p of panggil drops: memanggil. Passive: dipanggil (Ch9).", {}),
        ("L-1136", "meN- + hantar (Dunia, Ch2). meng- before h. Passive: dihantar (Ch9). Siapa yang menghantar fail itu?", {}),
        ("L-1137", "Learn it as a whole word: «terima» alone has no class card (only terima kasih, Ch1). The t drops: menerima.", {}),
        ("L-1138", "meN- + jawab (Dunia, Ch2). men- before j.", {}),
        ("L-1139", "Learn it as a whole word: «lihat» alone has no class card. Everyday speech says «tengok» (Dunia, Ch7).", {}),
        ("L-1140", "meN- + dengar (Dunia, Ch4). men- before d.", {}),
        ("L-1141", "meN- + tunggu (Ch4). The t of tunggu drops: menunggu.", {}),
        ("L-1142", "meN- + jual (Ch3). men- before j. Passive: dijual (Ch9).", {}),
        # --- unit 11B ---
        ("L-1143", "meN- + sewa (Ch6). The s of sewa drops and meny- is used: menyewa. Passive: disewa (Ch9).", {}),
        ("L-1144", "meN- + lancong. me- before l. It takes no object, so it has no di- passive.", {}),
        ("L-0865", "meN- + daki. men- before d. A hobby word: Hujung minggu ini saya mahu mendaki dengan kawan saya.", {}),
        ("L-0792", "meN- + simpan (Dunia, Ch2). The s of simpan drops: menyimpan. The standard form of «simpan».", {}),
        ("L-0819", "meN- + semak (this chapter). The s of semak drops: menyemak.", {}),
        ("L-1145", "meN- + tukar (this chapter). The t of tukar drops: menukar. The standard form; everyday speech says «tukar» (below).", {}),
        ("L-1146", "meN- + kira (Dunia, Ch5). The k of kira drops and meng- is used: mengira.", {}),
        ("L-1147", "meN- + isi (Dunia, Ch3). meng- before a vowel.", {}),
        ("L-1148", "meN- + pilih (Ch6). The p of pilih drops: memilih.", {}),
        ("L-1149", "meN- + pinjam. The p drops: meminjam. To borrow for a while; menyewa is to rent.", {}),
        ("L-1150", "meN- + pesan. The p drops: memesan.", {}),
        ("L-1151", "meN- + tolong (Ch8). The t drops: menolong. «Tolong …» (Ch8) is the everyday request.", {}),
        ("L-1152", "meN- + ajar. meng- before a vowel. Isteri saya mengajar saya memasak.", {}),
        ("L-0680", "Tolong semak draf ini.", {"drop": ["ms-j-office-04"], "place": "Ch11 (unit 11B)"}),
        ("L-0696", "A slide in a presentation.", {"drop": ["ms-j-office-20"], "place": "Ch11 (unit 11B)"}),
        ("L-0849", "Formal and written. Everyday speech says «deadline» (below). Tarikh akhir draf itu hari Jumaat.", {}),
        ("L-0684", "Learn it as a whole word.", {"drop": ["ms-j-office-08"], "place": "Ch11 (unit 11B)"}),
        ("L-1153", "The root of menyemak, used as a request: Tolong semak draf ini.", {}),
        ("L-1154", "Nanti saya menghantar mesej.", {}),
        ("L-1155", "meN- + telefon (Dunia, Ch7). The t of telefon drops: menelefon. Saya akan menelefon mereka.", {}),
        ("L-1156", "meN- + cas (Dunia, Ch7). menge- before a one-syllable root: cas → mengecas. Saya mahu mengecas telefon saya.", {}),
        # Recognition (plan: the spoken partners of menukar and tarikh akhir, not new core words).
        ("L-0604", "Spoken: the everyday word for menukar. Saya mahu tukar bilik. Recognise only.",
         {"drop": ["ms-j-daily-life-15"], "place": "Ch11 (unit 11B, recognition: spoken partner of menukar)"}),
        ("L-0678", "Spoken: the everyday word for tarikh akhir. Deadline hari Jumaat. Recognise only.",
         {"drop": ["ms-j-office-02"], "place": "Ch11 (unit 11B, recognition: spoken partner of tarikh akhir)"}),
    ]
    for lid, note, opt in cards:
        over = {k: v for k, v in opt.items() if k not in ("drop", "place")}
        b.add_kelas(11, lid, note=note, drop=opt.get("drop", ()), place=opt.get("place"), **over)
    step3e(b, 11)

    # Frames: the plan's section 3 pair (Aini membaca buku itu. / Buku itu dibaca oleh Aini.), the 11A and 11B
    # block goals (who did it, ask what a colleague is doing, check a draft) and the hobby extension.
    frames = [
        ("ms-c11-f01", "Aini ___ buku itu.", "Aini membaca buku itu.", "Aini reads the book."),
        ("ms-c11-f02", "Buku itu ___ oleh Aini.", "Buku itu dibaca oleh Aini.", "The book is read by Aini."),
        ("ms-c11-f03", "Siapa yang ___ fail itu?", "Siapa yang menghantar fail itu?", "Who sent the file?"),
        ("ms-c11-f04", "Tolong semak ___ ini.", "Tolong semak draf ini.", "Please check this draft."),
        ("ms-c11-f05", "Awak sedang ___ apa?", "Awak sedang menulis apa?", "What are you writing?"),
        ("ms-c11-f06", "Hujung minggu ini saya mahu ___.", "Hujung minggu ini saya mahu memasak.",
         "This weekend I want to cook."),
    ]
    for fid, frame, example, meaning in frames:
        b.add_frame(11, fid, frame, example, meaning)

    # Scenario: the plan's two scenes. 11A: who read a document and who sent it on. 11B: checking a draft, the
    # deadline, then plans for the weekend (the deferred hobby verbs).
    title = "Who did what in the office"
    lines = [
        ("Tanaka", "Puan Aini, emel dari Jepun itu sudah dibaca?", "Puan Aini, has that email from Japan been read yet?"),
        ("Puan Aini", "Sudah. Saya membaca emel itu pagi tadi, kemudian saya menghantar fail itu.",
         "Yes. I read the email this morning, then I sent the file."),
        ("Tanaka", "Oh, Encik Rahman yang menerima fail itu?", "Oh, Encik Rahman is the one who received the file?"),
        ("Puan Aini", "Ya. Sekarang dia sedang membuka fail itu.", "Yes. He's opening the file now."),
        ("Encik Rahman", "Selamat pagi, Encik Tanaka. Saya sudah membuka fail itu. Sekarang saya sedang menulis jawapan.",
         "Good morning, Mr Tanaka. I've opened the file. Now I'm writing the reply."),
        ("Tanaka", "Baik. Siapa yang akan menelefon pejabat di Jepun?", "Good. Who will phone the office in Japan?"),
        ("Encik Rahman", "Saya akan menelefon mereka petang ini.", "I'll phone them this afternoon."),
        ("Puan Aini", "Baik, encik. Saya menunggu jawapan itu.", "Fine. I'll wait for that answer."),
        ("Tanaka", "Cik Mei Ling, draf slaid itu sudah siap?", "Mei Ling, is the slide draft ready?"),
        ("Cik Mei Ling", "Belum. Saya masih menyemak draf itu. Tarikh akhir hari Jumaat, ya?",
         "Not yet. I'm still checking the draft. The deadline is Friday, right?"),
        ("Tanaka", "Ya, hari Jumaat. Saya mengira jumlah itu semalam, tetapi tolong semak sekali lagi.",
         "Yes, Friday. I worked out the total yesterday, but please check it once more."),
        ("Cik Mei Ling", "Baik. Draf itu akan siap petang ini. Nanti saya menghantar mesej.",
         "Fine. The draft will be ready this afternoon. I'll send a message later."),
        ("Tanaka", "Terima kasih. Hujung minggu ini cik buat apa?", "Thank you. What are you doing this weekend?"),
        ("Cik Mei Ling", "Saya mahu mendaki dengan kawan saya. Encik pula?", "I'm going hiking with a friend. And you?"),
        ("Tanaka", "Saya mahu memasak. Isteri saya mengajar saya memasak nasi lemak.",
         "I want to cook. My wife is teaching me to cook nasi lemak."),
        ("Cik Mei Ling", "Wah, bagus! Boleh saya mengecas telefon saya di sini? Bateri sudah habis.",
         "Wow, great! Can I charge my phone here? The battery's dead."),
        ("Tanaka", "Boleh. Letak telefon itu di atas meja.", "Sure. Put the phone on the table."),
        ("Cik Mei Ling", "Terima kasih! Mari kita minum kopi. Saya yang membayar.", "Thanks! Let's have coffee. I'm paying."),
    ]
    for i, (speaker, ms, en) in enumerate(lines, 1):
        b.ks.append([f"ms-c11-s{i:02d}", 11, title, speaker, ms, en])


def ch12(b):
    """Chapter 12: -kan and -i (requests, actions for another person, repair and contact). Unit 12A (parcels at a
    condo guardhouse: selected -kan requests) and 12B (-i, a few -kan families, a leak and a technician).

    45 ledger rows: 23 in 12A, 21 in 12B and the recognition row L-0608 «nombor tracking». Each -kan or -i card shows
    its root and the chapter where Kata-Kata teaches it. Whole words with Stage 3 affixes (pengawal, pemilik, penerima,
    kebocoran, kerosakan) are marked as whole words, as the plan says. The ledger's Affix tag is blank for L-0743,
    L-0789 and L-0871 (cards say -kan, meN- -i and -kan).
    """
    whole = "Learn it as a whole word: pe- … words come in Stage 3."
    cards = [
        # --- unit 12A ---
        ("L-1157", "hantar (Dunia, Ch2) + -kan: send or deliver something for someone. Tolong hantarkan bungkusan itu ke unit 8-1.", {}),
        ("L-1158", "simpan (Dunia, Ch2) + -kan: keep something for someone. Tolong simpankan bungkusan ini.", {}),
        ("L-1159", "ambil (Dunia, Ch4) + -kan: get something for someone. Boleh ambilkan fail itu?", {}),
        ("L-1160", "beli (Ch3) + -kan: buy something for someone. Boleh belikan kopi?", {}),
        ("L-1161", "bawa (Dunia, Ch4) + -kan: bring something for someone.", {}),
        ("L-1162", "tutup (Dunia, Ch4) + -kan: close something for someone. Tolong tutupkan pintu itu.", {}),
        ("L-1163", "buka (Dunia, Ch4) + -kan: open something for someone. Boleh bukakan pintu itu?", {}),
        ("L-1164", "letak (Dunia, Ch7) + -kan. Double k: letakkan. Put or place something: Tolong letakkan beg di sini.", {}),
        ("L-1165", "pulang (Ch4) + -kan: give something back. Tolong pulangkan buku itu.", {}),
        ("L-1166", "beri + -kan: give. beri is a root, so berikan is not ber- + ikan. Everyday speech says «bagi» (Dunia, Ch4).", {}),
        ("L-1167", "tunjuk + -kan. Double k: tunjukkan. Boleh tunjukkan mesej itu?", {}),
        ("L-0743", "pasti + -kan: to make sure. The root «pasti» alone has no class card.", {}),
        ("L-0595", whole + " Root in the ledger: kawal.", {}),
        ("L-0654", "A flat in a condo: Blok B, unit 12-3.", {}),
        ("L-0650", "The condo management office. Learn it as a phrase.", {}),
        ("L-0658", "The guardhouse. Learn it as a phrase.", {}),
        ("L-0662", whole + " Root in the ledger: milik.", {}),
        ("L-1168", "A label on a parcel.", {}),
        ("L-1169", whole + " Root in the ledger: terima. The recipient named on a parcel label.", {}),
        ("L-1170", "The written, formal term on a label. Everyday speech says «nombor tracking» (below).", {}),
        ("L-1171", "The lobby.", {}),
        ("L-1172", "Torn: Label ini koyak.", {}),
        ("L-0653", "A block of a building: Blok B, unit 12-3.", {}),
        # Recognition (plan: the spoken partner of the new standard «nombor penjejakan», not a new core word).
        ("L-0608", "Spoken: the everyday word for nombor penjejakan. Recognise only.", {}),
        # --- unit 12B ---
        ("L-1173", "baik (Ch1) + -i: to repair, as a request: Tolong baiki paip ini. Same spelling as baik (good), different meaning.", {}),
        ("L-1174", "meN- + baiki (baik + -i). mem- before b. To repair: Juruteknik sedang membaiki paip.", {}),
        ("L-1175", "hubung + -i: contact someone. Common on notices and in requests: Boleh hubungi juruteknik?", {}),
        ("L-0789", "meN- + hubungi (hubung + -i). meng- before h. To contact: Kami akan menghubungi juruteknik.", {}),
        ("L-1176", "tempah (Dunia, Ch4) + -an: a booking or reservation.", {}),
        ("L-1177", "isi (Dunia, Ch3) + -kan: fill in, put in. Everyday speech prefers «isi»: Sila isi borang ini.", {}),
        ("L-1178", "kosong (Ch3) + -kan: empty or clear something. Tolong kosongkan kotak itu.", {}),
        ("L-1179", "hidup + -kan: switch on. Everyday speech says «buka» for lights and aircon.", {}),
        ("L-1180", "mati + -kan: switch off. Everyday speech says «tutup» for lights and aircon. Tolong matikan lampu itu.", {}),
        ("L-1181", "bersih (Ch6) + -kan, not ber- + sih. To clean something: Tolong bersihkan meja itu.", {}),
        ("L-0651", "Learn it as a whole word: ke- … -an words come in Stage 3. Root in the ledger: bocor.", {}),
        ("L-0652", "A technician.", {}),
        ("L-0661", "A pipe.", {}),
        ("L-0649", "A ceiling.", {}),
        ("L-0665", "A contractor.", {}),
        ("L-0655", "A booked period of time: Ada slot petang ini.", {}),
        ("L-1182", "Learn it as a whole word: ke- … -an words come in Stage 3. Root: rosak (Dunia, Ch7).", {}),
        ("L-1183", "A complaint or problem report. Root in the ledger: adu.", {}),
        ("L-1184", "ganti (this chapter) + -kan: replace something. Tolong gantikan lampu itu.", {}),
        ("L-0871", "perlahan (Ch6) + -kan: to slow down, or to lower the voice or the volume. Tolong perlahankan muzik itu.", {}),
        ("L-0698", "To replace, or to stand in for someone. The root of gantikan.", {}),
    ]
    for lid, note, opt in cards:
        kc(b, 12, lid, note, **opt)
    step3e(b, 12)

    # Frames: the plan's section 3 examples (Tolong simpankan bungkusan ini; Boleh hubungi juruteknik; Juruteknik sedang
    # membaiki paip) and the lines of its parcel scene (Saya mahu ambil bungkusan. Sudah sampai?; Boleh tunjukkan mesej?).
    frames = [
        ("ms-c12-f01", "Tolong ___ bungkusan ini.", "Tolong simpankan bungkusan ini.", "Please keep this parcel for me."),
        ("ms-c12-f02", "Boleh ___ mesej itu?", "Boleh tunjukkan mesej itu?", "Can you show me the message?"),
        ("ms-c12-f03", "Saya mahu ambil ___. Sudah sampai?", "Saya mahu ambil bungkusan. Sudah sampai?",
         "I'd like to collect my parcel. Has it arrived?"),
        ("ms-c12-f04", "Juruteknik sedang ___ paip.", "Juruteknik sedang membaiki paip.", "The technician is repairing the pipe."),
        ("ms-c12-f05", "Boleh ___ juruteknik?", "Boleh hubungi juruteknik?", "Can you contact the technician?"),
        ("ms-c12-f06", "Ada kebocoran di ___ saya.", "Ada kebocoran di siling saya.", "There's a leak in my ceiling."),
    ]
    for fid, frame, example, meaning in frames:
        b.add_frame(12, fid, frame, example, meaning)

    # Scenario: the plan's two scenes (fictional condo procedures). 12A: two parcels at the guardhouse, the small box
    # belongs to another unit (the label is torn), and a clear outcome. 12B: water at the ceiling and a technician's visit.
    title = "Parcels and a leak"
    lines = [
        ("Tanaka", "Selamat petang. Saya mahu ambil bungkusan. Sudah sampai?",
         "Good afternoon. I'd like to collect a parcel. Has it arrived?"),
        ("Pengawal", "Sudah, encik. Unit berapa?", "Yes, sir. Which unit?"),
        ("Tanaka", "Blok B, unit 12-3.", "Block B, unit 12-3."),
        ("Pengawal", "Ada dua bungkusan. Boleh tunjukkan mesej itu?", "There are two parcels. Can you show me the message?"),
        ("Tanaka", "Boleh. Nombor penjejakan ada dalam mesej ini.", "Sure. The tracking number is in this message."),
        ("Pengawal", "Terima kasih. Bungkusan besar ini untuk encik. Bungkusan kecil itu bukan untuk encik. Label ini koyak, tetapi nombor unit ada di sini: Blok A, unit 8-1.",
         "Thank you. This big parcel is for you. That small parcel is not for you. The label is torn, but the unit number is here: Block A, unit 8-1."),
        ("Tanaka", "Oh, bukan untuk saya. Boleh tolong hantarkan bungkusan kecil itu ke unit 8-1?",
         "Oh, it's not mine. Could you please deliver that small parcel to unit 8-1?"),
        ("Pengawal", "Pemilik unit itu belum ada di rumah. Saya simpankan bungkusan itu di pondok pengawal dulu.",
         "The owner of that unit isn't home yet. I'll keep the parcel in the guardhouse for now."),
        ("Tanaka", "Baik. Tolong hubungi pemilik unit itu nanti. Saya bawa bungkusan besar ini ke atas.",
         "Fine. Please contact the owner of that unit later. I'll take this big parcel upstairs."),
        ("Pengawal", "Baik, encik. Selamat petang!", "Fine, sir. Good afternoon!"),
        ("Tanaka", "Selamat pagi. Saya Tanaka, Blok B, unit 12-3. Ada kebocoran di siling bilik air saya.",
         "Good morning. This is Tanaka, Block B, unit 12-3. There's a leak in my bathroom ceiling."),
        ("Pejabat pengurusan", "Selamat pagi, Encik Tanaka. Air turun dari siling atau dari paip?",
         "Good morning, Mr Tanaka. Is the water coming from the ceiling or from a pipe?"),
        ("Tanaka", "Dari siling, dekat lampu. Saya takut lampu itu rosak.", "From the ceiling, near the light. I'm afraid the light is damaged."),
        ("Pejabat pengurusan", "Tolong matikan lampu itu dulu. Kami akan menghubungi juruteknik.",
         "Please switch that light off first. We'll contact a technician."),
        ("Tanaka", "Baik, saya matikan lampu itu sekarang. Bila juruteknik boleh datang?",
         "Okay, I'm switching the light off now. When can the technician come?"),
        ("Pejabat pengurusan", "Ada slot petang ini, pukul tiga. Boleh?", "There's a slot this afternoon at three. Is that all right?"),
        ("Tanaka", "Boleh. Tolong hubungi saya sebelum juruteknik sampai.", "That's fine. Please contact me before the technician arrives."),
        ("Pejabat pengurusan", "Baik. Juruteknik akan melihat siling itu. Saya isi borang aduan sekarang.",
         "Okay. The technician will look at the ceiling. I'm filling in the complaint form now."),
        ("Tanaka", "Terima kasih. Saya tunggu di rumah.", "Thank you. I'll wait at home."),
    ]
    for i, (speaker, ms, en) in enumerate(lines, 1):
        b.ks.append([f"ms-c12-s{i:02d}", 12, title, speaker, ms, en])


def ch13(b):
    """Chapter 13: health situations: negation, permission, obligation and advice. No new affix family.

    24 ledger rows in plan order, then L-1268 «mendaftar» (step 3d, last so no earlier card ID moves). «mesti» is a root (it has no me- prefix); dibenarkan is a di- … -kan form (the
    Chapter 9 passive and the Chapter 12 -kan). The scenes are fictional and ask for clarification: no diagnosis,
    treatment or dose is authored (plan section 3 and section 5).
    """
    whole = "Learn it as a whole word: ke- … -an words come in Stage 3."
    cards = [
        ("L-1185", "Need: Saya perlu berjumpa doktor. Compare patut (should) and mesti (must) below.", {}),
        ("L-1186", "Should, as advice: Encik patut berehat.", {}),
        ("L-1187", "Compulsory, as on a notice or a form: Borang ini wajib diisi.", {}),
        ("L-1188", "di- + benar + -kan: allowed. Tidak dibenarkan minum di sini. The opposite of dilarang (Ch9).", {}),
        ("L-1189", whole + " Root in the ledger: benar. Taught only as «permission»: Encik mesti minta kebenaran doktor.", {}),
        ("L-1190", "Advice.", {}),
        ("L-0633", "Allergy. Learn it as a whole word. Root in the ledger: alah.", {}),
        ("L-0634", "A symptom.", {}),
        ("L-0631", "Sore throat: sakit (Ch5) + tekak (Dunia, Ch5). Learn it as a phrase.", {}),
        ("L-0638", "An appointment. Learn it as a phrase: Ada temu janji? The word janji comes in Ch14.", {}),
        ("L-1191", "A pharmacy.", {}),
        ("L-1192", "A dose, as printed on a medicine label. For reading a label only.", {}),
        ("L-1193", "An instruction. Learn it as a whole word. Root in the ledger: arah.", {}),
        ("L-1194", whole + " Root in the ledger: sihat.", {}),
        ("L-1195", "Treatment. Learn it as a whole word. Root in the ledger: rawat.", {}),
        ("L-1196", "elak + -kan: avoid something (a request or an instruction).", {}),
        ("L-1197", "Suitable. Learn it as a whole word. Root in the ledger: suai.", {}),
        ("L-1198", whole + " Root in the ledger: cemas.", {}),
        ("L-0627", "A receptionist. Learn it as a phrase.", {}),
        ("L-0636", "When needed. A fixed phrase: bila (Ch4) + perlu.", {}),
        ("L-1199", "Must. mesti is a root: it is not me- + sti.", {}),
        ("L-0630", "A panel clinic: one that your company has an agreement with.", {}),
        ("L-0648", "To register: Encik perlu daftar dulu.", {}),
        ("L-1200", "cuti (Dunia, Ch2) + sakit (Ch5). Standard: cuti sakit. Spoken: «MC».", {}),
        # Step 3d (Sam, 13 Nov 2026; ledger L-1268): the meN- form beside its root daftar (above).
        ("L-1268", "meN- + daftar (Ch13): to register. The standard form of daftar: Saya belum mendaftar.", {}),
    ]
    for lid, note, opt in cards:
        kc(b, 13, lid, note, **opt)
    step3e(b, 13)

    # Frames: the plan's section 3 examples (Saya belum makan. / Bolehkah saya masuk? / Saya perlu berjumpa doktor.), the
    # advice and prohibition contrast, and a notice. Belum, boleh and jangan return from Chapters 4, 2 and 7.
    frames = [
        ("ms-c13-f01", "Saya belum ___.", "Saya belum makan.", "I haven't eaten yet."),
        ("ms-c13-f02", "Bolehkah saya ___?", "Bolehkah saya masuk?", "May I come in?"),
        ("ms-c13-f03", "Saya perlu ___.", "Saya perlu berjumpa doktor.", "I need to see a doctor."),
        ("ms-c13-f04", "Encik patut ___.", "Encik patut berehat.", "You should rest."),
        ("ms-c13-f05", "Tidak dibenarkan ___ di sini.", "Tidak dibenarkan minum di sini.", "Drinking is not allowed here."),
        ("ms-c13-f06", "Borang ini wajib ___.", "Borang ini wajib diisi.", "This form must be filled in."),
    ]
    for fid, frame, example, meaning in frames:
        b.add_frame(13, fid, frame, example, meaning)

    # Scenario: the plan's scene (a fictional clinic notice, then a pharmacist asked to repeat an instruction).
    title = "At the clinic and the pharmacy"
    lines = [
        ("Penyambut tetamu", "Selamat pagi, encik. Ada temu janji?", "Good morning, sir. Do you have an appointment?"),
        ("Tanaka", "Tidak ada. Saya demam dan sakit tekak. Saya batuk juga.", "No. I have a fever and a sore throat. I'm coughing too."),
        ("Penyambut tetamu", "Encik perlu daftar dulu. Sila isi borang ini.", "You need to register first. Please fill in this form."),
        ("Tanaka", "Baik. Saya belum isi borang. Bolehkah saya isi borang di sini?",
         "Okay. I haven't filled in the form yet. May I fill it in here?"),
        ("Penyambut tetamu", "Boleh. Ini klinik panel syarikat encik?", "Yes. Is this your company's panel clinic?"),
        ("Tanaka", "Ya. Boleh saya minum air di sini?", "Yes. Can I drink water here?"),
        ("Penyambut tetamu", "Maaf, tidak dibenarkan minum di sini. Dilarang makan dan minum di bilik menunggu.",
         "Sorry, drinking isn't allowed here. No eating or drinking in the waiting room."),
        ("Tanaka", "Baik, saya faham. Terima kasih.", "Okay, I understand. Thank you."),
        ("Penyambut tetamu", "Encik ada alahan?", "Do you have any allergies?"),
        ("Tanaka", "Tidak. Saya tidak ada alahan.", "No. I don't have any allergies."),
        ("Doktor", "Encik patut berehat di rumah. Encik tidak perlu datang ke pejabat esok.",
         "You should rest at home. You don't need to come to the office tomorrow."),
        ("Tanaka", "Doktor, boleh saya minta cuti sakit untuk esok?", "Doctor, may I ask for sick leave for tomorrow?"),
        ("Doktor", "Boleh. Saya berikan cuti sakit satu hari.", "Yes. I'll give you one day of sick leave."),
        ("Tanaka", "Terima kasih, doktor.", "Thank you, doctor."),
        ("Tanaka", "Maaf, boleh cakap lagi sekali? Saya tidak faham arahan itu.", "Sorry, could you say that once more? I don't understand that instruction."),
        ("Ahli farmasi", "Boleh. Encik mesti baca arahan di label. Dos ada di label itu.",
         "Of course. You must read the instructions on the label. The dose is on the label."),
        ("Tanaka", "Baik, saya baca label itu. Terima kasih.", "Okay, I'll read the label. Thank you."),
        ("Ahli farmasi", "Sama-sama. Kalau ada soalan, tanya saya lagi.", "You're welcome. If you have a question, ask me again."),
    ]
    for i, (speaker, ms, en) in enumerate(lines, 1):
        b.ks.append([f"ms-c13-s{i:02d}", 13, title, speaker, ms, en])


def ch14(b):
    """Chapter 14: reasons, conditions, purpose, contrast and sequence. No new affix family.

    20 ledger rows in plan order, then L-1269 «tangguhkan» and L-1270 «batalkan» (step 3d, last so no earlier card ID moves): connectors (the formal ones beside their everyday partners, R5), sequence words,
    four nouns and the "change of plan" words tangguh, janji and batal. kerana, kalau, tetapi, kemudian and the other
    Stage 1 connectors are revision: the new work is joining clauses. Words with Stage 3 affixes (keputusan,
    perubahan, tujuan, pilihan) are whole words.
    """
    whole = "Learn it as a whole word: {} words come in Stage 3."
    cards = [
        ("L-1201", "So that, for a purpose: Saya bangun awal supaya saya tidak lambat.", {}),
        ("L-1202", "Although, even though. Learn it as a whole word. Root in the ledger: walau. Walaupun saya penat, saya suka mendaki.", {}),
        ("L-1203", "If. Formal or written; everyday speech says «kalau» (Ch7): Kalau hujan, kita makan di kafe.", {}),
        ("L-1204", "When. Formal or written; everyday speech says «bila» (Ch4).", {}),
        ("L-1205", "While doing something else: Dia makan sambil membaca surat khabar.", {}),
        ("L-1206", "However. Written only; everyday speech says «tapi» (Ch5).", {}),
        ("L-1207", "Therefore. Formal; everyday speech says «jadi» (below). A fixed phrase: oleh (Ch9) + itu.", {}),
        ("L-1208", "akhir + -nya: finally, at last. Akhirnya kita makan di kafe.", {}),
        ("L-1209", "First, at first. Learn it as a whole word (repeated words come in Stage 3). Root in the ledger: mula (Ch4).", {}),
        ("L-1210", "Next, after that. Formal; everyday speech says «lepas tu» (spoken). Learn it as a whole word. Root in the ledger: terus (Ch7).", {}),
        ("L-1211", "During, when. Learn it as a whole word. Root in the ledger: masa (Ch4). Semasa mendaki, kita minum air.", {}),
        ("L-1212", "Since: Sejak bulan lepas saya suka mendaki.", {}),
        ("L-1213", "tuju + -an: purpose. Learn it as a whole word.", {}),
        ("L-1214", "pilih (Ch6) + -an: a choice. Ada dua pilihan.", {}),
        ("L-1215", whole.format("ke- … -an") + " Root in the ledger: putus. Decision, or result.", {}),
        ("L-1216", whole.format("per- … -an") + " Root in the ledger: ubah. Perubahan rancangan = a change of plan.", {}),
        ("L-1217", "So, therefore (everyday). The partner of the formal oleh itu: Jadi, boleh kita tangguhkan ke hari Ahad?", {}),
        ("L-0641", "To put off, to postpone. In a full sentence, tangguh + -kan (below): Boleh kita tangguhkan ke hari Ahad?", {}),
        ("L-0710", "A promise; to promise. You know it from temu janji (Ch13). Janji!", {}),
        ("L-1218", "To cancel; cancelled. Mendaki batal.", {}),
        # Step 3d (Sam, 13 Nov 2026; ledger L-1269, L-1270): the -kan forms beside their roots tangguh and batal (above).
        ("L-1269", "tangguh + -kan (Ch14): to postpone, to put something off. Boleh kita tangguhkan ke hari Ahad?", {}),
        ("L-1270", "batal + -kan (Ch14): to cancel something. Kita batalkan rancangan mendaki.", {}),
    ]
    for lid, note, opt in cards:
        kc(b, 14, lid, note, **opt)
    step3e(b, 14)

    # Frames: the plan's section 3 examples (Kalau hujan, kita makan di kafe. / Saya tidak datang kerana saya bekerja.),
    # then the purpose, contrast, simultaneous and sequence patterns of the plan's five functions.
    frames = [
        ("ms-c14-f01", "Kalau ___, kita makan di kafe.", "Kalau hujan, kita makan di kafe.", "If it rains, we'll eat at the cafe."),
        ("ms-c14-f02", "Saya tidak datang kerana saya ___.", "Saya tidak datang kerana saya bekerja.",
         "I'm not coming because I'm working."),
        ("ms-c14-f03", "Saya bangun awal supaya saya tidak ___.", "Saya bangun awal supaya saya tidak lambat.",
         "I get up early so that I won't be late."),
        ("ms-c14-f04", "Walaupun ___, saya mahu ___.", "Walaupun hujan, saya mahu berjalan kaki.",
         "Even though it's raining, I want to walk."),
        ("ms-c14-f05", "Dia makan sambil ___.", "Dia makan sambil membaca surat khabar.", "He eats while reading the newspaper."),
        ("ms-c14-f06", "Mula-mula kita ___, kemudian kita ___, akhirnya kita ___.",
         "Mula-mula kita makan, kemudian kita berjalan kaki, akhirnya kita balik.",
         "First we eat, then we walk, finally we go home."),
    ]
    for fid, frame, example, meaning in frames:
        b.add_frame(14, fid, frame, example, meaning)

    # Scenario: the plan's scene (rearrange a weekend activity because of rain or a work commitment; a three-step plan with
    # one condition and one alternative; both agree when and where, and what happens if the condition changes).
    title = "Rain, work and a changed plan"
    lines = [
        ("Tanaka", "Cik Mei Ling, hujung minggu ini kita masih mahu mendaki?", "Mei Ling, do we still want to go hiking this weekend?"),
        ("Cik Mei Ling", "Masih. Tetapi cuaca mendung. Kalau hujan pada hari Sabtu, kita tidak boleh mendaki.",
         "Yes. But the weather is cloudy. If it rains on Saturday, we can't hike."),
        ("Tanaka", "Kalau hujan, kita makan di kafe. Kalau tidak hujan, kita mendaki.",
         "If it rains, we'll eat at the cafe. If it doesn't rain, we'll hike."),
        ("Cik Mei Ling", "Bagus! Tetapi saya tidak boleh datang pada hari Sabtu kerana saya bekerja.",
         "Great! But I can't come on Saturday because I'm working."),
        ("Tanaka", "Ada dua pilihan: kita tangguhkan ke hari Ahad atau ke hari Sabtu depan.",
         "There are two choices: we put it off until Sunday or until next Saturday."),
        ("Cik Mei Ling", "Hari Ahad lebih baik. Hari Ahad saya cuti. Janji!", "Sunday is better. I'm off on Sunday. I promise!"),
        ("Tanaka", "Ada perubahan rancangan, tetapi tujuan kita sama: berehat dan berjalan.",
         "The plan has changed, but our purpose is the same: to rest and to walk."),
        ("Tanaka", "Baik. Ini rancangan kita. Mula-mula kita berjumpa di stesen pukul tujuh. Kemudian kita mendaki. Akhirnya kita makan di kafe.",
         "Okay. This is our plan. First we meet at the station at seven. Then we hike. Finally we eat at the cafe."),
        ("Cik Mei Ling", "Saya akan datang awal supaya kita tidak lambat.", "I'll come early so that we're not late."),
        ("Tanaka", "Bagus. Walaupun saya penat, saya suka mendaki. Kita boleh bercakap sambil berjalan.",
         "Good. Even though I'm tired, I like hiking. We can talk while walking."),
        ("Cik Mei Ling", "Kalau hujan lagi pada hari Ahad, bagaimana?", "What if it rains again on Sunday?"),
        ("Tanaka", "Kita batalkan rancangan mendaki, tetapi kita masih makan di kafe.",
         "The hike is off, but we still eat at the cafe."),
        ("Cik Mei Ling", "Baik. Saya sudah tulis mesej untuk kawan kita. Jika hujan, kita tangguhkan. Apabila cuaca cerah, kita mendaki.",
         "Fine. I've written a message for our friends. If it rains, we put it off. When the weather is clear, we hike."),
        ("Tanaka", "Oh, itu bahasa mesej. Kalau kita bercakap, kita guna kalau dan bila, ya?",
         "Oh, that's message language. When we speak, we use kalau and bila, right?"),
        ("Cik Mei Ling", "Ya, betul!", "Yes, exactly!"),
    ]
    for i, (speaker, ms, en) in enumerate(lines, 1):
        b.ks.append([f"ms-c14-s{i:02d}", 14, title, speaker, ms, en])


def ch15(b):
    """Chapter 15: describing a person or a lost item: noun + yang + a short clause. No new affix family.

    19 ledger rows in plan order, then L-1271 «memakai» and L-1272 «berwarna» (step 3d, last so no earlier card ID moves). berjalur is ber- (open since Chapter 10) + jalur; the other nouns and adjectives are
    plain words. L-0623 «beg tangan» is narrowed to "handbag" (Sam, W11). The scene uses «hilang», not «tertinggal»,
    which waits for Chapter 16 (plan section 5).
    """
    cards = [
        ("L-1219", "Lost, missing: Dompet saya hilang. «barang hilang» = lost property.", {}),
        ("L-1220", "A feature, a characteristic. Forms often print it doubled («ciri-ciri»): recognise both.", {}),
        ("L-1221", "ber- + jalur: striped. Baju berjalur. The root «jalur» is not a class card.", {}),
        ("L-1222", "A strap, a cord: beg yang ada tali panjang.", {}),
        ("L-1223", "A pocket.", {}),
        ("L-1224", "A wallet.", {}),
        ("L-0623", "A handbag: beg (Dunia, Ch8) + tangan (Dunia, Ch6). Learn it as a phrase.", {}),
        ("L-0618", "Leather; also skin. Dompet kulit = a leather wallet.", {}),
        ("L-0591", "A car number plate: nombor (Ch3) + plat. Useful for finding an e-hailing car.", {}),
        ("L-1225", "Shape: Bentuknya segi empat.", {}),
        ("L-1226", "Round.", {}),
        ("L-1227", "Square or rectangular: segi + empat (Ch3). Learn it as a phrase.", {}),
        ("L-1228", "A zip (zipper): beg yang ada zip.", {}),
        ("L-1229", "Like, such as. Standard; everyday speech says «macam» (Dunia, Ch5). Learn it as a whole word. Seperti itu = like that: the standard form of the spoken «macam tu» (Ch17).", {}),
        ("L-1230", "A man; male: Lelaki yang memakai cermin mata.", {}),
        ("L-1231", "A woman; female.", {}),
        ("L-1232", "Glasses: cermin (Dunia, Ch4) + mata (Dunia, Ch4). Learn it as a phrase.", {}),
        ("L-1233", "Things, belongings: barang hilang = lost property.", {}),
        ("L-1234", "A brand: Ada jenama?", {}),
        # Step 3d (Sam, 13 Nov 2026; ledger L-1271, L-1272). The root pakai is not a class card: it is the everyday form (Dunia).
        ("L-1271", "meN- + pakai: to wear; to use. The p drops: memakai. The root pakai is not a class card: it is the everyday form you know from Dunia (Ch4). Lelaki yang memakai cermin mata.", {}),
        ("L-1272", "ber- + warna (Ch5): coloured; berwarna hitam = black. Beg itu berwarna hitam.", {}),
    ]
    for lid, note, opt in cards:
        kc(b, 15, lid, note, **opt)
    step3e(b, 15)

    # Frames: the plan's section 3 example (Saya mencari beg yang ada zip.) and the block goals: say what is lost,
    # describe it with a yang clause, ask a question that separates two items, give shape and likeness.
    frames = [
        ("ms-c15-f01", "Saya mencari ___ yang ada ___.", "Saya mencari beg yang ada zip.", "I'm looking for a bag that has a zip."),
        ("ms-c15-f02", "___ saya hilang.", "Dompet saya hilang.", "My wallet is lost."),
        ("ms-c15-f03", "Lelaki yang memakai ___.", "Lelaki yang memakai cermin mata.", "The man who wears glasses."),
        ("ms-c15-f04", "Beg itu berwarna ___ dan ada ___.", "Beg itu berwarna hitam dan ada tali panjang.",
         "The bag is black and has a long strap."),
        ("ms-c15-f05", "Yang mana satu? Yang ___ atau yang ___?", "Yang mana satu? Yang ada zip atau yang tidak ada zip?",
         "Which one? The one with a zip or the one without?"),
        ("ms-c15-f06", "Bentuknya ___, seperti ___.", "Bentuknya segi empat, seperti kotak.", "It is rectangular, like a box."),
    ]
    for fid, frame, example, meaning in frames:
        b.add_frame(15, fid, frame, example, meaning)

    # Scenario: the plan's scene. A wallet described at the lost property counter of a station, then a visitor identified
    # from clothing and a meeting place. Fictional people and belongings.
    title = "A lost wallet and a visitor"
    lines = [
        ("Tanaka", "Maaf, ini kaunter barang hilang? Saya mencari dompet saya.", "Excuse me, is this the lost property counter? I'm looking for my wallet."),
        ("Kakitangan stesen", "Ya, encik. Dompet yang mana? Apa warna dompet itu?", "Yes, sir. Which wallet? What colour is it?"),
        ("Tanaka", "Hitam. Dompet kulit. Ada zip dan satu poket kecil.", "Black. A leather wallet. It has a zip and one small pocket."),
        ("Kakitangan stesen", "Ada jenama?", "Is there a brand?"),
        ("Tanaka", "Saya tidak ingat jenamanya. Bentuknya segi empat, seperti kotak kecil.",
         "I don't remember the brand. It's rectangular, like a small box."),
        ("Kakitangan stesen", "Seperti ini?", "Like this one?"),
        ("Tanaka", "Ya, seperti itu, tetapi ada zip.", "Yes, like that one, but it has a zip."),
        ("Kakitangan stesen", "Ada dua dompet hitam di sini. Yang mana satu? Yang ada zip atau yang tidak ada zip?",
         "There are two black wallets here. Which one? The one with a zip or the one without?"),
        ("Tanaka", "Yang ada zip. Yang itu! Kad saya ada di dalam, tetapi pasport saya tidak ada.",
         "The one with a zip. That one! My card is inside, but my passport isn't."),
        ("Kakitangan stesen", "Betul, ada kad encik di dalam. Ini dompet encik.", "That's right, your card is inside. Here is your wallet."),
        ("Tanaka", "Terima kasih banyak!", "Thank you very much!"),
        ("Tanaka", "Encik Rahman, tetamu dari Jepun sudah sampai di stesen.", "Mr Rahman, our guest from Japan has arrived at the station."),
        ("Encik Rahman", "Saya tidak tahu siapa dia. Lelaki yang mana?", "I don't know who he is. Which man?"),
        ("Tanaka", "Lelaki yang memakai cermin mata dan baju berjalur. Dia dengan seorang perempuan yang memakai topi. Mereka membawa beg yang ada tali panjang.",
         "The man who wears glasses and a striped shirt. He's with a woman who wears a hat. They're carrying a bag with a long strap."),
        ("Encik Rahman", "Dia di mana sekarang?", "Where is he now?"),
        ("Tanaka", "Dia dekat kaunter, di sebelah lif.", "He's near the counter, next to the lift."),
        ("Encik Rahman", "Oh, saya sudah jumpa dia.", "Oh, I've found him."),
    ]
    for i, (speaker, ms, en) in enumerate(lines, 1):
        b.ks.append([f"ms-c15-s{i:02d}", 15, title, speaker, ms, en])


def ch16(b):
    """Chapter 16: accidental and resulting-state ter-, contrasted with the Chapter 6 superlatives.

    23 ledger rows in plan order. The ledger's Affix tag is ter- for the 11 new verbs, root for L-0619, L-0621 and
    L-0644 (existing rows, left as the ledger has them) and blank for L-0752, L-0875 (cards say ter-) and L-0758
    (card says chunk). The first cards carry the contrast with termurah and terbaik (Ch6): the superlative ter- means
    "the most"; this ter- is something that happens without meaning to, or the state that results. Not every ter-
    word means an accident (terkunci, tercedera, terputus are states), and other readings wait (plan section 3).
    """
    contrast = "Not the ter- of termurah and terbaik (Ch6), which means «the most»."
    cards = [
        ("L-1235", "ter- + jatuh: to fall by accident. " + contrast + " The root «jatuh» is not a class card.", {}),
        ("L-0619", "ter- + tinggal (Ch2): to be left behind by accident. " + contrast + " Saya tertinggal telefon di pejabat.", {}),
        ("L-0644", "ter- + lupa (Dunia, Ch4): to forget, without meaning to. Maaf, saya terlupa.", {}),
        ("L-1236", "ter- + tidur (Ch4): to fall asleep without meaning to.", {}),
        ("L-0621", "ter- + lepas (Ch4): to miss (a bus, a chance). Saya terlepas bas.", {}),
        ("L-0752", "ter- + silap: to get something wrong, by mistake. The root «silap» is not a class card.", {}),
        ("L-1237", "ter- + tumpah (this chapter): to spill by accident. Air kopi tertumpah di meja.", {}),
        ("L-1238", "ter- + langgar: to bump into something by accident. Saya tidak sengaja terlanggar kerusi.", {}),
        ("L-1239", "ter- + kunci (this chapter): locked. It names a state (Pintu terkunci) as well as an accident.", {}),
        ("L-1240", "ter- + cedera: injured, hurt. It names a state rather than an action.", {}),
        ("L-1241", "ter- + gelincir: to slip. Saya tergelincir di tangga tadi.", {}),
        ("L-1242", "ter- + bakar: burnt, on fire.", {}),
        ("L-1243", "ter- + putus: cut off, disconnected. It names a resulting state, for example a water supply or a call.", {}),
        ("L-0875", "ter- + sangkut: stuck, for example in traffic.", {}),
        ("L-0758", "By accident, not on purpose. Spoken: «tak sengaja». Awak tidak sengaja.", {}),
        ("L-1244", "An accident. Learn it as a whole word: ke- … -an words come in Stage 3. Root in the ledger: malang.", {}),
        ("L-1245", "A wound.", {}),
        ("L-1246", "A bruise.", {}),
        ("L-1247", "Swollen.", {}),
        ("L-1248", "Slippery: Hati-hati, lantai licin.", {}),
        ("L-1249", "Broken, shattered: Cawan saya pecah.", {}),
        ("L-1250", "To spill; spilled. The root of tertumpah.", {}),
        ("L-1251", "A key. The root of terkunci.", {}),
    ]
    for lid, note, opt in cards:
        kc(b, 16, lid, note, **opt)
    step3e(b, 16)

    # Frames: the plan's section 3 examples (Saya tertinggal telefon di pejabat. / Maaf, saya terlupa.), the other
    # accidents of the scenes, "tidak sengaja", the contrast with the Chapter 6 superlative and a practical request.
    frames = [
        ("ms-c16-f01", "Saya tertinggal ___ di ___.", "Saya tertinggal telefon di pejabat.", "I left my phone at the office."),
        ("ms-c16-f02", "Maaf, saya ___.", "Maaf, saya terlupa.", "Sorry, I forgot."),
        ("ms-c16-f03", "___ tertumpah di ___.", "Air kopi tertumpah di meja.", "Coffee spilled on the table."),
        ("ms-c16-f04", "Saya tidak sengaja ___ ___.", "Saya tidak sengaja terlanggar kerusi.", "I bumped into the chair by accident."),
        ("ms-c16-f05", "Yang ini ___, tetapi dompet saya ___ di rumah.", "Yang ini termurah, tetapi dompet saya tertinggal di rumah.",
         "This one is the cheapest, but my wallet is left at home."),
        ("ms-c16-f06", "Pintu terkunci. Boleh tolong ___?", "Pintu terkunci. Boleh tolong hubungi pejabat pengurusan?",
         "The door is locked. Could you please contact the management office?"),
    ]
    for fid, frame, example, meaning in frames:
        b.add_frame(16, fid, frame, example, meaning)

    # Scenario: the plan's scene (a key left inside the flat, a small spill, a minor fall at a clinic reception;
    # fictional details; state what happened and ask for a practical next step).
    title = "A locked door, a spill and a slip"
    lines = [
        ("Tanaka", "Selamat malam. Maaf, kunci saya tertinggal di dalam rumah. Pintu terkunci.",
         "Good evening. Sorry, my key is left inside the flat. The door is locked."),
        ("Pengawal", "Unit berapa, encik?", "Which unit, sir?"),
        ("Tanaka", "Blok B, unit 12-3. Saya terlupa kunci tadi.", "Block B, unit 12-3. I forgot the key earlier."),
        ("Pengawal", "Encik tunggu di sini. Saya hubungi pejabat pengurusan.", "Please wait here. I'll contact the management office."),
        ("Tanaka", "Baik. Terima kasih banyak.", "Okay. Thank you very much."),
        ("Cik Mei Ling", "Maaf, saya lambat. Saya terlepas bas, kemudian saya tersangkut di jalan yang sesak.",
         "Sorry I'm late. I missed the bus, then I got stuck on a congested road."),
        ("Tanaka", "Jangan risau. Mesyuarat belum bermula.", "Don't worry. The meeting hasn't started."),
        ("Cik Mei Ling", "Maaf, Encik Tanaka! Air kopi saya tertumpah di meja. Cawan saya pun pecah.",
         "Sorry, Mr Tanaka! My coffee spilled on the table. My cup broke too."),
        ("Tanaka", "Awak tidak sengaja. Jangan risau.", "You didn't do it on purpose. Don't worry."),
        ("Cik Mei Ling", "Saya ambil tisu. Fail encik sedikit basah.", "I'll get tissues. Your file is a little wet."),
        ("Tanaka", "Terima kasih. Hati-hati, lantai licin.", "Thank you. Careful, the floor is slippery."),
        ("Tanaka", "Selamat pagi. Saya tergelincir di tangga tadi.", "Good morning. I slipped on the stairs earlier."),
        ("Penyambut tetamu", "Encik tercedera? Di mana yang sakit?", "Are you hurt? Where does it hurt?"),
        ("Tanaka", "Tangan saya bengkak dan ada luka kecil. Lutut saya pun lebam.",
         "My hand is swollen and there's a small wound. My knee is bruised too."),
        ("Penyambut tetamu", "Encik perlu daftar dulu. Ini borang.", "You need to register first. Here is the form."),
        ("Tanaka", "Baik. Boleh doktor melihat tangan saya sekarang?", "Okay. Can the doctor look at my hand now?"),
        ("Penyambut tetamu", "Boleh. Sila tunggu sekejap.", "Yes. Please wait a moment."),
    ]
    for i, (speaker, ms, en) in enumerate(lines, 1):
        b.ks.append([f"ms-c16-s{i:02d}", 16, title, speaker, ms, en])


def ch17(b):
    """Chapter 17: standard and spoken choices, particles, invitations and refusals. No new productive affix.

    All 24 ledger rows. Standard form first: every spoken form
    is a card whose note begins "Spoken: …" and names its standard partner; the standard form is taught earlier in
    the pack or in an earlier chapter (the register check needs that order). «kan» (confirmation, not the suffix -kan)
    and «lah» (tone-dependent) are recognition only (R4), and so is «takpe», the slang short form of «tak apa» (ledger
    L-1266, added after the plan; «tak apa» itself is the Chapter 5 Dunia card L-0940). The plan's teaching order is
    kept except that the standard «tidak mengapa» comes before «takpe». The card for L-1266 shows both spoken forms
    («takpe / tak apa», like «mahu / nak» in Stage 1) so that «tak apa» is labelled as spoken before the scenario uses it.

    The ledger's Affix tag is blank for L-0828 sudi, L-0787 malangnya and L-0748 singgah (cards say root, -nya, root).

    L-1267 «tidak boleh tahan» (Sam, 13 Nov 2026) is the standard core card, and L-0690 «tak tahan» follows it as the
    spoken partner (step 3d, after Cikgu Sensai changed the shared register pair R3 to «tak tahan» -> «tidak boleh
    tahan», a24a993). Both are last in the pack so the earlier card IDs stay the same.
    """
    cards = [
        ("L-1252", "Spoken: «kat» for «di» (at, in). Standard first: di (Ch2). Ada kedai mamak kat depan pejabat.", {}),
        ("L-1253", "Spoken: «kan» = «right?», «isn't it?» (a confirmation particle). It is not the suffix -kan (Ch12). You will hear it; saying it is optional. Recognise only.", {}),
        ("L-1254", "Spoken: «lah» softens or stresses what is said; the meaning depends on the tone, so it has no one-word translation. You will hear it; saying it is optional. Recognise only.", {}),
        ("L-0689", "To invite someone along, informally: Saya ajak encik. Compare jom (Ch2) and jemput (Dunia, Ch9): the tone differs; they are not the same word in short form.", {}),
        ("L-0828", "To be willing, glad to (polite). We use it to ask the other person, not about ourselves: Sudikah encik datang?", {}),
        ("L-0656", "Free, not busy: Hari Sabtu saya tidak lapang.", {}),
        ("L-1255", "To agree. The standard form; the spoken partner is «set!» (below). Learn it as a whole word.", {}),
        ("L-1256", "meN- + tolak (Ch9). The t drops: menolak. A new sense of tolak (push): to decline, to refuse. Saya segan untuk menolak jemputan puan.", {}),
        ("L-1257", "cadang + -an: a suggestion. Itu cadangan yang bagus.", {}),
        ("L-1258", "Hesitant, shy about doing something: Saya segan untuk menolak jemputan puan.", {}),
        ("L-1259", "sayang + -nya: what a pity. Sayangnya hari Sabtu saya tidak lapang.", {}),
        ("L-0787", "malang + -nya: unfortunately. Malangnya saya ada mesyuarat.", {}),
        ("L-1260", "Another time: lain (Ch6) + kali (Ch3). A fixed phrase: Lain kali, ya?", {}),
        ("L-1261", "Never mind; it's all right. The standard form. Everyday speech usually says «tak apa» or «takpe» (spoken).", {}),
        ("L-1262", "Spoken: «macam tu» for «seperti itu» (like that). Standard first: seperti itu (Ch15).", {}),
        ("L-0703", "Spoken: «Set!» = Deal! Agreed! Standard first: setuju (above).", {}),
        ("L-0717", "To treat someone, to pay for them: Bos belanja. belanja on its own is a root; you know berbelanja (Ch10) = to spend money, to shop.", {}),
        ("L-0748", "To drop in, to stop by: Encik singgah di pejabat dulu, ya?", {}),
        ("L-1263", "Spoken: «ni» for «ini» (this). Standard first: ini (Ch2).", {}),
        ("L-1264", "Spoken: «tu» for «itu» (that). Standard first: itu (Ch2).", {}),
        ("L-1265", "jemput (Dunia, Ch9) + -an: an invitation. Ini jemputan makan malam.", {}),
        # Recognition (ledger L-1266, added after the plan): the slang short form of tak apa.
        ("L-1266", "Spoken: «takpe» is the short form of «tak apa» (never mind); both are everyday speech. The standard form is tidak mengapa (above). «tak apa» is also the Chapter 5 Dunia card. Recognise only.",
         {"term": "takpe / tak apa"}),
        # Sam, 13 Nov 2026 (ledger L-1267, Journal row 178): the standard line first, then its spoken partner.
        ("L-1267", "Can't stand, can't handle (for example spicy food): Saya tidak boleh tahan pedas. The standard form; the spoken partner is «tak tahan» (below). "
                   "It is not the same as «boleh tahan» (L-0939, Dunia, Ch5), which means «not bad»: a different expression.", {}),
        # Step 3d (Sam, 13 Nov 2026; ledger L-0690): the spoken partner, after its standard form. Its Jambatan card (ms-j-office-14) is
        # dropped by kc(), so the class card replaces it.
        ("L-0690", "Spoken: «tak tahan» for «tidak boleh tahan» (can't stand, can't handle). Standard first: tidak boleh tahan (above). "
                   "Everyday ways to say you don't want spicy food: Saya tak nak pedas. Saya tak suka pedas.", {}),
    ]
    for lid, note, opt in cards:
        kc(b, 17, lid, note, **opt)
    step3e(b, 17)

    # Frames: the plan's functions (invite, accept, decline with a reason or an alternative, suggest, agree), standard form
    # first; the spoken partners are in the card notes and in the scenario's casual lines.
    frames = [
        ("ms-c17-f01", "Sudikah encik ___?", "Sudikah encik datang?", "Would you like to come? (polite)"),
        ("ms-c17-f02", "Sayangnya saya tidak ___. Lain kali, ya?", "Sayangnya saya tidak lapang. Lain kali, ya?",
         "Unfortunately I'm not free. Another time, then?"),
        ("ms-c17-f03", "Bagaimana kalau ___?", "Bagaimana kalau hari Jumaat?", "How about Friday?"),
        ("ms-c17-f04", "___! Hari Jumaat, pukul tujuh.", "Setuju! Hari Jumaat, pukul tujuh.",
         "Agreed! Friday at seven. (Spoken: Set!)"),
        ("ms-c17-f05", "Tidak mengapa. ___.", "Tidak mengapa. Kita cuba lain kali.",
         "It's all right. We'll try another time. (Spoken: Takpe.)"),
        ("ms-c17-f06", "Jom makan kat ___ ni!", "Jom makan kat kafe ni!",
         "Let's eat at this cafe! (Spoken: kat = di, ni = ini.)"),
    ]
    for fid, frame, example, meaning in frames:
        b.add_frame(17, fid, frame, example, meaning)

    # Scenario: the plan's scene. An invitation to a team dinner that Tanaka declines with a reason and an alternative
    # (standard Malay), then a casual lunch invitation in which the spoken forms are heard and explained.
    title = "An invitation, and how people really talk"
    lines = [
        ("Puan Aini", "Encik Tanaka, ini jemputan makan malam pejabat. Hari Sabtu, pukul tujuh.",
         "Mr Tanaka, this is the invitation to the office dinner. Saturday at seven."),
        ("Tanaka", "Terima kasih, Puan Aini. Siapa yang belanja?", "Thank you, Puan Aini. Who is treating?"),
        ("Puan Aini", "Bos belanja. Sudikah encik datang?", "The boss is treating. Would you like to come?"),
        ("Tanaka", "Sayangnya hari Sabtu saya tidak lapang. Saya segan untuk menolak jemputan puan.",
         "Unfortunately I'm not free on Saturday. I'm reluctant to turn down your invitation, Puan."),
        ("Puan Aini", "Tidak mengapa. Ada cadangan lain?", "That's all right. Do you have another suggestion?"),
        ("Tanaka", "Bagaimana kalau hari Jumaat?", "How about Friday?"),
        ("Puan Aini", "Itu cadangan yang bagus. Saya tanya bos dulu.", "That's a good suggestion. I'll ask the boss first."),
        ("Puan Aini", "Bos setuju. Hari Jumaat, pukul tujuh. Encik singgah di pejabat dulu, ya? Kita pergi sama-sama.",
         "The boss agrees. Friday at seven. Drop by the office first, will you? We'll go together."),
        ("Tanaka", "Baik. Terima kasih!", "Fine. Thank you!"),
        ("Cik Mei Ling", "Encik Tanaka, jom makan kat kafe ni! Saya belanja!", "Mr Tanaka, let's eat at this cafe! My treat!"),
        ("Tanaka", "Terima kasih. Tetapi makanan di kafe itu pedas. Saya tidak boleh tahan pedas.",
         "But the food at that cafe is spicy. I can't stand spicy food."),
        ("Cik Mei Ling", "Takpelah. Kita cari kedai lain. Macam tu boleh?", "No problem. We'll look for another place. Would that be all right?"),
        ("Tanaka", "Tadi cik cakap «takpe». Itu sama dengan «tidak mengapa», ya?", "You said «takpe» just now. That's the same as «tidak mengapa», right?"),
        ("Cik Mei Ling", "Ya! Orang selalu cakap «tak apa» atau «takpe».", "Yes! People usually say «tak apa» or «takpe»."),
        ("Tanaka", "Dan «lah» dan «kan»? Saya faham, tetapi saya tidak perlu cakap «lah», ya?",
         "And «lah» and «kan»? I understand them, but I don't have to say «lah», do I?"),
        ("Cik Mei Ling", "Betul. Cakap seperti itu pun bagus, kan?", "Right. Speaking like that is fine too, isn't it?"),
        ("Tanaka", "Ada kedai mamak dekat pejabat?", "Is there a mamak stall near the office?"),
        ("Cik Mei Ling", "Ada, kedai mamak kat depan pejabat tu. Dekat sahaja.", "Yes, the mamak stall in front of the office. It's very close."),
        ("Tanaka", "Setuju! Mari kita pergi.", "Agreed! Let's go."),
        ("Cik Mei Ling", "Set!", "Deal!"),
    ]
    for i, (speaker, ms, en) in enumerate(lines, 1):
        b.ks.append([f"ms-c17-s{i:02d}", 17, title, speaker, ms, en])


def ch18(b):
    """Chapter 18: the Stage 2 review pack. No new words (plan section 2: core 0, recognition 0): no class cards, so no
    ledger cell changes. Frames and a scenario recycle chapters 10 to 17 with only words placed in chapters 1 to 17;
    Sedia Kelas holds review cards only (the import overrides list them, one to three per theme). The plan's chapter 18
    scenario is an integrated working week: introduction and office handover, a parcel and a repair problem, an
    appointment clarification and a changed invitation. Standard Malay is always accepted; the two spoken forms in the
    last lines (set, kat) were taught in Chapter 17, and no particle is needed.
    """
    # One pattern from each chapter (10 and 11 share the first frame), standard forms.
    frames = [
        ("ms-c18-f01", "Setiap pagi saya ___ pukul ___, kemudian saya ___ emel.", "Setiap pagi saya bertolak pukul tujuh, kemudian saya membaca emel.",
         "Every morning I set off at seven, then I read my email."),
        ("ms-c18-f02", "Tolong ___ bungkusan itu di pondok pengawal.", "Tolong simpankan bungkusan itu di pondok pengawal.",
         "Please keep that parcel at the guardhouse."),
        ("ms-c18-f03", "Saya belum ___, tetapi saya mesti ___.", "Saya belum mendaftar, tetapi saya mesti berjumpa doktor.",
         "I haven't registered yet, but I must see a doctor."),
        ("ms-c18-f04", "Hari Sabtu saya tidak lapang, jadi bolehkah kita ___ ke hari Ahad?",
         "Hari Sabtu saya tidak lapang, jadi bolehkah kita tangguhkan ke hari Ahad?",
         "I'm not free on Saturday, so could we postpone it to Sunday?"),
        ("ms-c18-f05", "Saya mencari ___ yang ___.", "Saya mencari dompet yang ada zip.", "I'm looking for a wallet that has a zip."),
        ("ms-c18-f06", "Maaf, saya ___. Tidak mengapa, ___.", "Maaf, saya terlupa. Tidak mengapa, lain kali, ya?",
         "Sorry, I forgot. That's all right, another time."),
    ]
    for fid, frame, example, meaning in frames:
        b.add_frame(18, fid, frame, example, meaning)

    title = "A working week"
    lines = [
        ("Tanaka", "Selamat pagi, Cik Mei Ling. Selamat datang! Saya berasal dari Osaka dan bekerja di Kuala Lumpur sejak tahun lepas.",
         "Good morning, Mei Ling. Welcome! I'm from Osaka and I've worked in Kuala Lumpur since last year."),
        ("Cik Mei Ling", "Terima kasih, Encik Tanaka. Saya baru bekerja di sini. Saya tinggal berdua dengan kakak saya.",
         "Thank you, Mr Tanaka. I've only just started working here. I live with my older sister, just the two of us."),
        ("Tanaka", "Hari ini cik akan membaca emel ini dan menyemak draf itu. Tarikh akhir hari Jumaat.",
         "Today you'll read this email and check that draft. The deadline is Friday."),
        ("Cik Mei Ling", "Baik. Siapa yang menulis draf itu?", "Okay. Who wrote the draft?"),
        ("Tanaka", "Encik Rahman yang menulis draf itu. Dia akan menghantar fail itu petang ini.",
         "Mr Rahman wrote it. He'll send the file this afternoon."),
        ("Cik Mei Ling", "Encik Tanaka, ada kebocoran di siling bilik mesyuarat.", "Mr Tanaka, there's a leak in the ceiling of the meeting room."),
        ("Tanaka", "Tolong hubungi pejabat pengurusan. Juruteknik akan melihat siling itu.",
         "Please contact the management office. A technician will look at the ceiling."),
        ("Cik Mei Ling", "Baik. Saya hubungi mereka sekarang.", "Okay. I'll contact them now."),
        ("Cik Mei Ling", "Satu lagi: bungkusan saya sudah sampai di pondok pengawal. Label itu koyak, jadi pengawal mahu tengok mesej saya.",
         "One more thing: my parcel has arrived at the guardhouse. The label is torn, so the guard wants to see my message."),
        ("Tanaka", "Tidak mengapa. Pergi dulu. Pengawal akan tengok nombor penjejakan dalam mesej itu.",
         "That's all right. Go now. The guard will look at the tracking number in the message."),
        ("Cik Mei Ling", "Encik Tanaka, saya demam dan sakit tekak. Saya mesti berjumpa doktor.",
         "Mr Tanaka, I have a fever and a sore throat. I must see a doctor."),
        ("Tanaka", "Cik patut berehat. Cik sudah ada temu janji?", "You should rest. Do you have an appointment yet?"),
        ("Cik Mei Ling", "Belum. Bolehkah saya minta cuti sakit?", "Not yet. May I ask for sick leave?"),
        ("Tanaka", "Boleh. Cik perlu minta cuti sakit daripada doktor.", "Yes. You need to ask the doctor for sick leave."),
        ("Cik Mei Ling", "Maaf, Encik Tanaka. Telefon saya tertinggal di rumah. Dompet saya pun hilang: dompet kulit yang ada zip.",
         "Sorry, Mr Tanaka. I left my phone at home. My wallet is lost too: a leather wallet that has a zip."),
        ("Tanaka", "Jangan risau. Cuba tanya di kaunter barang hilang di stesen.", "Don't worry. Try asking at the lost property counter at the station."),
        ("Puan Aini", "Cik Mei Ling, ini jemputan makan malam. Hari Sabtu, pukul tujuh. Bos belanja.",
         "Mei Ling, this is the invitation to dinner. Saturday at seven. The boss is treating."),
        ("Cik Mei Ling", "Terima kasih, Puan Aini. Sayangnya hari Sabtu saya tidak lapang.", "Thank you, Puan Aini. Unfortunately I'm not free on Saturday."),
        ("Puan Aini", "Tidak mengapa. Bagaimana kalau hari Ahad?", "That's all right. How about Sunday?"),
        ("Cik Mei Ling", "Boleh. Hari Ahad saya lapang.", "Yes. I'm free on Sunday."),
        ("Puan Aini", "Set! Hari Ahad, pukul tujuh.", "Deal! Sunday at seven."),
        ("Cik Mei Ling", "Baik. Jumpa kat pejabat dulu, ya?", "Okay. Let's meet at the office first, shall we?"),
    ]
    for i, (speaker, ms, en) in enumerate(lines, 1):
        b.ks.append([f"ms-c18-s{i:02d}", 18, title, speaker, ms, en])


# Step 3e Dunia work (Sam, 14 Nov 2026).
CH10_SCENE = "hari-kerja-jiran"
POOL_SCENE = "kata-biasa"

# The chapter 10 picture scene (the HANDOFF backlog item): the ber- verbs of the working-day and new-neighbour scenes, plus
# kolam renang, taman and penuh. Each card is the Dunia twin of a class card (same Malay), as in the Stage 1 scenes, so only
# words placed up to chapter 10 appear. (ledger id, emoji or None for a card without a picture)
CH10_CARDS = [
    ("L-1106", "🧳"),  # bertolak
    ("L-1103", "🛑"),  # berhenti
    ("L-1101", "🍳"),  # bersarapan
    ("L-1089", None),  # bekerja
    ("L-1090", None),  # berjalan
    ("L-1099", None),  # berbual
    ("L-1095", "🏊"),  # berenang
    ("L-1097", "🚴"),  # berbasikal
    ("L-1096", "🏃"),  # berlari
    ("L-1094", "🤸"),  # bersenam
    ("L-1093", "🛋️"),  # berehat
    ("L-1273", None),  # kolam renang
    ("L-1274", "🌳"),  # taman
    ("L-1276", "🈵"),  # penuh (満, as Japanese learners know it)
    ("L-1114", "📦"),  # berpindah
    ("L-0660", "🏘️"),  # jiran
    ("L-1108", "💍"),  # berkahwin
    ("L-1112", "🎒"),  # bersekolah
    ("L-1116", "🏪"),  # berniaga
    ("L-1118", None),  # berkumpul
]

# The practice pool (L-1304 to L-1309): common words that are not Stage 2 core. Each shows its root and the chapter where the
# root or its partner is taught. (ledger id, note, emoji)
POOL_CARDS = [
    ("L-1304", "meN- + sapu: to sweep. The s becomes ny, as in menyimpan and menyemak (Ch11). Saya menyapu lantai setiap pagi.", "🧹"),
    ("L-1305", "di- + semak (Ch11): the di- partner of menyemak (Ch11): to be checked. Borang itu disemak oleh pengurus.", "🔍"),
    ("L-1306", "di- + simpan (Dunia, Ch2): the di- partner of menyimpan (Ch11): to be kept, to be stored. Fail itu disimpan di pejabat.", "🗄️"),
    ("L-1307", "ber- + sukan (Ch2): to do sport. Kami bersukan pada hari Sabtu.", "⚽"),
    ("L-1308", "To live; alive; life. The root of hidupkan (Ch12). Mereka hidup berjiran dengan baik.", "🌱"),
    ("L-1309", "gilir + -an: a turn. Learn it as a whole word. Root in the ledger: gilir; see nombor giliran (Dunia, Ch3). Sekarang giliran saya.", "🔢"),
]


def dunia_3e(b):
    # «tandatangan»: the Malaysian spelling is joined (L-0530, Journal row 191); the spaced form is Indonesian.
    b.edit_dunia("ms-d-pejabat-pagi-08", term="tandatangan",
                 note="Written as one word in Malaysian Malay. The verb is menandatangani.")

    b.add_scene(CH10_SCENE, "Kata Kerja Harian (Daily verbs)", "Hari bekerja dan jiran baru", "A working day and a new neighbour", 10,
                "Tanaka's working day and his weekend sport, then Sunday with a new neighbour: the ber- verbs you meet in class this week.")
    ids = {}
    for lid, emoji in CH10_CARDS:
        did = b.add_dunia(CH10_SCENE, lid)
        if emoji:
            ids[did] = emoji
    b.images_3e = ids

    # The practice pool sits outside the chapter packs. Primes chapter 18 = after every chapter (the guard then allows its ber-, di- and
    # meN- forms); tools/import-overrides.json "practice_scenes" keeps it from becoming chapter 18's Sedia Kelas scene.
    b.add_scene(POOL_SCENE, "Latihan (Practice)", "Kata biasa", "Everyday words", 18,
                "Common words that are not in any chapter's core list. They are here for practice, after the chapters.")
    for lid, note, emoji in POOL_CARDS:
        did = b.add_dunia(POOL_SCENE, lid, note=note, place=f"Kata-Kata practice pool (not core); Dunia · {b.scene_label(POOL_SCENE)} (primes Ch18)")
        b.images_3e[did] = emoji


# Step 6b (Sam, 14 Nov 2026): L-0195 is now «baru / baharu» (Journal row 207; baharu is the Dewan Bahasa spelling, baru the everyday one).
# The two class cards were built from v5 before the alias existed, so their terms are set here from the sheet as it was after Journal row 207.
LEDGER_6B = "7dabdb3"  # "Ledger snapshot after Journal rows 206 and 207"
ALIAS_CARDS = {"L-0195": ("ms-c04-041", "ms-c06-021")}


def alias_terms(b):
    text = subprocess.run(["git", "-C", str(ROOT), "show", f"{LEDGER_6B}:content/ledger/malay-ledger.csv"], capture_output=True, text=True, check=True).stdout
    rows = {r["ID"]: r for r in csv.DictReader(io.StringIO(text, newline=""))}
    for lid, cards in ALIAS_CARDS.items():
        for cid in cards:
            b.kv.cell(b.row_of(b.kv, cid), 3).value = rows[lid]["Malay"]


CHAPTERS = {10: ch10, 11: ch11, 12: ch12, 13: ch13, 14: ch14, 15: ch15, 16: ch16, 17: ch17, 18: ch18}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--through", type=int, default=max(CHAPTERS))
    ap.add_argument("--map")
    ap.add_argument("--images", help="write the emoji of the new Dunia cards (for tools/import-overrides.json)")
    a = ap.parse_args()
    b = v5.Bank(a.src, None)
    for n in sorted(CHAPTERS):
        if n <= a.through:
            CHAPTERS[n](b)
    if a.through >= max(CHAPTERS):
        dunia_3e(b)
        alias_terms(b)
    marked = b.mark_seen_twins()
    built = min(a.through, max(CHAPTERS))
    b.wb["README"]["A1"] = (
        "Kata-Kata: Malay Vocab Bank v6 (13 Nov 2026). v5 plus the Stage 2 chapter packs "
        "(tools/make_vocab_bank_v6.py), from the Malay ledger and Cikgu Sensai's Stage 2 plan. "
        f"Built through chapter {built}. All new rows are Claude drafts (the Japanese is for native review)."
    )
    b.wb.save(a.out)
    print(f"wrote {a.out}; 'seen in class' set on {len(marked)} Dunia cards: {marked}")
    if a.images and getattr(b, "images_3e", None):
        Path(a.images).write_text(json.dumps(b.images_3e, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    if a.map:
        Path(a.map).write_text(json.dumps(b.map, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"wrote {a.map}: {len(b.map)} ledger rows")


if __name__ == "__main__":
    sys.exit(main())
