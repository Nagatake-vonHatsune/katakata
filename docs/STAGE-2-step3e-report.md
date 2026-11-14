# Stage 2, build step 3e: new ledger rows, «tandatangan», the chapter 10 picture game (14 Nov 2026)

Sam's brief after [step 3d](STAGE-2-step3d-report.md): 37 new ledger rows (L-1273 to L-1309), the «tandatangan» fix, the chapter 10 Cari Benda picture scene, and a docs tidy.
Cards 1121 → **1178** (31 class cards, 20 cards in the new picture scene, 6 practice-pool cards); packs 43 → **45**.
Commits on the session branch: ledger snapshot `00164ef`, pack `8f9640f`, ledger snapshot after the write-back `f9bf5f2`, then docs.
Cikgu Sensai and Hanashishou were not touched (Hanashishou was not even checked out: nothing needed rebuilding, section 6).

## 1. Ledger sync

Sheet read in two parts: **exactly the expected changes**, nothing else.
- L-0530 «tanda tangan» → «tandatangan» (Journal row 191);
- 37 new rows, L-1273 to L-1309 (Journal row 192).

Committed on its own (`00164ef`). The build now starts from that snapshot (`LEDGER_BASELINE`); the earlier chapters rebuilt unchanged.

## 2. Core cards (L-1273 to L-1303, 31 rows)

One class card per row, each **last in the pack its place names**, so no existing card ID moved. `git diff` of c10 to c17 is appended cards only; every old card, frame, scenario line and Sedia Kelas list is identical (checked card by card).

| Pack | New cards | IDs |
|---|---|---|
| c10 | kolam renang, taman, seminggu, penuh | ms-c10-042 to 045 |
| c11 | kepada, sehari, menempah, bukit | ms-c11-044 to 047 |
| c12 | melaporkan, salinan, dihubungi, dibaiki | ms-c12-046 to 049 |
| c13 | sihat, beritahu, ahli farmasi, tinggalkan | ms-c13-026 to 029 |
| c14 | baiklah, begini, ikut, kata, pengumuman, menangguhkan, membatalkan | ms-c14-023 to 029 |
| c15 | kakitangan, bola | ms-c15-022, 023 |
| c16 | tidak apa-apa, masalah, berlaku, pinjam | ms-c16-024 to 027 |
| c17 | balas, minggu depan | ms-c17-025, 026 |

Notes follow Sam's brief: roots and chapters shown (se- + minggu / hari Ch4; meN- + tempah Ch4, the t drops; dihubungi and dibaiki as the di- partners of menghubungi and membaiki; melaporkan = meN- + lapor + -kan; menangguhkan and membatalkan as the standard forms with a doer beside the Ch14 bare tangguhkan / batalkan; pinjam as the everyday root of meminjam, Ch11; pengumuman and salinan as whole words, roots umum and salin named); «baiklah» a word in its own right, written joined; «begini» the standard partner of spoken «macam ni»; «kakitangan» and «beritahu» written joined; «kepada» for a person, «ke» for a place; «sehari» per day against «setiap hari»; «tidak apa-apa» the everyday "I'm fine" after an accident.
Every example sentence in a note passed `tools/stage-check.mjs` at its own chapter (re-run as one batch at the end: no failures; a negative control, «Saya menyapu lantai» at chapter 10, fails as it should).
Tags are the ledger's. No blank tags this time. The pack schema had no tag `di- -i` (L-1283 dihubungi), so it was added to `content/schema/pack.schema.json`.
Sedia Kelas lists are unchanged (the new words are in no frame or scenario line, so the importer adds none); chapter 10's list now also has its picture scene.

## 3. Practice pool (L-1304 to L-1309): where they went and why

menyapu, disemak, disimpan, bersukan, hidup, giliran.

- **No existing place fits.** The "free-practice pool" is the Dunia packs, but the affix guard checks each Dunia pack at the chapter it primes: «bersukan» (ber-, Ch10) and «disimpan» (di-, Ch9) in a Ch6 scene, or «menyapu» (meN-, Ch11) in a Ch10 scene, fail the guard. Putting them into the chapter 10 picture scene would also have failed «menyapu» and does not fit its theme.
- **Smallest option built:** a new Dunia scene **«Kata biasa» (Everyday words)**, world **Latihan (Practice)**, six cards, a picture each (🧹 🔍 🗄️ ⚽ 🌱 🔢), so it also works in Cari Benda. It primes chapter 18, which puts it after every chapter in the learning path and lets the guard allow its forms. A new override key `practice_scenes` keeps it from becoming chapter 18's Sedia Kelas scene (the importer would otherwise pick it).
- Each card shows its root and the chapter where the root or its partner is taught (di- partners of menyemak and menyimpan, Ch11; sukan Ch2; hidupkan Ch12; nombor giliran Dunia Ch3; menyapu shows the s → ny change as in menyimpan and menyemak).
- **Consequence for the ledger (please look):** the guard reads placement only from the place column, so these six rows' place is now «Kata-Kata practice pool (not core); Dunia · Kata biasa (primes Ch18)». To the shared checker that places them at Ch18. If Sam prefers another place, change the cells and tell Kata-Kata; the build and the guard follow the ledger.
- Their cards carry `chapter` 18, so the word library and the teacher view show «Ch18» for them. Honest label: they are not class words. Not changed in the app.

## 4. Chapter 10 Cari Benda picture scene

A Dunia scene **«Hari bekerja dan jiran baru»** (`hari-kerja-jiran`, world Kata Kerja Harian, primes Ch10), built to the Stage 1 pattern: 20 cards, **15 with a picture** (existing scenes have 4 to 11), the ber- verbs of the working-day and new-neighbour scenes plus kolam renang, taman and penuh. Every card is the Dunia twin of a chapter 10 class card (same Malay), so it shares that card's schedule and shows the "seen in class" chip, as in Stage 1; only words placed up to chapter 10 appear (the guard passes it at chapter 10). «penuh» is pictured as 🈵 (満, which Japanese learners know). «kolam renang», «bekerja», «berjalan», «berbual» and «berkumpul» have no picture (a second swimmer, a walker next to a runner and a speech bubble would be confusing in a picture game). It is now chapter 10's Sedia Kelas scene, so Cari Benda rounds appear in its class preparation. Japanese title and setting are drafts.
Tests: `tests/unit/core.test.ts` now expects 22 Dunia scenes and checks the picture scene (chapter, ≥ 10 pictures, the three new words, every card an alias of a class card), the practice pool (six words, last in the path, nobody's Sedia scene) and that «tandatangan» appears and the spaced form does not.

## 5. «tandatangan»

`ms-d-pejabat-pagi-08` is rebuilt: term «tandatangan», note «Written as one word in Malaysian Malay. The verb is menandatangani.» A search of the live content (all packs, workbook v6, docs, tests, source code) finds no spaced «tanda tangan»; it remains only in Sam's ledger note (which says it is the Indonesian spelling) and in the guard test. The frozen earlier workbooks v3 to v5 still hold it (Dunia scenes, cell E52); v5 is the build's input and `tools/make_vocab_bank_v6.py` corrects the card, so they are left as history. The Jambatan card already said «tandatangan».
Cikgu Sensai will add the spaced form to the disallowed forms; Kata-Kata re-pins the rules at the next rules sync.

## 6. Jambatan

Not rebuilt. None of the 37 new words is a Hanashishou deck word in `content/bridge/hanashishou-ms.json` (the map built from Hanashishou `e5e167c`): «melaporkan» is not in the deck (the deck has «kebocoran»), nor «menempah» (the deck has «tempah», which is a Dunia card already). So the importer would drop nothing and the five Jambatan packs are unchanged. This rests on the committed bridge map; Hanashishou itself was not read.

## 7. A shared fixture now disagrees (needs Cikgu Sensai)

`lah-in-answer-key-fails` (R4: a test must not require «lah») uses «Baiklah, saya tunggu.». Since L-1289 «baiklah» is a word in its own right (Sam's design, so it passes before the Ch17 joined -lah rule), the checker no longer reads it as baik + -lah, and the case no longer fails. 76 of 77 agree. The rule files are unedited; `tests/unit/stage-rules.test.ts` records the one case as a known divergence, still asserts that it disagrees (so the entry is removed once the fixture changes), and shows that R4 still stops «Takpelah, saya tunggu.» and «Tidak mengapalah, saya tunggu.». For Cikgu Sensai: change the fixture's example word.

## 8. Ledger and Journal

- **Cells:** 80 changed, all in J (card IDs) and K (place): 17 existing rows (the chapter 10 scene's twins) and the 37 new rows. Whole tab read before and after; `writeback.py verify`: 80 changed, 80 planned, nothing else. The sheet was unchanged between the sync read and the "before" read.
- **Journal rows 193 to 199** (core cards; practice pool; picture-scene twins; «tandatangan»; Jambatan; the fixture, status Open; the write-back), written with `update_values`; rows 191 and 192 (Sam's) not edited. Their Status cells are blank; Sam may want to mark them Done.

## 9. Checks

`npm run check` (typecheck, 54 tests, content check, build), `tests/e2e/smoke.cjs` and `fun.cjs` pass. Build run twice: packs, map and image list byte-identical. Affix guard: 0 flags, 66 derivations; non-blocking Stage 1 findings 7 register, 5 ledger gap (was 7, 1 ledger, 6 gap: the new rows placed some of those words).

## 10. Not verified

- **The picture scene was not looked at on screen.** My attempt at a screenshot walkthrough stalled in the sentence-building step and was dropped; the content tests and the e2e suites cover the data and Cari Benda in general, but I have not seen this board. Please try Sedia Kelas 10 on a phone: 20 objects is more than most boards; the emoji (🧳 🛑 🍳 🏊 🚴 🏃 🤸 🛋️ 🌳 🈵 📦 🏘️ 💍 🎒 🏪) are my choices.
- The Malay example sentences in the new notes and the Japanese scene drafts are mine; the guard checks forms and placement, not naturalness or Kamus Dewan. They go into the end-of-project Kamus Dewan and native reads.

## 11. Questions for Sam

1. Practice pool: is the Ch18 place text in the ledger acceptable (section 3), or should the six rows get another place?
2. Is a Latihan world with chapter 18 on its cards fine, or should the app label practice words differently (teacher view, word library)?
3. The picture scene: keep 20 cards or trim the unpictured ones?
4. Cikgu Sensai: refresh `curriculum/reference/katakata/` (c10 to c18 and the ledger copy), add the disallowed form «tanda tangan», and change the `lah-in-answer-key-fails` fixture word.
