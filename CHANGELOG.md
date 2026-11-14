# Changelog

## Unreleased

- **Nombor & Masa: a standalone mode for numbers, days, months and dates, fractions, decimals and percent, money and time (15 Nov 2026).** Report: [docs/NOMBOR-MASA-report.md](docs/NOMBOR-MASA-report.md).
  - On the home screen (🔢), open from day one, practice only (the review schedule never changes). Six parts, each with an explorer (roll the numbers, tap the week, turn the calendar, fraction pies, price tags, a clock with draggable hands and a spin), a chart, two draft memory hooks (en and ja) and an 8-question round: read (pick the Malay), pick (read the Malay, pick the number, clock, date, day or price) and build (from word blocks, in numbers and money).
  - Standard first, spoken marked (Sam, 15 Nov 2026): RM4.50 «empat ringgit lima puluh sen», spoken «empat ringgit setengah»; 3:30 pm «pukul tiga setengah petang» or «pukul tiga tiga puluh petang». 0 is «kosong» (everyday) and «sifar» (formal); phone numbers digit by digit; «haribulan» shown as a date variant. No 24-hour reading, no «jam» for the clock time; «kurang suku» left out (no source checked yet).
  - Distractors target belas / puluh, se- / satu, suku / setengah, petang / malam (and RM4.50 / RM4.05, 2.5 / 25, digit order, place value).
  - Three charts: number blocks, the clock with the (proposed) parts of the day, a calendar strip; each opens from its part and from every question's feedback.
  - Tests: 80 unit tests (every number 0 to 1,000,000 by rule and read back, every 5 minutes of the day, money, fractions, dates, 5,280 generated questions, the shared Indonesian-form check plus the mode's own list) and `tests/e2e/nombor.cjs` (plays all six parts; screenshots in `docs/nombor-masa/`).

- **Stage 2 step 6c-2: the new shared rules, the bridge exemption removed, the step 6b follow-ups (15 Nov 2026), 46 to 48 packs, 1441 cards.** Report: [docs/STAGE-2-step6c2-report.md](docs/STAGE-2-step6c2-report.md).
  - Rules re-pinned to Cikgu Sensai `909596e` (95 fixtures; the guard runs `expect_gaps` and `expect_no_gaps`; all 95 agree, 0 guard flags). `tools/stage-rules.mjs` follows the shared rule: a placed row is checked whole from its own chapter, a row with no chapter is never a root and counts as no row in a chaptered unit, practice-pool rows keep «primes Ch18». The step 6b bridge-batch exemption is removed.
  - Ledger: L-0195 and L-1303 Action cells synced; «In both» = Yes for the 264 Jambatan rows (264 cells); 118 places for the split Social cards (382 cells in all, verified); Journal rows 219 to 224.
  - Jambatan: the «Cara bermain» scene and the five older cards kept. The Social scene (118 cards) is three scenes by topic: Berbual dan menerangkan 45, Acara dan keluar 46, Perasaan dan pendapat 27; no card ID changed.
  - `tests/e2e/bridge.cjs` run against Hanashishou main (`4be57ac`, built from a scratch copy): passes.

- **Stage 2 step 6b: the Hanashishou bridge batch, Jambatan rebuilt, band 1 suggestion (14 Nov 2026), 1177 to 1441 cards, 45 to 46 packs.** Report: [docs/STAGE-2-step6b-report.md](docs/STAGE-2-step6b-report.md).
  - Ledger: 184 bridge rows written (L-1310 to L-1493, rows 1311 to 1494; all 3,680 cells read back); card IDs and places written for 264 rows (528 cells, verified); L-0592's Hanashishou cells moved to L-0330; Journal rows 209 to 217, row 208 Done.
  - Jambatan rebuilt from Hanashishou `4be57ac`: 346 cards (social 118, daily-life 89, office 64, home-condo 42, health 31, and a new «Cara bermain» scene with 2). A card for every ledger row a tagged scene meets first: 184 new rows, 80 group (a) rows, 77 rows that already had a card (IDs kept); five older cards kept. Spoken forms name their standard partner; notes name the scenes.
  - Class cards `ms-c04-041` and `ms-c06-021` show «baru / baharu» (L-0195).
  - A card with slash alternatives matches Hanashishou one alternative at a time, as a whole word (`hanashishouForms`); the export sends each matching alternative. «pintu masuk / pintu keluar» now joins «pintu masuk»; no other card changes.
  - Hanashishou suggestion: band 1 after Stage 1 and after Stage 2 (was band 2 once chapters 1 to 9 were ready); text changed in en, ja and ms.
  - The checker skips unplaced bridge-batch rows (otherwise «biasanya», «akhirnya» and «terlalu» fail); not in Cikgu Sensai's checker, see the report.

- **Stage 2 step 3f: rules sync and one card removed (14 Nov 2026), 1178 to 1177 cards.** Report: [docs/STAGE-2-step3f-report.md](docs/STAGE-2-step3f-report.md).
  - Ledger sync: exactly L-1303 «minggu depan» Retired and L-0530 Action «KD4 check». Card `ms-c17-026` dropped (last card of c17, no ID moved, in no Sedia Kelas list); L-1303's J and K cleared (2 cells, verified); Journal rows 202 to 205.
  - Rules re-pinned to Cikgu Sensai `4f2391b` (81 fixtures); «tanda tangan» is a disallowed form. `tools/stage-rules.mjs` matches two-word disallowed forms as Cikgu Sensai's checker does. All 81 fixtures agree; the step 3e known-divergence exemption is removed.

- **Stage 2 step 3e: new ledger rows, «tandatangan», the chapter 10 picture game (14 Nov 2026), 1121 to 1178 cards, 43 to 45 packs.** Report: [docs/STAGE-2-step3e-report.md](docs/STAGE-2-step3e-report.md).
  - Ledger sync: exactly L-0530 «tandatangan» and 37 new rows (L-1273 to L-1309). 31 class cards (L-1273 to L-1303), each last in its pack
    (c10 4, c11 4, c12 4, c13 4, c14 7, c15 2, c16 4, c17 2); no earlier card ID, frame or scenario line changed. Each shows its root and chapter;
    every example passes `tools/stage-check.mjs` at its chapter. The pack schema accepts the tag `di- -i`.
  - Practice pool (L-1304 to L-1309: menyapu, disemak, disimpan, bersukan, hidup, giliran): a new Dunia scene «Kata biasa» (world Latihan),
    six cards with pictures, primes Ch18 so it comes last in the path and the affix guard allows its forms; override key `practice_scenes`
    keeps it from being chapter 18's Sedia Kelas scene. Their ledger place now names Ch18 (Sam to confirm).
  - Chapter 10 Cari Benda picture scene «Hari bekerja dan jiran baru» (20 cards, 15 pictures; kolam renang, taman, penuh), chapter 10's
    Sedia Kelas scene. Its cards are Dunia twins of the class cards.
  - «tandatangan» in the Dunia card `ms-d-pejabat-pagi-08`. Jambatan not rebuilt: no new row is a Hanashishou deck word.
  - Ledger: 80 cells written and verified (J and K of 54 rows); Journal rows 193 to 199. Ledger baseline for the build: `00164ef`.
  - Shared fixture `lah-in-answer-key-fails` no longer fails because L-1289 «baiklah» is its own word; recorded as a known divergence in the tests
    (76 of 77 agree); the rule files are unedited. For Cikgu Sensai to change the fixture word.

- **Stage 2 step 3d: chapters 13 to 18 finished (13 Nov 2026), 1116 to 1121 cards.** Report: [docs/STAGE-2-step3d-report.md](docs/STAGE-2-step3d-report.md).
  - Six new class cards, each last in its pack: L-1268 mendaftar (c13), L-1269 tangguhkan and L-1270 batalkan (c14), L-1271 memakai and
    L-1272 berwarna (c15), L-0690 «tak tahan» (c17, "Spoken:", after «tidak boleh tahan»). Jambatan card `ms-j-office-14` dropped.
  - Nine held-back lines now use the new forms (c14 3, c15 3, c17 1, c18 2); none failed the check. Japanese drafts updated for c15 f04 and c18 f04.
  - Rules copied from Cikgu Sensai `a24a993` (R3 pair «tak tahan» → «tidak boleh tahan»); all 77 shared fixtures agree (test count 72 → 77).
  - Ledger: 7 cells written and verified (J691:K691, J1269:J1273); Journal rows 185 to 189.
  - After Sam's review (`7fbe173`, 13 Nov): the c14 batalkan line ends at «kafe.» (no «Itu keputusan kita.»: «keputusan» sounds like a ruling in
    casual speech; naturalness note in HANDOFF), and the root cards tangguh and batal are back in the c14 Sedia Kelas list. Journal row 190.

- **Stage 2 step 3c: Malay fixes to chapters 12 to 18 (13 Nov 2026), 1115 to 1116 cards.** Report: [docs/STAGE-2-step3c-report.md](docs/STAGE-2-step3c-report.md).
  - 18 lines changed after Sam's review (c12 1, c13 3, c15 3, c16 2, c17 6, c18 3), each checked with `tools/stage-check.mjs` first:
    «Borang ini wajib diisi», «Sudikah encik datang?», «Seperti ini?» / «Ya, seperti itu, tetapi ada zip.», «Takpelah», Tanaka's refusal
    with «tidak boleh tahan pedas» and others. New standard card L-1267 «tidak boleh tahan» (ledger cell J1268, Journal rows 179 to 183).
  - Seven lines keep their old wording because the new form has no ledger row (memakai, berwarna, tangguhkan, batalkan, mendaftar);
    L-0690 «tak tahan» is still not built because the shared register pair wants «tidak tahan». Questions in the report.
  - The checker reads written «-lah» («takpelah») from chapter 17 (Kata-Kata only); `fun.cjs` is deterministic (seeded `Math.random`).
  - The ledger snapshot now includes Sam's 16 Affix tags; cards follow them (c16 ter- cards).

- **Stage 2 chapters 11 to 18 (13 Nov 2026), 958 to 1115 cards.** Report: [docs/STAGE-2-c11-c18-report.md](docs/STAGE-2-c11-c18-report.md).
  One commit per chapter, each with the ledger write-back (235 cells of card IDs and places, verified by a full read-back) and
  Journal rows 153 to 175.
  - 196 new class cards, one for every ledger row of the chapter (c11 meN- 43, c12 -kan and -i 45, c13 health 24, c14 connectors
    20, c15 yang 19, c16 accidental ter- 23, c17 spoken Malay and invitations 22). Each affixed card shows its root and the chapter
    that teaches it, nasal spellings (c11), the di- partner (c11), whole words (pe-, ke-an, per-an) and the contrast between
    accident ter- and the Chapter 6 superlatives (c16). Spoken forms are marked "Spoken:" and come after their standard form;
    «kan», «lah» and «takpe / tak apa» are recognise-only. 39 Jambatan cards became class cards.
  - Every chapter has six frames, a scenario and a Sedia Kelas list with review cards from earlier chapters. Chapter 18 is the
    Stage 2 review: no new words, six frames, a 22-line working-week scenario and 20 review cards from chapters 10 to 17.
  - L-0690 «tak tahan» is not built: the ledger has no «tidak tahan» row, so the standard form cannot be taught first.
  - Chapter 15 now teaches «seperti itu» (the standard form of the Chapter 17 «macam tu»).
  - The importer builds a chapter without vocabulary rows, the pack schema allows `cards: []`, `check-content` accepts an empty
    Kelas pack only when it is a review chapter. New: `tools/ledger/join_reads.py`, `tools/ledger/wbcalls.py`.

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
