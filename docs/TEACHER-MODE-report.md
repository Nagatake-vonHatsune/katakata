# Teacher mode, memory cards and progress reports (report)

**17 Nov 2026 · Claude.** Brief: Sam's teacher-mode message of 17 Nov 2026 (three parts). Only this repo was edited.

*This report is written part by part; the sections for Parts 2 and 3 follow when those parts are pushed.*

## Part 1: small content notes

| Item | Done |
| --- | --- |
| «kasihan» / «kesian» | Both ⚡ 17 cards (ms-x17-016, ms-x17-017) and the ⚡ 17 line «Kesian dia! Takpelah, …» (ms-x17-d06) say, en: "«kasihan» is the formal, correct form; «kesian» is the common colloquial one."; ja: «kasihan» が正式で正しい形、«kesian» はよく使われるくだけた形です。 The line note shows directly under its line (B3 rule). Source: `content/source/stretch/x17.json`, rebuilt with `tools/build_stretch.py 17`. |
| «Spoken: tapi» | The chapter 5 card «tetapi / tapi» (ms-c05-007) now has the note "Spoken: «tapi» for «tetapi». «tetapi» is the standard form for writing and formal speech; «tapi» is what you will hear in everyday conversation." and a Japanese note. Built by `sam_notes_1117()` in `tools/make_vocab_bank_v6.py` (workbook v6 rebuilt; only this card changed). Class cards had no Japanese notes before: `import_vocab_bank.py` now reads `kelas_note_ja` from `tools/import-overrides.json`. The guard still reports 0 flags; its non-blocking Stage 1 findings are unchanged (8 register, 5 ledger gap), since chapter 5 itself has no «tapi» text. |
| «tetapkan» / «letupkan» | Japanese glosses made active: «tetapkan» 定められる → **定める、決める**; «letupkan» 爆破される → **爆破する**. Changed in the ledger snapshot (L-1864, L-1897, column D) and in the two Jambatan cards (ms-j-daily-life-126, ms-j-social-185), so a rerun of the bridge importer gives the same packs. **The Google Sheet was not edited (only this repo):** cells `Ledger!D1865` and `Ledger!D1898` need the same two values, with a Journal row. |
| «hai» / «helo» | Removed from HANDOFF's open list (Sam, B1: not needed). |
| Review CSV | `docs/review/stretch-lines.csv`, made by `python3 -I tools/export_stretch_review.py`: **635 rows** (159 dialogue lines, 88 right replies, 176 wrong replies, 106 frame sentences, 106 decoys), ⚡ 1 to 18. Columns chapter, type, id, speaker, Malay, English, OK, Fix; UTF-8 with BOM, CRLF. A wrong reply's ID is its line's ID plus `#w1`/`#w2`; a decoy's is its frame's ID plus `#d1` …; decoys have no English. |

Unit tests: 210 → 214 (the four notes and the CSV row count).
