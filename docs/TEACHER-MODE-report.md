# Teacher mode, memory cards and progress reports (report)

**17 Nov 2026 · Claude.** Brief: Sam's teacher-mode message of 17 Nov 2026 (three parts). Only this repo was edited.

`main` was at `2d1161f` at the start and did not move during the session (fetched before every push; nothing to rebase).

## Summary

- **Part 1 (content notes):** the «kasihan» / «kesian» register note on both ⚡ 17 cards and its line, «Spoken: tapi» on the chapter 5 card, active Japanese on «tetapkan» / «letupkan», «hai» / «helo» closed, and `docs/review/stretch-lines.csv` (635 rows) for Sam's native read.
- **Part 2 (teacher mode):** one switch in Settings. A projector layout that scales from a phone held sideways to 1920×1080, a class launcher on Home, teacher-paced slides (Next, Back, Reveal, numbered choices, translations toggle, keys and clicker), dialogues built line by line, everything open. Class runs play on an in-memory copy of the learner, so nothing is ever saved.
- **Part 3 (memory cards, reports, slots):** the 💾 memory card (the existing savefile, renamed and made safe), a mistake log in every game, a self-contained 📄 progress report (HTML with the report JSON inside), 👥 student slots in teacher mode, and a Teacher Desk that reads cards and reports, with a per-student view and mistakes across the class.
- **Tests:** unit 210 → 240; e2e smoke, fun (11), nombor (16), stretch (116) unchanged and passing; new teacher (61) and cards (26). Build passes; guard 0 flags.

## 1. Hashes

| Part | Commit on `main` |
| --- | --- |
| Part 1 | `cd4eb35` |
| Part 2 | `0b9d076` |
| Part 3 | `ff090fb` (code, tests, screenshots); this report and the guides are the next commit |
| Final `main` | the commit that adds this report (its parent is `ff090fb`) |

Every commit was made after `npm run check` and every e2e suite passed on that tree; each part was pushed to `main` and to `claude/kata-kata-teacher-mode-uk2dx9`.

## 2. Part 1: small content notes

| Item | Done |
| --- | --- |
| «kasihan» / «kesian» | Both ⚡ 17 cards (ms-x17-016, ms-x17-017) and the ⚡ 17 line «Kesian dia! Takpelah, …» (ms-x17-d06) say, en: "«kasihan» is the formal, correct form; «kesian» is the common colloquial one."; ja: «kasihan» が正式で正しい形、«kesian» はよく使われるくだけた形です。 The line note shows directly under its line (B3 rule). Source: `content/source/stretch/x17.json`, rebuilt with `tools/build_stretch.py 17`. |
| «Spoken: tapi» | The chapter 5 card «tetapi / tapi» (ms-c05-007) now has the note "Spoken: «tapi» for «tetapi». «tetapi» is the standard form for writing and formal speech; «tapi» is what you will hear in everyday conversation." and a Japanese note. Built by `sam_notes_1117()` in `tools/make_vocab_bank_v6.py` (workbook v6 rebuilt; only this card changed). Class cards had no Japanese notes before: `import_vocab_bank.py` now reads `kelas_note_ja` from `tools/import-overrides.json`. The guard still reports 0 flags; its non-blocking Stage 1 findings are unchanged (8 register, 5 ledger gap), since chapter 5 itself has no «tapi» text. |
| «tetapkan» / «letupkan» | Japanese glosses made active: «tetapkan» 定められる → **定める、決める**; «letupkan» 爆破される → **爆破する**. Changed in the ledger snapshot (L-1864, L-1897, column D) and in the two Jambatan cards (ms-j-daily-life-126, ms-j-social-185), so a rerun of the bridge importer gives the same packs. **The Google Sheet was not edited (only this repo):** cells `Ledger!D1865` and `Ledger!D1898` need the same two values, with a Journal row. |
| «hai» / «helo» | Removed from HANDOFF's open list (Sam, B1: not needed). |
| Review CSV | `docs/review/stretch-lines.csv`, made by `python3 -I tools/export_stretch_review.py`: **635 rows** (159 dialogue lines, 88 right replies, 176 wrong replies, 106 frame sentences, 106 decoys), ⚡ 1 to 18. Columns chapter, type, id, speaker, Malay, English, OK, Fix; UTF-8 with BOM, CRLF. A wrong reply's ID is its line's ID plus `#w1`/`#w2`; a decoy's is its frame's ID plus `#d1` …; decoys have no English. |

Unit tests: 210 → 214 (the four notes and the CSV row count).

## 3. Part 2: teacher mode

**One switch, off by default:** Settings → 🎓 Teacher mode (en "Teacher mode", ja 「先生モード」, ms «Mod guru»; ja and ms are drafts). It is a device setting, saved under its own IndexedDB key `teacher` (`src/core/teacher.ts`), never in the learner state, so it is never in a savefile and turning it on or off never touches the learner.

| Brief item | Built |
| --- | --- |
| 1. Projector layout | `:root[data-teacher]` in `src/styles.css`: the root font size follows the viewport (`clamp(15px, min(1.45vw, 2.75vh), 34px)`, scaled by the S–XL text size), so every rem-sized part grows with the screen; wide two-column slides (prompt left, choices right); only palette tokens, so all four palettes keep their phone contrast in light and dark. A 先生モード strip on every screen, and the badge in the class run's own top bar: one tap turns teacher mode off. |
| 2. Class runs never change learner data | `beginClassRun()` / `endClassRun()` in `src/core/state.ts`: the run plays on a deep copy of the learner, `update()` never schedules a save and `saveNow()` does nothing while it runs; ending the run puts the learner's own object back. Only display settings changed during the run (language, theme) are kept. Class slides (`src/core/classroom.ts`) are built from the content only and write nothing themselves. |
| 3. Everything open | The launcher offers every chapter's Sedia Kelas words, frames and dialogue, every ⚡ stage (words, frames, dialogue, Cari Benda ⚡), every Jambatan scene (words, Laju!), every Cari Benda board, every Nombor & Masa part (explore, round) and Laju! per chapter or scene, with no flame or unlock check. On the ordinary screens `stretchUnlocked()` opens the ⚡ screen in teacher mode only; `stretchOpen()` (reports, the one-time notice) is still the learner's own progress. |
| 4. Class launcher | Home in teacher mode: tabs Chapters / Jambatan / Cari Benda / Nombor & Masa, a grid of sources, the activities with their slide counts, Start. Below it the teacher menu, then ordinary practice. |
| 5. Teacher-paced | No auto-advance, no timers (Laju! has a 60-second clock switch on the launcher, off by default). Big Next and Reveal buttons; keys in `src/core/keys.ts` (see [teacher-mode-keys.md](teacher-mode-keys.md)). Next reveals first where a slide has an answer, so a two-button clicker is enough. In teacher mode the same keys also drive ordinary practice (1 to 4 choose, → Next, P play). |
| 6. Translations toggle | H or the top-bar button hides or shows the English / Japanese glosses (word meanings, line translations, frame meanings); hidden by default (a teacher-menu switch changes the default). R reveals the current one. |
| 7. Dialogues as a class scene | One slide per line; lines build up on screen, the newest highlighted; each line has ▶ and 🐢. ⚡ reply steps show the three replies numbered for the class to call out, then Reveal marks the right one and adds the line to the scene. Chapter dialogues are shown line by line (no reply steps). |
| 8. Notes in full | Card notes show in full on Reveal (the «kasihan» note); line notes always show under their line (the «balut» note). |
| 9. Menu links | Teacher menu on Home: Teacher Desk link, Full screen, keys, TV help; Students and memory cards are added in Part 3. |
| 10. Mirroring | Layout in rem from the viewport, checked at 844×390, 932×430 (CSS media queries for short screens), 1180×820, 1280×720 and 1920×1080; a gentle «turn your phone sideways» line on an upright phone. Screen Wake Lock (`src/core/screen.ts`) while teacher mode is on, asked again when the page is visible again, silent where missing. Full screen button only where the Fullscreen API exists; on iPhone the menu says to add Kata-Kata to the Home Screen (en, ja, ms). Audio: `speak()` no longer waits before `speechSynthesis.speak()` once the voices are loaded, so speech starts inside the tap or key press (iOS's rule), and voices are loaded as soon as teacher mode turns on. Recorded clips were already played inside the tap. |

**Also changed:** `public/manifest.webmanifest` orientation `portrait` → `any`, so an installed app (Android) can turn sideways for the TV. iOS ignores the manifest orientation, so iPhones are unchanged; on Android the installed app now rotates with the phone (the phone layout already works in landscape).

**Phone layout with teacher mode off:** every new rule is under `:root[data-teacher]` or on new class names; smoke, fun, nombor and stretch e2e pass unchanged.

Unit tests: 214 → 226 (`tests/unit/teacher.test.ts`: keys, the device setting, the unlock bypass, a class run leaves state, 🔥 and the saved copy identical, class slides). New e2e `tests/e2e/teacher.cjs` (61 checks): teacher mode on in Settings, the chapter 4 dialogue and a ⚡ 4 frame round with keys only, off from the badge, saved state and 🔥 identical; ⚡ open in teacher mode only; at 844×390 the launcher, a frame and a reply step fit without scrolling; screenshots in `docs/teacher-mode/`.

## 4. Part 3: memory cards, progress reports and student slots

| Brief item | Built |
| --- | --- |
| 1. 💾 Memory card | The existing savefile, unchanged in format and checksum (`buildSavefile` / `parseSavefile`, savefile version still 1: the new fields are filled by `migrate()`, so no bump was needed; a unit test loads an old save with no mistake log). Filename `katakata-card_<name>_<YYYY-MM-DD>.json` (`cardFilename`). Rekod's savefile section is now **💾 Memory card** (en "Memory card", ja 「メモリーカード」, ms «Kad memori») with **Save memory card** and **Load memory card**; the teacher menu has both too. The preview shows name, chapter, words known and date. Learner mode: Merge or Replace; a card with **another student's name cannot be merged**, and Replace needs a confirmation naming both students. Teacher mode: Load plugs the card in as a slot (item 4). Before any load or slot update, the learner it would change is **auto-saved** (IndexedDB `autosaves`, newest three); Rekod offers **Undo the last load**. |
| 2. 📝 Mistake log | `state.mistakes = { log, counts }` (`src/core/types.ts`, `src/core/mistakes.ts`), added in `migrate()` with `schemaVersion` unchanged (empty for old saves). Recorded on every wrong answer: Kad Kata MC (`kad-mc`) and recall (`kad-recall`, «わからない» or Again), Susun Ayat (`susun`, the built sentence and any decoys left in), reply steps (`reply`), Cari Benda (`cari`), Laju! (`laju`) and Nombor & Masa rounds (`nombor`, item `nombor:<part>:<answer>`). Each entry: item ID, game, the answer (null = didn't know), the right answer, the date. The log keeps the newest 300 entries; the per-item counts are kept for good. Merges union the logs and keep the larger count. Class runs never write to it (they play on a copy). It is part of the memory card. Nombor & Masa rounds played per part are recorded too (`state.nombor`), for the report. |
| 3. 📄 Progress report | `src/core/progressreport.ts`: one self-contained HTML file (inline CSS, no fonts, scripts, images or links outside it), readable on a phone and printable on A4 (`@page A4`), `katakata-report_<name>_<YYYY-MM-DD>.html`. Language: ja if the app is in Japanese, otherwise en; the Malay is always shown. Contents: name, date, words known, minutes this week, streak; next steps (from the data: the class prep of the chapter the student is on, a dialogue to replay for its 🔥, an unfinished earlier chapter, an open ⚡, the mistakes, due reviews, daily practice); per chapter (started chapters): words known, 🔥 lit, ⚡ open or done; Nombor & Masa parts played (a list: the mode has no chapters); weakest words; **Mistakes to review** grouped by word, sentence or line, each with what was answered, the right answer and the card or line note; the student's Tanya Cikgu questions. The full TeacherReport JSON is embedded as `<script type="application/json" id="katakata-report">` (escaped so no text can close the script). Made from Rekod (**📄 Progress report**) and from each student slot. |
| 4. 👥 Student slots | `src/core/slots.ts`, `src/views/students.ts` (route `#/students`, teacher mode only). The list shows name, last played, current chapter and words known. Plug in a card as a new slot, or, when the name matches a slot, see both dates and choose **Update** (the card is merged in; the slot is auto-saved first) or **Keep both**. Switch (the slot being left is saved first), save a slot's card, make its report, delete it (with confirmation; never your own slot or the active one). Your own learner is the slot `me`, the default. The active slot is the normal app state (`state`); others are kept under `slot:<id>`, the list under `slots`. A bright **👤 Playing as …** banner in the top strip and above ordinary practice on Home. While a student slot is active, ordinary play counts for that student; class runs never do. Display settings follow the device (a student's own are kept for their card). **Turning teacher mode off switches back to your own slot**, so the phone flow is never on a student's slot. With teacher mode off nothing of this shows. |
| 5. Teacher Desk | Accepts memory cards (`.json` / `.katakata`, checksum checked), progress reports (`.html`, the embedded JSON) and the existing report JSON (`src/teacher/files.ts`). A card's progress, weakest words, mistakes and next steps are derived from the learner inside it (`reportFromState`). Click a student's name for their own view (next steps, mistakes to review with answers, right answers and notes, weakest words, open questions); the class agenda adds **Mistakes across the class** (`mistakesAcrossClass`). New Desk text is translated (`?lang=ja` / `?lang=ms`; English by default, like the rest of the Desk). |

## 5. How learner data is protected

- **Class runs:** `beginClassRun()` saves the learner, then swaps the app's state for a deep copy. While it runs, `update()` writes to the copy and schedules no save, and `saveNow()` does nothing (so page-hide saves cannot write it either). `endClassRun()` puts the learner's own object back, untouched; only display settings changed during the run are kept. The class slides themselves write nothing. Tested: a unit test "plays" every kind of write a game makes (reviews, frames, lines, a dialogue score, points, kana hints, study minutes, stamps, a mistake) inside a run, then checks the state, the 🔥 of every chapter and the saved copy are identical; the e2e plays the chapter 4 dialogue and a ⚡ 4 frame round with keys, turns teacher mode off from the badge and compares the saved state byte for byte and the 🔥 on the Class prep list.
- **Teacher mode itself** is a device setting under its own key, never in the learner state or a card.
- **Switching slots:** the slot being left is saved first (`saveActiveSlot`), then the other is loaded whole; nothing is shared between slots but the device's display settings. Tested (unit and e2e): a round played in Aiko's slot changes Aiko only; Ben's slot is byte-identical afterwards; Sam's own learner is identical after switching back or turning teacher mode off.
- **Loading a card:** always auto-saves the learner it would change first (Undo in Rekod); never merges a card with a different name into the current learner; in teacher mode a matching name asks Update or Keep both, with both dates.

## 6. Keys

| Keys | Action |
| --- | --- |
| → · Space · PageDown | Next (reveals first where a slide has an answer) |
| ← · PageUp | Back |
| 1 2 3 4 (up to 9 on a board) | Choose an option; in a frame, place the nth tile |
| R | Reveal |
| H | Hide or show translations |
| P | Play the Malay |

Printable, en and ja: [teacher-mode-keys.md](teacher-mode-keys.md). Keys are ignored while typing in a field or with Ctrl, Cmd or Alt. In teacher mode the same keys also drive ordinary practice (1 to 4, → Next, P).

## 7. File formats (examples in [examples/](examples/), from the test learner "Aiko Test")

- **Memory card** `katakata-card_<name>_<YYYY-MM-DD>.json`: `{ app: "katakata", kind: "katakata-savefile", schemaVersion: 1, savedAt, checksum, state }`. `checksum` = SHA-256 of the state as stable JSON (sorted keys). `state` is the whole learner (`AppState`), now with `mistakes: { log: [{ id, game, answer, right, date, decoys? }], counts: { <id>: n } }` and `nombor: { <part>: { plays, best, total, last } }`. Example: [katakata-card_Aiko-Test_2026-11-17.json](examples/katakata-card_Aiko-Test_2026-11-17.json).
- **Progress report** `katakata-report_<name>_<YYYY-MM-DD>.html`: one HTML file; examples in [English](examples/katakata-report_Aiko-Test_example-en.html) and [Japanese](examples/katakata-report_Aiko-Test_example-ja.html).
- **Embedded report JSON** (`<script type="application/json" id="katakata-report">`): the TeacherReport of the send-to-teacher file (`kind: "katakata-teacher-report"`, version 1) with every section, plus `streak`, `knownWords`, `mistakes` (grouped: `id, kind, game, text, en, ja, right, answers, decoys, count, last, chapter, note, note_ja`), `nombor`, `nextSteps` (English) and `source`. Example: [katakata-report-embedded_Aiko-Test_example.json](examples/katakata-report-embedded_Aiko-Test_example.json). Older report files without the new fields still load in the Desk.

## 8. Tests

| | Before (`2d1161f`) | After |
| --- | ---: | ---: |
| Unit tests | 210 | 240 (Part 1 +4 in `stretch.test.ts`; Part 2 +12 in `teacher.test.ts`; Part 3 +14 in `cards.test.ts`) |
| e2e smoke | pass | pass (now saves a memory card; its filename is checked) |
| e2e fun | 11 | 11 |
| e2e nombor | 16 | 16 |
| e2e stretch | 116 | 116 |
| e2e teacher | – | 61 |
| e2e cards | – | 26 |
| Build | pass | pass |

Checks: `npm run check && node tests/e2e/smoke.cjs && node tests/e2e/fun.cjs && node tests/e2e/nombor.cjs && node tests/e2e/stretch.cjs && node tests/e2e/teacher.cjs && node tests/e2e/cards.cjs` (against `vite preview --port 4173`).

## 9. Screenshots

- **Teacher mode** ([teacher-mode/](teacher-mode/)): `<width>x<height>-<theme>-NN-<screen>.png` at 1280×720, 1920×1080, 844×390 and 1180×820, in kancil light and rebel dark: 01 launcher, 02 word card with translations hidden, 03 revealed, 04 a ⚡ frame, 05 revealed, 06 the ⚡ dialogue mid-scene (translations shown), 07 a reply step, 08 revealed, 09 Cari Benda, 10 Nombor & Masa (Masa round), 11 revealed, 12 Settings with the switch; and `390x844-<theme>-13-upright-hint.png`.
- **Part 3** ([teacher-mode/cards/](teacher-mode/cards/)): Students screen (`1280x720-students`, `390x844-students`), the slot banner (`…-slot-banner`), the load-card preview with the name-match prompt (`…-load-card-preview`), Rekod refusing to merge another student's card (`1280x720-rekod-other-student`), Rekod's memory card section (`390x844-rekod-memory-card`), the progress report on a phone (`390x844-report-en`, `-ja`) and as A4 print preview (`a4-print-report-en`, `-ja`), the Teacher Desk student view (`1280x720-desk-student`, `390x844-desk-student`).

## 10. Guide for Sam

[teacher-guide.md](teacher-guide.md): teacher mode on a TV, the memory-card routine for one-to-one lessons, and what to try first in class.

## 11. Questions for Sam

1. **Chapter dialogues in class** are shown line by line with no reply steps (the ⚡ dialogues have them). Do you want reply steps for chapter dialogues too (their wrong replies would be other lines of the same dialogue, as in the app)?
2. **Translations start hidden** in a class run (H shows them; a teacher-menu switch changes the default). Right default?
3. **Next reveals first**, then moves on, so a two-button clicker is enough. Or should Next skip straight to the next slide?
4. **Words** in the launcher are the chapter's Sedia Kelas words (Laju! uses all its words). Do you also want "all chapter words" as a class activity?
5. **Updating a slot from a card merges** (per word, the more recent schedule wins), after an auto-save. Would you rather it replaced the slot with the card?
6. **Display settings follow your device** in a student's slot (their own language and palette stay in their card). OK?
7. **Manifest orientation is now `any`**, so the installed app can turn sideways on Android for the TV (iPhone ignores this setting). On Android, students' installed app now rotates with the phone. Keep it, or lock portrait again and accept no sideways teacher mode on an installed Android app?
8. **Ledger sheet:** `Ledger!D1865` (L-1864 «tetapkan») → 定める、決める and `Ledger!D1898` (L-1897 «letupkan») → 爆破する, with a Journal row. This session did not touch the sheet (only this repo); the snapshot already has them.
9. **Native checks:** all new Japanese (teacher mode, memory cards, report, the «tapi» and «kasihan» notes) and Malay interface text are drafts.
10. The **Teacher Desk** was English only; the new parts follow `?lang=ja` / `?lang=ms`. Translate the rest of the Desk too?
