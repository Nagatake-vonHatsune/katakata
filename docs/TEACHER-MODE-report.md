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

## Part 2: teacher mode

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
