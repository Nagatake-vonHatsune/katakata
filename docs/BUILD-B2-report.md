# Build B2: the rules of 17 Nov, Sam's fixes to the B1 packs, and ⚡ for chapters 10 to 18 (report)

**17 Nov 2026 · Claude.** Brief: Sam's Build B2 message of 17 Nov 2026. Read first: [HANDOFF.md](HANDOFF.md), [BUILD-A-report.md](BUILD-A-report.md),
[BUILD-B1-report.md](BUILD-B1-report.md), [STRETCH-STAGE-design.md](STRETCH-STAGE-design.md),
[VOCAB-PLACEMENT-proposal-report.md](VOCAB-PLACEMENT-proposal-report.md) and the proposal CSV. `main` was at `d9d9f48` and did not move during the
session (every push was preceded by a fetch and rebase; none had anything to rebase).

## Summary

- **Rules:** copied from Cikgu Sensai rules commit `7e436f3` (174 fixtures) with its `.mjs` patch from `d612d1d`. **All 174 fixtures agree.** The guard
  gives exactly the same entries before and after: 0 flags; the 7 register and 5 ledger-gap Stage 1 findings that do not block.
- **Sam's fixes are in** (⚡ 1, 3, 5, 7, 8). The «saudari» Journal row 242 is closed (Journal row 256).
- **⚡ 10 to 17 are built:** 193 extension cards (175 new rows, 18 promoted), 48 frames, 111 lines with 39 reply steps, Cari Benda ⚡ in ⚡ 10.
- **⚡ 18:** no new words; 6 harder mixed frames and a 14-line dialogue with 5 replies. Chapter 18 now shows a real ⚡ chip.
- **The guard is at 0 flags for every ⚡ pack.** 66 packs, 1764 cards.
- **Ledger:** 180 new rows (L-1637 to L-1816) and the J:K cells of 19 promoted rows. The sheet was read before and after; `verify` is OK.
  Journal rows 243 to 256 were added.
- **Jambatan: 321 → 302 cards.**
- **Tests:** unit 196 → 204; e2e stretch 62 → 101 checks; smoke, fun (11) and nombor (16) pass.
- **Five places where I went beyond the letter of the brief.** Each is flagged for Sam in section 10:
  - a new row for «satu per satu»;
  - «terbaru» and «tertinggi» placed at Ch6;
  - a new row for «belon»;
  - «takkan» and «bisnes» left out;
  - «kesan» promoted instead of added.

## 1. Final main hash and commits

| Commit | What |
| --- | --- |
| `f1b50b3` | Rules sync to Cikgu Sensai `7e436f3` (174 fixtures) and the checker patch |
| `65b91de` | Sam's fixes to ⚡ 1, 3, 5, 7, 8; dialogue-line notes (schema, builder, reply step) |
| `6a8fb65` | ⚡ 10 |
| `9d33460` | ⚡ 11 |
| `0fcf988` | ⚡ 12 |
| `50184fe` | ⚡ 13 |
| `5872510` | ⚡ 14 |
| `3cd55d5` | ⚡ 15 |
| `d1cc2f0` | ⚡ 16; «terbaru» and «tertinggi» to ⚡ 6, «belon» to ⚡ 9 |
| `52cbc57` | ⚡ 17. **This one went out with the stretch e2e failing.** My ship script did not stop on the e2e result: its "⚡ soon" check needed a chapter with no pack, and none was left. Fixed in the next commit. |
| `1a4b90f` | e2e: the "⚡ soon" check falls back to the ⚡ 18 chip; ⚡ 10 and ⚡ 18 are played from an unlocked state |
| `d46181c` | ⚡ 18; the review-stage wording on the ⚡ screen and chip |
| `5e04e2a` | «kesan»: promote L-0674 instead of adding a duplicate row |
| `c0c1bfb` | Ledger snapshot after the write-back (the read-back) |
| `f056d42` | e2e: the ⚡ 8 line note on screen; screenshots |
| this report | Report, HANDOFF, README, CHANGELOG |

**Final `main`:** the commit that adds this report. The commit before it is `f056d42`.

## 2. Rules

**What was copied:**

- `curriculum/stage-rules.json` and `curriculum/stage-rules-fixtures.json`, unedited, from `7e436f382c39654211f9535fa366e30c06ddfb61`.
- `malay-proper-nouns.json` is unchanged.
- `content/rules/SOURCE.json` now has the commit, the date and the hashes.
- The test now counts 174 cases.

**The patch:** `docs/handoff/stage-rules-mjs-17nov2026.patch` (Cikgu Sensai `d612d1d`) applied cleanly to `tools/stage-rules.mjs`:

- lower-case «pasar» is a word, and «Pasar Seni» is still a name;
- X-X reduplication with no row of its own is read at its root;
- the chapter 17 register pairs;
- «terbaru» and «tertinggi» are ter- superlatives;
- «belon», «mekanik» and «meriah» are look-alike roots.

Build A's and B1's guard changes are kept.

**Fixtures:** all 174 give the same verdict in Kata-Kata's guard (`tests/unit/stage-rules.test.ts`).

**Guard flags and ledger gaps:**

| | Before (`d9d9f48`) | After the rules (`f1b50b3`) | End of build |
| --- | --- | --- | --- |
| Flags | 0 | 0 | 0 |
| Derivations checked | 20 | 20 | 31 |
| Stage 1 register findings (not blocking) | 7 | 7 | 7 |
| Stage 1 ledger gaps (not blocking) | 5 | 5 | 5 |

The non-blocking entries are the same before and after, one by one:

- c01: «evening», «kak» and «tak»;
- c02: «sikit»;
- c03: «bangunan» and «saja»;
- c04: «dah»;
- c05: «macam mana», «nak» and «tapi»;
- c07: «spoken»;
- c08: «se».

## 3. Sam's fixes

| Fix | What changed |
| --- | --- |
| ⚡ 8 «Tolong bungkus, ya. Ini hadiah.» | The line stays. It has a note in en and ja: «balut» is the correct word for gift-wrapping, but people usually say «bungkus», or the English "wrap".<br>The guard does not check notes, so there is **no «balut» row**.<br>Dialogue lines could not carry notes before. They can now (`note` / `note_ja` in the schema and builder). The reply step shows the notes of lines heard since the previous reply step, so this line's note appears with the line 13 step (screenshot `x08-line-note-kancil-light.png`). |
| ⚡ 1 «saudari» | The spoken lines now use the name: «Baik. Apa khabar, Cik Mei Ling?» and «Baik. Terima kasih, Cik Mei Ling. Jaga diri.», plus the two wrong replies of that step.<br>The greeting frame is now «Selamat petang, Puan Aini. Apa khabar?».<br>Card ms-x01-001 «saudari» stays, with the formal chip. Its note (en, ja) says: "Rare in speech; people say Cik or Puan".<br>**Core Kata-Kata content:** no pack uses «saudara» or «saudari» as address (searched; a unit test keeps it so). |
| ⚡ 5 | «Encik boleh makan durian! Wah, hebat!»: «hebat» (L-1369) is promoted to Ch5 (extension) as card ms-x05-032. The old ID ms-j-social-54 is in `RETIRED_IDS` and `MOVED_CARDS`; ledger J and K were changed.<br>«Saya nak teh tarik, kurang manis.»: «mahu» comes earlier in the dialogue, and the English marks «nak» as spoken. The wrong reply «Saya nak teh tarik, tanpa teh.» is kept.<br>«pekat» keeps its card and is now in a frame: «Saya minum kopi pekat tanpa gula.» |
| ⚡ 3 | «Pelajar itu jawab soalan satu per satu.»<br>«per» has no ledger row, so the line needed a row: **L-1638 «satu per satu»**, Ch3 (extension), card ms-x03-023.<br>«satu-satu» (L-1532) keeps its card; its note now names «satu per satu» as the standard phrase.<br>The decoy changed from «satu» (now a tile of the sentence) to «dua». See question 1. |
| ⚡ 7 | **L-1637 «pasar raya»**, Ch7 (extension), card ms-x07-032, Origin «Sam approved 17 Nov».<br>It replaces «kedai» in both dialogue lines: «Boleh kita pergi ke pasar raya dulu?» and «Ada pasar raya di tepi jalan, dekat simpang.»<br>It is on the Cari Benda board as 🛒. |
| Playful wrong replies | Kept, and used in every new pack. |

## 4. Per chapter

| ⚡ | Scene | Extension cards (new + promoted) | Frames | Lines | Reply steps | Cari Benda ⚡ |
| --- | --- | --- | ---: | ---: | ---: | --- |
| 10 | Sunday at Puan Siti's | 21 (20 + cerita) | 6 | 14 | 5 | **yes**: «Hari bekerja dan jiran baru», drawn: kilang 🏭, cerita 📖, perniagaan 💼, kajian 🔬, tonton 📺 |
| 11 | Monday at the office | 27 (26 + bahagian) | 6 | 14 | 5 | no (no picture scene) |
| 12 | The leaking air-conditioner | 31 (31 + 0) | 6 | 14 | 5 | no (no picture scene) |
| 13 | A sore neck | 32 (26 + tiada, mungkin, dapat, penting, langsung, kena) | 6 | 14 | 5 | no (no picture scene) |
| 14 | The parking quarrel | 32 (26 + memang, perkara, sebenarnya, begitu, pasti, sebenar) | 6 | 13 | 5 | no (no picture scene) |
| 15 | The new manager | 13 (11 + sesuatu, apa-apa) | 6 | 14 | 5 | no (no picture scene) |
| 16 | The wrong email | 22 (20 + teruk, kesan) | 6 | 14 | 4 | no (no picture scene) |
| 17 | A trip to the beach | 15 (15 + 0) | 6 | 14 | 5 | no (no picture scene) |
| 18 | One year in Malaysia (review) | 0 | 6 | 14 | 5 | no: the engine asks for extension objects, and ⚡ 18 has none |
| | **All** | **193 (175 + 18)** | **54** | **125** | **44** | 1 |

Earlier packs also changed in this build:

- ⚡ 3: + «satu per satu»;
- ⚡ 5: + «hebat»;
- ⚡ 6: + «terbaru», «tertinggi», used in the dialogue: «… di gelanggang yang terbaru» and «Saya paling lambat, tetapi saya yang tertinggi!»;
- ⚡ 7: + «pasar raya»;
- ⚡ 9: + «belon», used in the dialogue: «Tengok belon di pentas itu.».

**⚡ 18 completion:** `stretchProgress` already counts a stage with no cards as done once every frame is built and its dialogue is at 60 %. The unit tests check this, and so does the e2e, which ends with the 'stretch' stamp. For a stage with no cards, the ⚡ screen and chip say "harder review, no new words" (en, ja, ms drafts), the bar counts frames only, and the empty word list is hidden.

**⚡ 18 frames:**

| Frame | Decoy | Pattern |
| --- | --- | --- |
| «Draf itu sudah disemak oleh Cik Mei Ling.» | «menyemak» | di- passive against meN- |
| «Juruteknik itu sedang membaiki paip di dapur.» | «baiki» | meN- against the root |
| «Bilik ini lebih luas daripada bilik saya.» | «dari» | comparison |
| «Saya tertinggal kunci, jadi saya belum masuk rumah.» | «sudah» | ter- and aspect |
| «Anak saya bersekolah di Shah Alam sejak tahun lepas.» | «sekolah» | ber- against the root |
| «Tolong ambilkan fail yang ada di atas meja.» | «mengambil» | a -kan request with yang |

The wrong replies break one of these patterns:

- aspect («Saya akan bekerja di sini semalam.», «saya sudah sedang akan belajar»);
- comparison («saya setinggi bahasa Melayu»);
- the passive («Dia dijemput saya ke rumahnya.»);
- yang focus.

**How each pack was built:**

- **Affix gates:** ber- from 10, meN- from 11, -kan and -i from 12, accidental ter- from 16, joined -lah from 17 (⚡ 14 writes «percaya», not «percayalah»).
- **-kan verbs:**
  - They take a noun object.
  - Bare -kan appears only in requests («Tolong kurangkan …», «Boleh tolong tempahkan …?», «Jangan salahkan dia.») and first-person offers («Saya tempahkan slot …», «Saya keluarkan alat saya dulu.»).
  - Statements take meN- («Juruteknik itu menunjukkan …», «… yang menyebabkan kebocoran»).
- **Word scope:**
  - Each ⚡ pack uses core words up to N and its own extension words only. Other chapters' ⚡ words have no row in that view, so lines were rewritten instead (for example «staf» → «pekerja» in ⚡ 15, «beri» → «bagi»).
  - No row was invented to fit a line. The three new rows outside the proposal («satu per satu», «pasar raya», «belon») all come from the brief.
- **Malay rules:**
  - Standard forms first. Spoken forms (je, tau, kejap, motor, komplen, tak ada hal, tak apa, macam tu) appear only in ⚡ 17, after their standard partners, and their cards say «Spoken:».
  - «dari» for places, «daripada» for comparison.
  - «kita» for us together, «kami» for "we, not you".
  - «sudi» for the polite invitation (⚡ 17, ⚡ 18); «Lain kali, ya?» is the soft no.
  - No «keputusan»; no «saudara» or «saudari»; no faith-specific greetings.
- **The words the new rules place:**
  - «mekanik» is in ⚡ 11 («Mekanik akan datang petang ini.»).
  - «meriah» is in ⚡ 14 («jamuan semalam sangat meriah»).
  - «terbaru» and «tertinggi» are in ⚡ 6, and «belon» in ⚡ 9 (question 2).
- **Proposal defaults followed** (not settled by the brief):
  - «kesian», «makin», «mak» and «ngantuk» stay out: no standard row, proposal question 8.
  - The whole-word placements and progress carry-over that Sam confirmed apply to the 18 promoted rows.
- **Card only (in no frame or line; some appear as decoys or wrong replies):**
  - ⚡ 10: berulang, kaji;
  - ⚡ 11: analisis;
  - ⚡ 12: ceritakan, gas, jaga, maafkan, mengecewakan, menyiapkan, padam, mati;
  - ⚡ 13: benar, sumbat, uji, penting, tajam (wrong replies);
  - ⚡ 14: makna, peduli, topik, sebenar, perbualan, yakin, kumpul (a decoy);
  - ⚡ 15: kejam, gergasi (wrong replies);
  - ⚡ 16: terasa, tertulis, habuk (a decoy);
  - ⚡ 17: punya, tau, merepek, komplen (wrong replies).

## 5. Ledger

Sheet `1X8t3ENRVUY_NHJ3xEB7UY3OiwwUg_KUZT-ESbtiMC0o`, tab Ledger (sheet ID 1). The plan is `tools/ledger/batches/b2-plan.json`, merged from the chapter plans with the new `stretch_batch.py merge`.

1. **Before read** of A1:T600 and A601:T1637.
   - It matched the `d9d9f48` snapshot except in 4 cells of rows 1503 and 1507: register notes on L-1502 «percutian» and L-1506 «saudari», added in the sheet since then (Journal 241 and 242).
   - None of these is a planned cell. All 38 planned "before" values matched.
2. **`insert_dimension`** at 0-based rows 1637 to 1818 (181 rows). Then **`update_values`** in chunks of 23 rows. `append_values` was not used.
3. **«kesan» (found mid-write).** The plan had a new row L-1790 «kesan», but **L-0674 «kesan» already exists** (Jambatan · Home and condo). The proposal had merged «kesan-kesan» into a new «kesan» row.
   - I stopped once rows up to L-1774 were written (none of them touched by this), and checked every new word against the whole ledger: no other duplicate.
   - L-0674 is promoted to Ch16 (extension) as ms-x16-010, and the later new rows moved down one L-number.
   - The one surplus inserted row (the last one, still blank) was deleted with `deleteDimension`. The remaining rows were then written.
4. **J:K of the 19 promoted rows**, in 19 `update_values` calls.
5. **After read** of A1:T600 and A601:T1830, then `stretch_batch.py verify`: **"38 changed cells in existing rows (38 planned), 180 new rows: OK"**. Sheet row N holds L-(N−1) throughout.
6. **Snapshot** = the read-back (`c0c1bfb`, L-0001 to L-1816). It also brings in Sam's two register notes. No pack changed.

| Rows | Chapter | Origin |
| --- | --- | --- |
| L-1637 pasar raya | Ch7 (extension) | Sam approved 17 Nov |
| L-1638 satu per satu | Ch3 (extension) | Sam approved 17 Nov (Sam dictated the line; question 1) |
| L-1639 to L-1658; promoted L-1338 cerita | Ch10 | 15 Nov |
| L-1659 to L-1684; promoted L-1346 bahagian | Ch11 | 15 Nov |
| L-1685 to L-1715 | Ch12 | 15 Nov |
| L-1716 to L-1741; promoted L-1313, L-1315, L-1317, L-1340, L-1348, L-1353 | Ch13 | 15 Nov |
| L-1742 to L-1767; promoted L-1326, L-1334, L-1341, L-1350, L-1355, L-1477 | Ch14 | 15 Nov |
| L-1768 to L-1778; promoted L-1322, L-1324 | Ch15 | 15 Nov |
| L-1779 terbaru, L-1780 tertinggi | Ch6 (extension) | 15 Nov (proposal rows; place moved, question 2) |
| L-1781 belon | Ch9 (extension) | Sam approved 17 Nov (from the brief; question 3) |
| L-1782 to L-1801; promoted L-1365 teruk, L-0674 kesan | Ch16 | 15 Nov |
| L-1802 to L-1816 | Ch17 | 15 Nov |
| promoted L-1369 hebat | Ch5 (extension) | (place change) |

- **New rows:** In both = Yes and column N = the English meaning where the word is in Hanashishou's metfirst list. «pasar raya» is matched through its scene form «raya»; «satu per satu» is not in the list, so it has neither. The other columns are as in B1: Draft, «KD4 check», «Not yet checked», 2026-11-17, «Claude (Sam approved)».
- **Not in the ledger:**
  - «takkan» and «bisnes» (section 6);
  - «balut» (not needed).
- **Journal rows 243 to 256**, written with `update_values` at the next free row and read back:
  - rows 243 to 255: one per chapter touched (Ch3, Ch5, Ch6, Ch7, Ch9, Ch10 to Ch17), Status **Open**;
  - row 256 closes **242**: the «saudari» dialogue fix is done, Status **Done**.
  - Row 246 («pasar raya») says it resolves Journal 239.

## 6. Left out

- **«takkan»** (Ch17 in the proposal): the register rule needs «tidak akan» taught in an earlier segment before the «takkan» card. A ⚡ pack's cards come before its frames and lines, and no core text up to chapter 17 has «tidak akan». So the card would always flag. As the brief says, it is left out (no row). A frame with «Saya tidak akan lupa …» is in ⚡ 17 anyway. If Sam wants «takkan», a core chapter needs a «tidak akan» line first.
- **«bisnes»** (Ch17 in the proposal): the new pair is bisnes / perniagaan, but «perniagaan» is a ⚡ 10 word, which never counts as core. The pair can never be met, so «bisnes» is left out (no row).
- **Cari Benda ⚡** only in ⚡ 10: chapters 11 to 18 have no picture scene.

## 7. Jambatan

`python3 -I tools/import_hanashishou_bridge.py ../hanashishou` (Hanashishou at `4be57ac`, read only) gives **302 cards** (321 before). Only the 19 promoted words left. A second run on the final snapshot gives the same packs.

## 8. Test counts

| | Before (`d9d9f48`) | After |
| --- | --- | --- |
| content | 57 packs, 1584 cards; 0 flags, 20 derivations; Stage 1 7 register, 5 ledger gap | 66 packs, 1764 cards; **0 flags**, 31 derivations; 7 register, 5 ledger gap (same entries) |
| `npm test` | 196 tests, 5 files | 204 tests, 5 files |
| `tests/e2e/smoke.cjs` | passes | passes |
| `tests/e2e/fun.cjs` | 11 checks | 11 checks |
| `tests/e2e/nombor.cjs` | 16 checks | 16 checks |
| `tests/e2e/stretch.cjs` | 62 checks | 101 checks |

**New unit tests:**

- the «hebat» move: the ID, the ledger row, the schedule copied once, the line;
- ⚡ 1 has no «saudari» address, and core packs have no saudara/saudari;
- ⚡ 3, ⚡ 7 and the ⚡ 8 note;
- terbaru, tertinggi and belon placed and used; «takkan» and «bisnes» absent;
- ⚡ 18: its shape, chip, completion rule and run steps;
- "⚡ soon" is now tested with a pack taken out.

**New e2e checks:**

- ⚡ 10 and ⚡ 18 are played from stamps only: three ⚡ runs build every frame, then the whole ⚡ dialogue. ⚡ 18 gets its 'stretch' stamp; ⚡ 10's done state matches the rule (21/21 cards known, so done).
- No row shows "⚡ soon"; chapter 18 shows a chip.
- The ⚡ 10 Cari Benda board has six objects.
- The ⚡ 8 line note shows.

`tests/e2e/bridge.cjs` was not run (it needs Hanashishou served on port 4179).

## 9. Screenshots

`docs/stretch-stage/`, phone width (Pixel 7):

| File | Screen |
| --- | --- |
| `x10-screen-kancil-light` … `x18-screen-kancil-light` | each new ⚡ screen (full page) |
| `x10-cari-kancil-light` | the ⚡ 10 Cari Benda board («perniagaan»: 🏊 🍳 🏘️ 🔬 🏭 💼) |
| `12-sedia-x18-chip-*`, `12-x18-chip-row-*` | the ⚡ 18 chip, kancil and rebel, light and dark |
| `12-sedia-x18-chip-rebel-light` | **the Rebel gold screen**: gold «17 ⚡» and «18 ⚡» chips |
| `x08-line-note-kancil-light` | the ⚡ 8 «bungkus» / «balut» note in a reply step |
| `x10-done-kancil-light`, `x18-done-kancil-light` | the summary when ⚡ 10 and ⚡ 18 are done |

Build A's and B1's shots were retaken. `09-sedia-soon-*` and `09-soon-row-*` are B1 shots: no chapter shows "⚡ soon" any more.

## 10. Malay lines for Sam's read (and questions)

Every line is mine and unchecked by a native speaker. These are the ones I am least sure of:

- **⚡ 10**
  - «Rumah Puan bersebelahan dengan rumah saya, bukan?»
  - «Sekarang saya bekerja dalam bidang perniagaan.»
  - «Bagus! Saya pula selalu ponteng kelas pada zaman sekolah dulu.»
  - «Wah! Zaman sudah berubah, Encik. Sekarang Encik bekerja setiap hari.»
  - «Sila hantar jawapan bertulis sebelum hari Jumaat.»
  - «Dia cerita pengalamannya berkali-kali.»
- **⚡ 11**
  - «Encik Tanaka, tolong memberi slaid produk kita kepada mereka.» (meN- in a request; «berikan» would be the usual request form, but «beri» is a Ch4 ⚡ word)
  - «Puan Aini urus temu duga itu.»
  - «Tolong layan tetamu kita dengan baik.»
  - «Kerja itu akan selesai petang ini.»
- **⚡ 12**
  - «Saya tempahkan slot pukul sembilan untuk Encik.»
  - «Saya keluarkan alat saya dulu.»
  - «Penghawa dingin saya membosankan. Dia tidak bercakap.» (wrong reply)
  - «Tolong tutupkan langsir itu.» (decoy «menutup»)
- **⚡ 13**
  - «Saya sentuh leher Encik, ya. Sakit di sini?»
  - «Tidak perlu berhenti langsung.»
  - «Saya kena berhenti bersenam?»
  - «Sepatutnya Encik makan kurang nasi lemak dan roti canai.»
- **⚡ 14**
  - «Puncanya tempat letak kereta. Jiran di unit 8-1 anggap tempat itu tempat dia.»
  - «Saya tidak mahu masuk campur. Itu tidak wajar.»
  - «Kini suasana di kampung itu lebih meriah.»
  - «Kami kongsi sebuah bilik semasa cuti.»
- **⚡ 15**
  - «Tidak garang, tetapi tegas.»
  - «Pelik! Seseorang patut bagi dia kopi.»
  - «Jangan beritahu sesiapa saya cakap begini.»
- **⚡ 16**
  - «Saya tersalah hantar emel itu.»
  - «Dua fail tercampur, jadi saya tersalah pilih alamat.»
  - «Terpulang kepada Encik.»
  - «Keadaan di pejabat teruk hari ini?»
- **⚡ 17**
  - «Tak ada hal. Dia suka. Santai je.»
  - «Tetapi kejap, ya.»
  - «Seronok-seronok, ya! Tetapi balasannya, Encik belanja kopi.»
  - «Kek ini balasan untuk jemputan Puan.»
- **⚡ 18**
  - «Dia yang jemput saya ke rumahnya pada hari Ahad pertama.» (bare «jemput»: «menjemput» has no row)
  - «Bagaimana hidup Encik di sini sekarang?»
- **Fixes**
  - ⚡ 6: «… di gelanggang yang terbaru», «Saya paling lambat, tetapi saya yang tertinggi!»
  - ⚡ 9: «Tengok belon di pentas itu.»
- **Japanese:** all of it is draft, including the review-stage strings and the line note.

### Questions for Sam

1. **«satu per satu» (L-1638).** Your ⚡ 3 line needs «per», which has no row. I added «satu per satu» as a Ch3 (extension) row and card, and kept «satu-satu» (L-1532) with a note that the standard phrase is «satu per satu».
   - Is the new row right?
   - Or should L-1532 itself become «satu per satu», with the extra row dropped?
2. **«terbaru» and «tertinggi» at Ch6.** I read "where the new rules now place them" as chapter 6, the ter- superlative gate, which is what the proposal's section 8 said would follow. Their rows are Ch6 (extension), not Ch16. Agree?
3. **«belon» (L-1781, Ch9 extension).** It had no row: the proposal put it in Jambatan, a batch that is not in the ledger. I added a row because the brief asks to use it, with Origin «Sam approved 17 Nov» on that basis. Confirm, or should it wait for the Jambatan batch?
4. **«takkan» and «bisnes»** are left out (section 6).
   - Add a «tidak akan» line to a core chapter so «takkan» can follow?
   - For «bisnes», should the pair point to a core word, or should «bisnes» go to Jambatan?
5. **«kesan»:** promoted from Jambatan (L-0674) instead of a duplicate new row. Fine?
6. **⚡ 18:** no Cari Benda (no extension objects). Is the "harder review, no new words" wording right for its chip and screen?
7. **Line notes:** a note on a line between reply steps shows with the next reply step (the ⚡ 8 screenshot). Is that the right place, or should the note show earlier?

## 11. Not done, and for the other repos

- **Not done here:**
  - KD4 for the 180 new rows;
  - the native reads;
  - «hai» / «helo» (B1 question 1, still open).
- **Cikgu Sensai:** refresh `curriculum/reference/katakata/` (ledger to L-1816, the ⚡ packs).
- **Hanashishou:**
  - its audit should read extension rows like practice-pool rows;
  - its prep list loses the 19 promoted words;
  - its chapter 17 scenes use «takkan» and «bisnes», which have no Kata-Kata row.
