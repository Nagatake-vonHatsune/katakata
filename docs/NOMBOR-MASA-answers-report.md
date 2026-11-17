# Nombor & Masa: Sam's answers of 15 Nov 2026 applied (report)

Answers to [NOMBOR-MASA-report.md](NOMBOR-MASA-report.md) section 4. That report describes the first build; where it differs from this one, this one wins.

## Commits (on `main`, after Build A's `bcb195a`)

| Commit | What |
| --- | --- |
| `ba94cc5` | Rules sync to Cikgu Sensai `d8612e5` (answer 7) |
| `a6960a5` | Ledger snapshot refresh (read-only re-read) |
| `09507c6` | Cards: ms-c03-043, ms-c04-061, ms-j-daily-life-52 |
| `18d9a49` | Nombor & Masa code, i18n and tests (answers 1 to 6) |
| `5db4caf` | Screenshots |
| this report | report, README, CHANGELOG, HANDOFF |

The final `main` hash is in the hand-off message.

## What changed, per answer

1. **Day parts** (`DAY_PARTS`, `QUIZ_HOURS`, chart, en/ja/ms labels): 00:00 tengah malam; 00:01 to 00:59 malam (pagi also accepted, "Also said"); 01:00 to 04:59 awal pagi (L-0854; pagi also accepted); 05:00 to 11:59 pagi; 12:00 to 12:59 tengah hari; 13:00 to 18:59 petang (1 pm = «pukul satu petang»); 19:00 to 23:59 malam. New `dayPartAlso()`. «awal pagi» joins the quiz (hours 2 and 3); quiz hours still avoid every edge (tested). The chart ring and list show six parts and keep "the times are a guide".
2. **«kurang suku»**: not used; dropped from the code comments and the open questions. A test checks that no reading contains «kurang».
3. **«hari bulan»**: the date variant is «lima belas hari bulan Ogos …» (two words, number first). The calendar chart shows «Hari ini berapa hari bulan? → Sebelas hari bulan.» and Sam's order «Hari ini hari bulan berapa? / hari bulan sebelas» labelled Spoken. Cards: ms-c04-061's note, ms-j-daily-life-52 (term «hari bulan», note «Hanashishou: 10 hari bulan.»; the importer replaces «haribulan» in that one quoted example, since `hanashishou-metfirst.json` is untouched and still says «haribulan» until the next Hanashishou sync).
4. **Fractions**: joined only («satu pertiga», «dua pertiga», «satu perempat», «tiga perempat»; «sepertiga» stays). «per tiga» is no longer accepted. Learner note `nm.note.pertiga` (en, ja, ms): "Read it as 1 per 3, i.e. 1/3", shown in feedback, the explorer and the chart. ms-c03-043: term «satu pertiga / sepertiga», note «Read it as «1 per 3», i.e. 1/3. …».
5. **Minutes**: «minit» stays standard. The form without it is an accepted "Also fine" variant (new label `nm.label.fine`) for every minute value, :15 «lima belas» included, with the note "Speakers often drop «minit»" (`nm.note.minit`). :30 stays «setengah» / «tiga puluh».
6. **Smaller ones**: RM1: «satu ringgit» and «seringgit» both standard (also with sen: «seringgit lima puluh sen»; spoken «seringgit setengah»). 1,000,000: «sejuta» and «satu juta» both standard (other se- numbers stay se- only). Phone numbers: «kosong» first, «sifar» formal variant (`phoneReading`). Calendar keeps the full weekday names (pinned by a test).
7. **Shared rules**: `stage-rules.json` and `stage-rules-fixtures.json` copied unedited from Cikgu Sensai `d8612e5` (SHA-256 in `content/rules/SOURCE.json`; 118 fixtures; adds nol, Maret, Juni, Juli, Agustus, Desember and persen). Kata-Kata's guard passes all 118. Build A's guard changes are kept. The memory hooks stay as drafted. The mode's own `INDONESIAN_NUMBER_FORMS` list is kept (it also covers «Minggu» and «jam»).

## Tests

| | Before | After |
| --- | --- | --- |
| `npm test` | 177 tests, 5 files | 185 tests, 5 files (`nombor.test.ts` 80 to 88) |
| `npm run build` | passes, 0 flags | passes, 0 flags |
| e2e smoke, fun, nombor, stretch | pass | pass |

New or changed unit tests, one per answer: day parts (every minute covered once, each boundary, 1 pm, the pagi variant, quiz hours off the edges), «kurang», «hari bulan» (never «haribulan»), joined fractions plus the learner note in en, ja and ms, «minit» optional for every minute, seringgit, sejuta / satu juta, phone «sifar», weekday names, and the shared rules catching the seven forms. The fixtures test now expects 118.

## Guard and ledger gaps

| | Before | After |
| --- | --- | --- |
| Guard flags | 0 | 0 |
| Stage 1 register findings (not blocking) | 7 | 7 |
| Stage 1 ledger gaps (not blocking) | 7 | 5 |

The two gaps that went are the ones Build A reported: «satu pertiga» (card ms-c03-043 against L-0141) and «hari bulan» (ms-j-daily-life-52 against L-1410).

## Ledger

Read-only. The snapshot was re-read (A1:T1506) and refreshed: only column N of L-1494 to L-1505 differed (12 rows). L-0141 and L-1410 were already in it. Nothing was written to the sheet.

**Journal rows to close:** 226 (L-1410 «hari bulan» and the L-1032 note: Kata-Kata is done: card ms-j-daily-life-52, the c04 note, the Nombor & Masa variant; Hanashishou's 4 scenes still write «haribulan» and follow on its side) and 227 (L-0141 «satu pertiga»: card ms-c03-043 and the Nombor & Masa fractions are done). Suggested "Pushed to": «Sheet; Kata-Kata» plus this commit range. Rows 228 and 229 are Build A's and stay Open.

## Screenshots (`docs/nombor-masa/`, Pixel 7, Japanese interface)

Re-taken and kept: `03-bulan*` (dates), `04-pecahan-q` and `-feedback` (fractions), `06-masa*` and `08-masa-en` (time), `chart-clock` / `-2` (six parts), `chart-calendar` / `-2` (hari bulan), `chart-blocks` / `-2` (satu juta and the fraction note). The other screenshots of the same run differed only by random draws and were left as they were.

## Card text changed beyond the three named

None. ms-c03-043 and ms-j-daily-life-52 and the ms-c04-061 note are the only card changes (`git diff content/ms`). The builder step is `nombor_followups()` in `tools/make_vocab_bank_v6.py`; the v6 workbook was rebuilt.

## Not done, and unverified

- Kamus Dewan was not read from the session; «hari bulan» rests on the ledger's DBP Khidmat Nasihat citation (Sam's answer).
- The Japanese for the new strings (`nm.note.*`, `nm.label.fine`, part labels) is a draft for a native read.
- Hanashishou's scenes still write «haribulan» (its side, next sync). `tests/e2e/bridge.cjs` was not run.
- No open questions remain from section 4 of the first report.
