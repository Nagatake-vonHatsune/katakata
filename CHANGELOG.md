# Changelog

## Unreleased

- **Stage 2 begins: chapter 10, ber- verbs (13 Nov 2026), 920 to 958 cards.** Report: [docs/STAGE-2-c10-report.md](docs/STAGE-2-c10-report.md).
  - 41 class cards, one for every chapter 10 ledger row (units 10A routines and 10B background; «pindah» is recognise-only,
    the spoken partner of berpindah). Each ber- card shows its root. Six frames, a scenario (a working day; a new neighbour),
    and a Sedia Kelas list that reviews 13 root words from chapters 1 to 9. Jambatan drops jiran, pindah and sepupu.
  - The affix guard is stage-aware: its rules come from Cikgu Sensai's `stage-rules.json` (copied with its commit), each text is
    checked at its own chapter, and chunk exemptions only count from their own chapter. All 72 shared fixtures pass and agree
    with Cikgu Sensai's Python checker. Stage 2 packs must use only words the ledger places by their chapter.
  - Workbook v6 (`tools/make_vocab_bank_v6.py`), `tools/stage-check.mjs`, `tools/ledger/writeback.py`; the importer takes every
    chapter in the workbook. The ledger snapshot is at L-1266. Hanashishou's starting band still depends on chapters 1 to 9.

- **Clean-up after Cikgu Sensai Stage 1 (12 Nov 2026), 805 to 920 cards.** Report and hand-off:
  [docs/CLEANUP-2026-11-12.md](docs/CLEANUP-2026-11-12.md). One commit per chapter:
  - 105 new class cards from ledger rows L-0983 to L-1088 (Ch1 2, Ch2 23, Ch3 17, Ch4 19, Ch5 6, Ch6 3, Ch7 17, Ch8 5,
    Ch9 13), each with the ledger's Malay, meanings and chapter.
  - Moved: saya and the greeting words (pagi, tengah hari, petang, malam) to Ch1; sedikit / sikit to Ch2. IDs are unchanged
    and the old chapter still reviews them.
  - Removed: Assalamualaikum (faith-specific greetings are not taught), the duplicate depan, pinggan, and the kaki counter.
  - Corrected: "jalan lurus" is now terus / jalan terus / pergi terus / terus depan; frames and scenarios no longer use words
    from later chapters or words that are not in the ledger; whole-word se- and ter- frames in Ch6; formal counters marked;
    register notes (mudah / senang, tapau, oren / jingga, sahaja / saja).
  - New frames: "Kenapa / Mengapa / Apa sebab" (Ch5), "Saya pilih ___" (Ch6).
  - Three more scenario lines no longer use later-chapter words (Ch2 "di sini", Ch3 "Bagus!", Ch8 "Siap!").
  - Scenes: "Rumah terbuka Hari Raya" is now a general "Rumah terbuka" with six festival cards and a note for each;
    new Dunia scene "Salam di pejabat" for Chapter 1; Di klinik says hospital; ママック (Sam's rendering) everywhere.
  - Workbook v5, `tools/make_vocab_bank_v5.py`, `tools/ledger/sheet_to_snapshot.py`, a Dunia `Note` column and
    `sedia_kelas_review` in the importer. The ledger snapshot is at L-1088.

- khabar is read the way Malaysians say it (Sam, 7 Nov 2026): the katakana hint is カバー (Apa khabar? = アパ カバー,
  was アパ ハバル) and the voice is given "kabar". Other kh words now use the カ row too (akhir = アキル, was アヒル).
- menang (to win) joins Main badminton as card 15, after Sam approved it for the affix allow-list (7 Nov 2026):
  it is a root, not me- + nang. Malay ledger row L-0982.

## 0.10.0 (6 November 2026)

- **Points.** Every right answer earns points, with a ⚡ speed bonus and a 🔥 combo multiplier (up to ×2).
  A miss never takes points away; it only resets the combo. Points never change the review schedule.
  The summary shows score, best combo and fastest answer with "New best!" tags; Records keeps personal bests.
  Settings can hide points.
- **Laju!** (⚡ on Home): a 60-second round on words you already know (needs 8). Practice only: it does not
  change the review schedule. The clock pauses when the app is in the background.
- **Colour palettes:** Kancil Green (default), First Sound Cyan, Royal Red Gold and Rebel Blue, each with a light
  and a dark variant; every text/background pair meets WCAG AA (4.5:1). Kancil's accent is a shade darker for
  the same reason.
- **Text size:** S, M, L, XL (the whole app scales).
- New end-to-end test `tests/e2e/fun.cjs` (points, Laju!, palettes, text size).

- Ch4 time frame: "pukul empat kurang suku" (not used in everyday Malay) replaced with "pukul empat suku";
  the Ch4 lunch scenario line now says "pukul satu suku" (Sam's correction).
- Both common spellings taught: emel / e-mel, selsema / selesema, stokin / stoking, krew / kru (Sam's decision,
  recorded in the ledger's Rules tab).
- Five colloquial Dunia scenes (Vocab Bank v4, 64 cards, Claude drafts): Lepak di kedai mamak (tapau, boleh tahan,
  teh tarik...), Sembang di pantri (alamak, mana ada, lama tak jumpa...), Gambar bayi (face words), Main badminton
  (arm and leg words; it also gives Ch6 class prep a Cari Benda round) and Simpulan bahasa harian (14 idioms such
  as kepala batu, panjang tangan, buah tangan, each checked against Kamus Dewan, with a Japanese idiom hook).
- Jambatan no longer repeats a class word written as an alternative ("pintu masuk" is taught in Ch7).
- Malay ledger: rows L-0919 to L-0981 added with `tools/ledger/append_ledger.py`, which keeps existing IDs.

## 0.9.1 (6 November 2026)

- New ⚙️ Settings screen (language, display, sound, reset, about). Records (記録) now holds only stamps,
  progress and the savefile, and says where settings went.
- Change the interface language at any time: a 🌐 button at the top of every screen, including during
  practice (the new language starts from the next question).

## 0.9.0 (6 November 2026), release candidate

- **Hanashishou continuity.** New 話匠へ (To Hanashishou) screen exports a word file that Hanashishou's
  "Bring words from Kata-Kata" screen imports (Hanashishou branch `claude/katakata-bridge`).
  Five Jambatan (bridge) scenes teach Hanashishou's band 1-2 Malay words that Kata-Kata did not have, with
  Hanashishou's own meanings; cards that also appear in Hanashishou carry a 🦁 chip.
- **Same scheduler as Hanashishou.** Switched from FSRS to SM-2 with Hanashishou's exact card state, so
  progress carries over unchanged. Older saves migrate automatically.
- Release checklist: `docs/RELEASE-1.0.md`.

## 0.2.0 (6 November 2026)

- All nine chapters and the ten starter scenes live; four new scenes (Vocab Bank v3).
- Malay interface; language choice on the first screen; `?lang=` links.

## 0.1.0 (6 November 2026)

- Phase 1 MVP: onboarding, Today's practice, Sedia Kelas, Kad Kata, Cari Benda, Susun Ayat, Tanya Cikgu
  with Send to teacher, savefile, stamp card, Teacher Desk. Chapters 1-3 and three scenes.
