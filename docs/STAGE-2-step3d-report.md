# Stage 2, build step 3d: chapters 13 to 18 finished (13 Nov 2026)

Sam's decisions after [step 3c](STAGE-2-step3c-report.md): five new ledger rows, the R3 pair changed to «tak tahan» → «tidak boleh tahan», and the held-back lines.
Cards 1116 → **1121** (6 new class cards, 1 Jambatan card dropped). Commits on the session branch: ledger snapshot `484ad8d`, rules `a24a993` copy, pack `0c357ab`, ledger snapshot after the write-back, then docs.
Cikgu Sensai and Hanashishou were read only (Hanashishou checked out at `e5e167c` for the Jambatan rebuild); neither was edited.

## 1. Fixture cross-check (step 4a could not run it)

Rules copied unedited from Cikgu Sensai `a24a993` (`stage-rules.json`, `stage-rules-fixtures.json`; `SOURCE.json` and the case count 72 → 77 updated).
`tools/stage-rules.mjs` run on all **77 cases: 0 disagree** with the expected results in the fixtures file. R3 is now «tak tahan» → «tidak boleh tahan»; the -lah rule text now matches the joined reading Kata-Kata already used.

## 2. Ledger sync

Sheet read in two parts: **exactly the five new rows** (L-1268 to L-1272, Journal row 184), nothing else changed. Committed on its own.

## 3. Cards added (each the last card of its pack, so no card ID moved)

| Row | Card | Pack | Note shows |
|---|---|---|---|
| L-1268 mendaftar | ms-c13-025 | c13 | meN- + daftar (Ch13) |
| L-1269 tangguhkan | ms-c14-021 | c14 | tangguh + -kan (Ch14) |
| L-1270 batalkan | ms-c14-022 | c14 | batal + -kan (Ch14) |
| L-1271 memakai | ms-c15-020 | c15 | meN- + pakai, the p drops; pakai is not a class card, named as the everyday form (Dunia, Ch4) |
| L-1272 berwarna | ms-c15-021 | c15 | ber- + warna (Ch5) |
| L-0690 tak tahan | ms-c17-024 | c17 | "Spoken:", partner tidak boleh tahan, plus «Saya tak nak pedas» / «Saya tak suka pedas» |

ms-c17-023 «tidak boleh tahan» now says «boleh tahan» (L-0939, Dunia, Ch5) means "not bad", a different expression. `ms-j-office-14` is dropped and Jambatan rebuilt: only that card changed.

## 4. Lines changed (all nine passed `tools/stage-check.mjs`, then the whole guard; none failed, so no old line is kept)

- c14: «Ada dua pilihan: kita tangguhkan ke hari Ahad atau ke hari Sabtu depan.»; «Kita batalkan rancangan mendaki, tetapi kita masih makan di kafe. Itu keputusan kita.»; «Jika hujan, kita tangguhkan.»
- c15: f03 «Lelaki yang memakai ___.»; f04 «Beg itu berwarna ___ dan ada ___.»; visitor line («yang memakai» ×2, «membawa»).
- c17: Tanaka «Terima kasih. Tetapi makanan di kafe itu pedas. Saya tidak boleh tahan pedas.»
- c18: f03 «Saya belum mendaftar, tetapi saya mesti berjumpa doktor.»; f04 «Hari Sabtu saya tidak lapang, jadi bolehkah kita tangguhkan ke hari Ahad?» (frame «… kita ___ ke hari Ahad?»).
- Japanese drafts: c15 f04 (黒色で) and c18 f04 (日曜日に延期できませんか); c15 f03 and c18 f03 were already right.

## 5. Ledger and Journal

- **Cells:** 7: J691, K691 (L-0690) and J1269 to J1273. Whole tab read before and after; `writeback.py verify`: 7 changed, 7 planned.
- **Journal rows 185 to 189** (card IDs; L-0690, closing row 180; lines, closing row 182; rules copy; the write-back).
- **Slip, fixed:** `append_values` inserted my five rows *above* the blank row 176 (the sheet read the table as ending at row 175), which pushed Sam's rows 176 to 184 down by five. Nothing was lost or overwritten. I moved my rows to the end with a row move (no deletes); Sam's rows are back at 176 to 184 and read back correctly. HANDOFF now says to write Journal rows with `update_values` at the next free row.

## 6. Beyond the list (disclosed)

- c14 notes L-1217 and L-0641 and the c15 note of L-1230 now use «tangguhkan ke» / «memakai» to match the lines (they still said «tangguh hingga» / «pakai»).
- The c14 Sedia Kelas list now holds tangguhkan and batalkan instead of tangguh and batal: the importer picks the cards the scenario uses.
- The c14 batalkan line keeps the old tail «Itu keputusan kita.»

## 7. Questions for Sam

1. Keep «Itu keputusan kita.» after the batalkan line, or end the line at «kafe.»?
2. The tangguh and batal root cards stay in c14 but are no longer in its Sedia Kelas: fine?
3. Cikgu Sensai: refresh `curriculum/reference/katakata/` (c10 to c18, the ledger copy). Its Python checker should now match on joined -lah.
4. Native Japanese check of the four updated frame drafts, with the end-of-project read.
