# Build B1: Sam's answers to the Build A questions, and ⚡ for chapters 1 to 3 and 5 to 9 (report)

**17 Nov 2026 · Claude.** Brief: Sam's Build B1 message of 17 Nov 2026 (parts 1 and 2). Read first: [HANDOFF.md](HANDOFF.md),
[BUILD-A-report.md](BUILD-A-report.md), [STRETCH-STAGE-design.md](STRETCH-STAGE-design.md), [VOCAB-PLACEMENT-proposal-report.md](VOCAB-PLACEMENT-proposal-report.md)
and the proposal CSV. `main` had not moved (63339ab), so nothing needed rebasing; every push was preceded by a fetch and rebase.

## Summary

- **Sam's six answers are applied.** The dialogue 🔥 now needs 60 % right on the first try in one play-through (also required for ⚡ done). Chapters with every 🔥 lit and no pack show a greyed "⚡ soon". Rebel's ⚡ is gold, AA-checked. The ⚡ 4 line now reads «Wah, seronoknya! Cuti di mana?», and «percutian» is labelled formal/written. The guard does **not** flag «seronoknya»: it reads it as seronok + -nya.
- **Eight new ⚡ packs (1, 2, 3, 5, 6, 7, 8, 9):** 149 extension cards, 46 frames with decoys, 110 dialogue lines with 39 reply steps. Cari Benda ⚡ (new in the engine) is in ⚡ 5, 6, 7 and 8. The guard is at **0 flags** for every ⚡ pack.
- **Ledger:** 131 rows inserted (L-1506 to L-1636) and 36 cells of 18 promoted Jambatan rows changed. The whole tab was read before and after; `verify` is OK. Journal rows 231 to 240 are Open.
- **One proposal word is held back:** «pasar raya» (Ch7). The shared checker reads «pasar» as a proper noun, so «raya» is a ledger gap; this is proposal section 8. It has no row and no card yet.
- **Jambatan: 339 → 321 cards.** Unit tests 185 → 196 and all pass; all four e2e suites pass (stretch 28 → 62 checks).

## 1. Final main hash and commits

| Commit | What |
| --- | --- |
| `6116760` | Answers 2, 4, 5: the 60 % dialogue rule, "⚡ soon", Rebel gold; card `note_ja` and the 'formal' register label |
| `25c216c` | Answer 6: ⚡ 4 line 10 and «percutian» |
| `72eb828` | Screenshots for part 1 |
| `6f55641` | ⚡ 1 |
| `42fd661` | ⚡ 2 |
| `56bea39` | Moved-cards unit test made general. The ⚡ 2 commit had gone out with this one test failing: my command chain did not stop on the test result. Fixed in the next commit; every later commit ran only after the tests passed. |
| `786b0f8` | ⚡ 3 |
| `437bb94` | ⚡ 5 and the Cari Benda ⚡ engine |
| `e479c6b` | ⚡ 6 |
| `70f1867` | ⚡ 7 («pasar raya» held back; `stretch_batch.py plan --skip`) |
| `e318c3c` | ⚡ 8 |
| `210a115` | ⚡ 9 |
| `e953589` | The sheet write (plan `tools/ledger/batches/b1-plan.json`), screenshots |
| `eaaa938` | Two Malay fixes found while writing this report (section 6) |
| this report | Report, HANDOFF, CHANGELOG, README |

**Final `main`:** the commit that adds this report (the one before it is `eaaa938`). I committed straight to `main` as the brief asked, and the session branch `claude/jolly-gauss-v3l0lz` was pushed to the same commit after part 1.

## 2. What changed, per answer

1. **No free dialogue 🔥.** Kept as built: a flame lights from a stamp or a met condition only.
2. **The dialogue 🔥 needs a satisfactory score.**
   - What counts: a **full play-through**, meaning the chapter dialogue, or the whole ⚡ dialogue from the ⚡ screen. A ⚡ run's three replies do not count.
   - Scoring: the first try of each reply step is counted. «わからない» is wrong. A missed line comes back later in the session, but that retry does not count.
   - Pass mark: `dialogueNeeded(n) = ceil(3n / 5)`, so 3 of 5, 2 of 3, 6 of 10, 13 of 21.
   - Storage: a small per-dialogue record, `state.dialogues['c04' | 'x04'] = {best, total, plays, last}`. `migrate()` fills it, `schemaVersion` stays 1, and a savefile merge keeps the best score.
   - The checkpoint: the dialogue segment of the 🔥 bar now has *needed* items, and its fill is the best score. The 'dialogue' stamp is awarded when the best score passes, and stamps already earned keep their flames lit.
   - ⚡ done (the 'stretch' stamp) now also needs the ⚡ dialogue at 60 %.
   - On screen: the reply step shows the running score, e.g. «1/5・合格に3問» (en "1/5 · 3 needed", ms "1/5 · perlu 3"). The summary shows a "Dialogue score" card («6/10・合格に6問»), whether it passed, and the best score if it was higher. The Sedia status line and the chapter screen show "Dialogue best 4/10 · 6 needed".
3. **⏱️:** no change.
4. **Rebel gold.**

   | Theme | `--stretch` | `--stretch-ink` | `--stretch-soft` | text on surface | on bg | on soft | bar on track | ink on fill |
   | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
   | rebel-light | `#876200` | `#ffffff` | `#fbf0cc` | 5.56 | 5.06 | 4.88 | 4.50 | 5.56 |
   | rebel-dark | `#f2c04a` | `#241800` | `#3a2c0b` | 10.5 | 11.4 | 8.0 | 9.4 | 10.3 |

   - Only the Rebel values changed; kancil, cyan and royal stay blue.
   - The contrast unit test checks the new values against all five bars in Sam's list. It also checks that Rebel's hue is gold (35° to 55°), that the other palettes stay blue, and that the `prefers-color-scheme` values match `data-theme`.
   - No names in the code or comments: the CSS comment says "gold".
   - The Start ⚡ button is still outlined (not filled) in Rebel, as built.
5. **"⚡ soon".**
   - A chapter with every 🔥 lit and no ⚡ pack shows a `<span>` in place of the chip, so there is nothing to tap.
   - It has `aria-disabled="true"` and an `aria-label` ("Chapter 10 ⚡: not ready yet, coming soon"), with the i18n drafts en «⚡ soon», ja «⚡ 準備中», ms «⚡ akan datang».
   - It uses greyed tokens (`--muted` on `--neutral-soft`, dashed border). Its text passes 4.5 in all 8 themes; the lowest is 4.65, kancil light, and the unit test checks this too.
   - It appears on the Sedia list and the chapter screen. After this build it applies to chapters 10 to 18; chapter 18 is included because the rule says "a chapter" (question 3).
6. **⚡ 4 dialogue.**
   - Line `ms-x04-d10` is now «Wah, seronoknya! Cuti di mana?» (en "Wow, how nice! Where are you going on holiday?"). Its wrong replies are «Wah, seronoknya! Mesyuarat di mana?» and «Wah, seronoknya! Puan selalu datang lambat.».
   - «Bawa payung, Puan!» stays.
   - Card `ms-x04-016` «percutian» now carries a "formal / written" chip. Its note, in en and ja, says speech uses «cuti» («cuti tahunan», «pergi bercuti»).
   - **The guard did not flag «seronoknya»:** it counts it as a -nya derivation of «seronok» (Ch4), and derivations checked went from 11 to 12.
   - The ledger row L-1502 is unchanged (Journal row 240 asks whether it should get a register note).

## 3. Per chapter

| ⚡ | Scene | Extension cards (new + promoted) | Frames | Lines | Reply steps | Cari Benda ⚡ |
| --- | --- | --- | ---: | ---: | ---: | --- |
| 1 | A day at the office | 1 (1 + 0): saudari | 5 | 12 | 5 | no (no drawable extension noun) |
| 2 | Meeting Puan Siti | 9 (7 + mana, kenal) | 5 | 14 | 5 | no: only «pencetak», «kanak-kanak» and «ayah»/«bapa» (one picture) can be drawn |
| 3 | At the post office | 22 (19 + cuma, beberapa, percuma) | 6 | 14 | 5 | no: only «penimbang» clearly |
| 5 | Durian night (a mamak stall) | 31 (25 + salah, tentang, nampak, cara, bunyi, tanpa) | 6 | 14 | 5 | yes: «Lepak di kedai mamak», 8 drawn (susu, cendawan, gula-gula, kacang, lemon, madu, mee, nanas) |
| 6 | The futsal match | 20 (17 + pasukan, betul-betul, selama) | 6 | 14 | 4 | yes: «Main badminton», 5 drawn (catur, futsal, lumba, markah, permainan) |
| 7 | Arriving at the airport | 31 (30 + tunjuk) | 6 | 14 | 5 | yes: «Lintas jalan», 5 drawn (bagasi, polis, perhentian bas, pawagam, bandar) |
| 8 | A gift for the family | 17 (15 + seorang, sendiri) | 6 | 14 | 5 | yes: «Beli baju», 5 drawn (jaket, hadiah, mainan, stik, gelas) |
| 9 | The residents' festival | 18 (17 + terima) | 6 | 14 | 5 | no: fewer than four clearly drawable («hiasan», «persembahan», maybe «pentas») |
| | **All** | **149 (131 + 18)** | **46** | **110** | **39** | 4 packs |

- **Cari Benda ⚡ (engine).**
  - A ⚡ source may name its picture scene and drawn core objects (`cari`); the extension cards get emoji.
  - A ⚡ run then ends with three rounds. Each asks for an extension object the learner has met, on a board of six: the target, up to two other extension objects, and core objects from the scene.
  - Covered by unit tests, and in the e2e for each pack that has it.
  - The emoji are my choices. «sate» has none: 🍢 reads as oden to a Japanese learner.
- **Not used in a frame or line** (card only; some appear as decoys, wrong replies or on the Cari board):
  - ⚡ 3: beberapa, nilai, bilangan, juruwang, kod, pegawai
  - ⚡ 5: bunyi, susu, gula-gula, halia, kecewa, nanas, snek, tauhu, terang
  - ⚡ 6: papan, permainan, lumba
  - ⚡ 7: tunjuk, petak, brek, cepat-cepat, pas, pekan, pusing, sekeliling
  - ⚡ 8: gelas, majalah, stik
  - ⚡ 9: kenduri, sekat
- **Malay rules followed.**
  - Standard forms only: there are no spoken forms in any ⚡ line. «kurang sedikit» is used, not «kurang sikit», and «Tekak saya sakit», because the chunk «sakit tekak» is placed at Ch13.
  - Malaysian forms only.
  - «dari» for places and times; «daripada» in comparisons and with people and organisations. Two frames use «dari»/«daripada» as each other's decoy.
  - «kita» for the speaker's own team or the neighbours together; «kami» for the organisers' notice.
  - No faith-specific greetings: ⚡ 9 is a residents' festival, not Hari Raya.
  - Affix gates: no ber-, meN-, -kan or -i before chapter 10. di- appears in ⚡ 9 only, with chapter 9 roots («ditutup», «dibuka», «dijemput», «dilarang»).
  - Each pack uses only core words placed up to N plus its own extension words. No ledger row was invented; where a word had no row or was placed later, the line was rewritten (for example «ke», «mahu», «hari» and «tetapi» at chapter 3, «hati» at chapter 5, «singgah» at chapter 7, «balut» at chapter 8).
- **Chapter 1** is review-heavy, as asked. «hai» and «helo» are not added (question 1).

## 4. Ledger

Sheet `1X8t3ENRVUY_NHJ3xEB7UY3OiwwUg_KUZT-ESbtiMC0o`, tab Ledger (sheet ID 1). One batch for all eight chapters:

1. **Before read** (A1:T600 and A601:T1506). It was identical to the 63339ab snapshot (0 cells differed), and all 36 planned "before" values matched.
2. **`insert_dimension`** rows 0-based 1506 to 1637 (sheet rows 1507 to 1637), inheriting from the row above. Then **`update_values`** `Ledger!A1507:T1637` in four chunks (32 + 36 + 31 + 32 rows). `append_values` was not used.
   - New rows: place «ChN (extension)», Origin «Kata-Kata placement batch 2 (Sam approved 15 Nov)», Draft, «KD4 check», «Not yet checked», 2026-11-17, «Claude (Sam approved)».
   - In both = Yes and column N = the English meaning for every row that is in Hanashishou's metfirst list; the 3 rows that are not (bau, beza, perhentian bas) have both blank.
3. **J:K of the 18 promoted rows**, in 13 `update_values` calls: their Jambatan card IDs became ⚡ IDs and their place became «ChN (extension)».
4. **After read** (A1:T600 and A601:T1700), then `stretch_batch.py verify before after b1-plan.json`: **"36 changed cells in existing rows (36 planned), 131 new rows: OK"**; sheet row N holds L-(N−1) throughout.
5. **Snapshot:** `sheet_to_snapshot.py` on the after read gives a file byte-identical to the snapshot committed with the packs (L-0001 to L-1636), so no separate snapshot commit was needed.

| Rows | Chapter |
| --- | --- |
| L-1506 | Ch1 (1 new) |
| L-1507 to L-1513; promoted L-1330 mana, L-1392 kenal | Ch2 |
| L-1514 to L-1532; promoted L-1325 cuma, L-1343 beberapa, L-1465 percuma | Ch3 |
| L-1533 to L-1557; promoted L-1319 salah, L-1323 tentang, L-1327 nampak, L-1332 cara, L-1344 bunyi, L-1364 tanpa | Ch5 |
| L-1558 to L-1574; promoted L-1333 pasukan, L-1337 betul-betul, L-1363 selama | Ch6 |
| L-1575 to L-1604; promoted L-1336 tunjuk | Ch7 |
| L-1605 to L-1619; promoted L-1335 seorang, L-1339 sendiri | Ch8 |
| L-1620 to L-1636; promoted L-1349 terima | Ch9 |

- **Promoted cards:** the 18 old Jambatan IDs are in `RETIRED_IDS` (`tools/import_hanashishou_bridge.py`) and `MOVED_CARDS` (`src/core/state.ts`, 25 entries with ⚡ 4's).
- **Journal rows 231 to 240**, written with `update_values` and read back, all **Open**:
  - rows 231 to 238: one per chapter (new and promoted rows);
  - row 239: «pasar raya» held back;
  - row 240: the «percutian» label (card only).

## 5. Jambatan

`python3 -I tools/import_hanashishou_bridge.py ../hanashishou` (Hanashishou at `4be57ac`, read only) gives **321 cards** (339 before):

| Scene | Cards |
| --- | ---: |
| Daily life | 84 |
| At work | 59 |
| Social: Talking and explaining | 35 |
| Social: Events and outings | 45 |
| Social: Feelings and opinions | 25 |
| Home and condo | 40 |
| Health | 31 |
| How to play | 2 |

A second run on the final snapshot is identical. Only the 18 promoted cards left Jambatan.

## 6. Test counts

| | Before (63339ab) | After |
| --- | --- | --- |
| content / build | 49 packs, 1453 cards; guard 0 flags, 11 derivations; 7 register and 5 ledger-gap findings (Stage 1, not blocking) | 57 packs, 1584 cards; guard **0 flags**, 20 derivations; 7 register, 5 ledger gap (unchanged) |
| `npm test` | 185 tests, 5 files | 196 tests, 5 files |
| `tests/e2e/smoke.cjs` | passes | passes |
| `tests/e2e/fun.cjs` | 11 checks | 11 checks |
| `tests/e2e/nombor.cjs` | 16 checks | 16 checks |
| `tests/e2e/stretch.cjs` | 28 checks | 62 checks |

New unit tests cover:

- the 60 % rule: needed counts; lit at 3/5, not at 2/5; the best score kept; a stamp keeps the flame lit; the ⚡ dialogue on its own key;
- ⚡ done needing the ⚡ dialogue at 60 %;
- "⚡ soon" (when it shows, and the i18n strings);
- the Rebel gold contrast and hue, and "⚡ soon" contrast in every theme;
- migrate and merge of `dialogues`;
- every ⚡ pack's shape;
- every moved card;
- Cari Benda ⚡ boards.

The e2e covers:

- **the chapter 2 dialogue at 4/10 (40 %): the 🔥 stays out and no stamp is given; at 6/10 (60 %) it lights and is stamped;**
- the summary's «4/10・合格に6問» and «6/10・合格に6問»;
- "⚡ soon" is a non-button with an aria-label, and tapping it opens nothing;
- every ⚡ screen opens;
- three Cari Benda rounds on six objects in ⚡ 5 to 8.

`tests/e2e/bridge.cjs` was not run (it needs Hanashishou served on port 4179).

**Two Malay fixes after the ⚡ 6 and ⚡ 9 commits** (`eaaa938`): «sebanyak» counts things and money («seramai» is the word for people), so the ⚡ 6 frame now reads «Kami bayar sebanyak tiga ratus ringgit untuk gelanggang itu.». «Malam Sabtu» usually means Friday night, so the ⚡ 9 narrator line now reads «Sabtu, pukul tujuh malam.».

## 7. Screenshots

`docs/stretch-stage/`, phone width (Pixel 7), in kancil light/dark and rebel light/dark unless noted:

| File | Screen |
| --- | --- |
| `01-sedia-list-*`, `02-chip-*` | Sedia list and the «4 ⚡» chip (gold in Rebel) |
| `09-sedia-soon-*`, `09-soon-row-*` | **a gold Rebel «9 ⚡» chip above chapter 10's greyed «⚡ 準備中»** (`09-sedia-soon-rebel-light.png`) |
| `10-reply-score-*` | **a reply step with its score** («1/5・合格に3問») |
| `11-dialogue-score-*` | the summary's dialogue score card |
| `03` to `08` | ⚡ screen, decoy frame, reply step, summary, Home, Rekod (as in Build A, retaken) |
| `x01-screen-kancil-light` … `x09-screen-kancil-light` | each ⚡ screen (full page) |
| `x05-cari-…`, `x06-cari-…`, `x07-cari-…`, `x08-cari-…` | a Cari Benda ⚡ board of six |

## 8. Malay lines for Sam's read

Every line is mine and unchecked by a native speaker. These are the ones I am least sure of:

- **⚡ 1**
  - «Baik. Apa khabar, saudari?»
  - «Terima kasih, saudari. Jaga diri.» (Encik Rahman to Cik Mei Ling: is «saudari» natural in office talk, or only in speeches and letters?)
  - «Selamat malam, Pak cik. Jaga diri, ya!»
- **⚡ 2**
  - «Saya ajar kanak-kanak bahasa Inggeris.» (bare «ajar» with two objects)
  - «Encik orang mana?»
  - «Puan pun kerja di syarikat ini?» («kerja» as the verb, before «bekerja» in Ch10)
- **⚡ 3**
  - «Nombor giliran 25?», «Pos udara, Encik?», «Berapa kosnya?», «Bayar tunai, Encik?»
  - «Poskod Jepun tujuh digit. Betul?»
  - «Penimbang di kaunter itu tidak betul.» («tepat» would be better but has no row)
  - «Pelajar itu jawab soalan satu-satu.»
- **⚡ 5**
  - «Saya takut baunya.», «Baunya tidak sedap»
  - «Puas makan, Encik?» / «Puas!»
  - «Saya teh tarik, kurang manis tetapi pekat.»
  - «Encik pandai makan durian! Saya bangga.»
  - satay at a mamak stall
  - «Kami tunggu kira-kira dua puluh minit di mamak itu.»
- **⚡ 6**
  - the scores «lima kosong», «tiga dua»
  - «Kita lawan siapa?»
  - «Anak saya main catur sebaik gurunya.»
  - «Kami bayar sebanyak tiga ratus ringgit untuk gelanggang itu.»
  - «Beza skor satu sahaja»
- **⚡ 7**
  - «Penerbangan saya tiba pukul lapan malam, di Terminal 1.»
  - «Tengok kiri!»
  - «Jalan sesak malam ini?»
  - «Bas ekspres itu secepat kereta api.»
- **⚡ 8**
  - «Sehelai jaket?» (helai for a jacket)
  - «Di Jepun sekarang sejuk, bukan?»
  - **«Tolong bungkus, ya. Ini hadiah.»** (gift-wrapping is usually «balut», which has no ledger row)
  - «Sayur ini dua ringgit satu ikat.»
  - «Kita minum secawan kopi dulu?»
- **⚡ 9**
  - «Semua penduduk dijemput.»
  - «Hiasan di pentas itu buatan tangan penduduk.»
  - «Jalan ini ditutup mulai pukul enam petang, Sabtu ini.»
- **Wrong replies** are meant to be clearly wrong in meaning, and some are playful («Secawan jaket?», «Kita minum sepasang kopi dulu?» in ⚡ 8; «Poskod Jepun tujuh kilogram» in ⚡ 3). Say if you prefer subtler ones.
- **Japanese:** all of it is draft, including the new i18n strings («5問中3問を1回目で正解すると合格», «⚡ 準備中»).

## 9. Questions for Sam

1. **«hai» and «helo»** (proposal question 6): add them as ⚡ 1 words? They are not added; ⚡ 1 has only «saudari».
2. **«pasar raya»** (Ch7): the shared checker treats «pasar» as a proper noun («Pasar Seni»), so the word cannot pass. Ask Cikgu Sensai for the checker fix (proposal section 8), then add L-1637 «pasar raya» to ⚡ 7? It has no row and no card yet (Journal row 239).
3. **"⚡ soon" on chapter 18:** it shows there too once both flames are lit, because the rule says "a chapter". Chapter 18 has no extension words. Hide it there?
4. **Proposal defaults followed** (section 10, not settled by the brief):
   - question 4: «bilangan», «pertandingan», «perpustakaan», «persembahan», «hiasan» and «kesulitan» are placed as whole words;
   - question 9: the 18 promoted rows leave Jambatan, and their progress carries over through `MOVED_CARDS`.

   Confirm both.
5. **«percutian» in the ledger:** the card is labelled formal/written; should L-1502 get a register note too (Journal row 240)?
6. **«kesulitan» and «mulai»** carry the same "formal / written" chip as «percutian» and «saudari». Fine?
7. **Cari Benda ⚡ emoji** are my choices; ⚡ 2, 3 and 9 have none (fewer than four drawable extension nouns). Agree?

## 10. Not done, and for the other repos

- **Not done here:**
  - KD4 for the 131 new rows;
  - the native reads (section 8);
  - Laju! ⚡ and branching dialogue (optional);
  - ⚡ 10 to 17 (Build B2).
- **Hanashishou:** its audit should read extension rows like practice-pool rows, and its prep list loses the 18 promoted words.
- **Cikgu Sensai:**
  - refresh `curriculum/reference/katakata/` (ledger to L-1636, the ⚡ packs);
  - the «pasar» proper-noun fix.
