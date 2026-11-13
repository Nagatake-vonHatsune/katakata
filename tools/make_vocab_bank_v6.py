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

# "Ledger snapshot synced from the sheet (Affix tag ber- on L-0779, L-0781, L-0807, L-0916)": the sheet after
# Cikgu Sensai's Stage 2 build steps 1 and 2, with Claude's four ber- tags (Journal row 152), before Kata-Kata
# wrote any chapter 10 card ID. It replaced acff0ca (the same rows without those four tags).
LEDGER_BASELINE = "323b5fc"
v5.LEDGER_BASELINE = LEDGER_BASELINE


import re  # noqa: E402


def kc(b, ch, lid, note, **opt):
    """A class card for ledger row `lid`. If the row also lists Jambatan cards, the class card replaces them: they are
    dropped and the place loses its "Jambatan · …" part (as for jiran, pindah and sepupu in chapter 10)."""
    row = b.ledger[lid]
    drop = [i.strip() for i in row["Kata-Kata (card IDs)"].split(",") if i.strip().startswith("ms-j-")]
    place = re.sub(r";\s*Jambatan · [^;]+", "", row["Kata-Kata place"]) if drop else None
    b.add_kelas(ch, lid, note=note, drop=drop, place=place, **opt)


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
        ("L-0865", "meN- + daki. men- before d. A hobby word: Hujung minggu ini saya mahu mendaki dengan kawan saya.", {"tag": "meN-"}),
        ("L-0792", "meN- + simpan (Dunia, Ch2). The s of simpan drops: menyimpan. The standard form of «simpan».", {"tag": "meN-"}),
        ("L-0819", "meN- + semak (this chapter). The s of semak drops: menyemak.", {"tag": "meN-"}),
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
        ("L-0849", "Formal and written. Everyday speech says «deadline» (below). Tarikh akhir draf itu hari Jumaat.", {"tag": "chunk"}),
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
        ("L-0743", "pasti + -kan: to make sure. The root «pasti» alone has no class card.", {"tag": "-kan"}),
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
        ("L-0789", "meN- + hubungi (hubung + -i). meng- before h. To contact: Kami akan menghubungi juruteknik.", {"tag": "meN- -i"}),
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
        ("L-0871", "perlahan (Ch6) + -kan: to slow down, or to lower the voice or the volume. Tolong perlahankan muzik itu.", {"tag": "-kan"}),
        ("L-0698", "To replace, or to stand in for someone. The root of gantikan.", {}),
    ]
    for lid, note, opt in cards:
        kc(b, 12, lid, note, **opt)

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
        ("Pejabat pengurusan", "Baik. Juruteknik akan membaiki paip itu. Saya isi borang aduan sekarang.",
         "Okay. The technician will repair the pipe. I'm filling in the complaint form now."),
        ("Tanaka", "Terima kasih. Saya tunggu di rumah.", "Thank you. I'll wait at home."),
    ]
    for i, (speaker, ms, en) in enumerate(lines, 1):
        b.ks.append([f"ms-c12-s{i:02d}", 12, title, speaker, ms, en])


CHAPTERS = {10: ch10, 11: ch11, 12: ch12}


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
