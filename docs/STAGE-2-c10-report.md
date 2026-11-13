# Stage 2, build step 3a: stage-aware affix guard and pack c10 (13 Nov 2026)

**What this is.** The report for the Kata-Kata half of Stage 2 build step 3, for chapter 10 only, which Sam authorised
on 13 Nov 2026. Sources: Cikgu Sensai `docs/stage-2-plan.md` (units 10A and 10B, section 3 affix rules, section 5 scenes),
`docs/stage-2-decisions.md` (Sam's answers), `docs/STAGE-2-step2-report.md` ("Left for Kata-Kata"),
`curriculum/stage-rules.json` and `curriculum/stage-rules-fixtures.json`, all at Cikgu Sensai `56627dc` (read only).
The Malay ledger (Google Sheet) was the source of truth; its snapshot was synced first (L-0001 to L-1266, `acff0ca`).
The next chapters follow the template in [HANDOFF.md](HANDOFF.md).

**Result:** 920 → **958** live cards, 34 → **35** packs. `npm run check` (types, 47 unit tests, content check, build) and
both end-to-end tests (`smoke.cjs`, `fun.cjs`) pass.

| Commit | What |
|---|---|
| `acff0ca` | Ledger snapshot synced from the sheet (Stage 2 rows L-1089 to L-1266) |
| `9849ff0` | Stage-aware affix guard |
| `dd9160d` | Pack c10, Vocab Bank v6, importer and schema |
| `0f070fc` | Ledger snapshot after the chapter 10 write-back |

## 1. The affix guard

- **Rules are data now.** `content/rules/stage-rules.json` is an unedited copy of Cikgu Sensai's
  `curriculum/stage-rules.json` at `56627dc` (with the fixtures and the proper-noun list); `content/rules/SOURCE.json` records
  the commit and SHA-256 of each file, and a unit test fails if a copy is edited. The hard-coded gates and `ALLOW_LIST` are gone.
- **`tools/stage-rules.mjs`** ports Cikgu Sensai's `Checker` (`language_checks.py`) line by line: affix gates (ber- 10, meN- 11,
  -kan and -i 12, accident ter- 16), the Stage 1 rules (-nya, -kah, -an, ke-, se-, di-, superlative ter-), whole words, look-alike
  roots, strict placement from the ledger's place column, register pairs, the «lah» / «kan» rule for answer keys and the
  disallowed (Indonesian) forms. Kata-Kata reads its own ledger snapshot and its own Kelas packs instead of Cikgu Sensai's copies.
- **The chapter is passed to the guard.** `tools/affix-guard.mjs` checks every card, frame and scenario line at its own pack's
  chapter. A chunk, lex or recognise-only exemption applies only from its own chapter and only inside the text that contains
  the whole phrase, so a chapter 12 chunk can never make a word legal in chapters 1 to 9.
- **What blocks the build:** "affix" and "malaysian-form" findings in every pack with a chapter; every check (also "register",
  "ledger" placement and ledger gaps) in Stage 2 Kelas packs (chapter 10 on); only "malaysian-form" in the Jambatan packs (see
  question 1). Stage 1 "register" findings (10) and ledger gaps (5) are counted, not blocking, as they were never checked before.
- **Fixtures: 72 of 72 pass, and the JavaScript and Python agree on every case**, compared on the full violation keys
  (unit, check, word), not only pass or fail. I ran Cikgu Sensai's own `Checker` twice: on its own data, and on Kata-Kata's ledger
  and packs. `tests/unit/stage-rules.test.ts` runs the fixtures in CI.
- **Chapters 1 to 9: 0 affix flags.** All Kata-Kata content (35 packs) was also run through both checkers: identical results
  (10 violations, all Stage 1 register findings; 5 ledger gaps).
- `node tools/stage-check.mjs <chapter> "<line>" ...` checks lines before they go into the workbook.

## 2. Pack c10 (ber- verbs, units 10A and 10B)

| | Count |
|---|---|
| Class cards | **41**: 20 for unit 10A, 20 for 10B, plus L-0667 «pindah» (recognise only: the spoken partner of berpindah) |
| Frames | 6 (`ms-c10-f01` to `f06`), examples from the plan (bekerja di Kuala Lumpur; bercakap … dengan jiran saya) and Sam's «Pukul berapa kita bertolak?» |
| Scenario | 19 lines: 10A, Tanaka tells Puan Aini about his working day and weekend; 10B, he meets his neighbour Puan Siti |
| Sedia Kelas | 20 chapter 10 cards (those in the frames and scenario) and 13 review cards from chapters 1 to 9: the plan's revision anchors (kerja, jalan, cakap, main, belajar, hujung minggu, sarapan, umur) and the class-card roots of the ber- forms used (tolak, mula, asal, sekolah, dua) |

- Every card takes its ledger row's Malay, English, draft Japanese, part of speech and affix tag. Each ber- card shows its
  root from the ledger's "Root (KD4)" column, with the chapter where Kata-Kata teaches that root. The only other notes are
  the plan's (be- before r and in bekerja; standard and everyday forms; pengalaman as a whole word; bertolak changing meaning)
  and usage examples built from chapter 1 to 10 words.
- Every frame example, scenario line and card term passes all four checks at chapter 10: only words placed in chapters 1 to 10,
  no spoken forms («tak», «tak apa») and no Indonesian forms. The note examples were checked too.
- The three Jambatan cards for jiran, pindah and sepupu were dropped by the bridge importer (Hanashishou `e5e167c`, which
  reproduced the current packs byte for byte first).
- The Hanashishou starting band still depends on chapters 1 to 9 only (question 2).

## 3. Ledger and Journal

- **Written (Ledger tab):** column J (card IDs) for 41 rows and column K (place) for 3 of them (L-0660, L-0667, L-0714: the
  Jambatan part removed): 44 cells. The whole tab was read back and compared with the pre-write read: exactly those 44 cells
  changed (`tools/ledger/writeback.py verify`). Action "KD4 check" was kept; "Last changed" was not touched (as in the clean-up).
- **Journal rows 148 to 151:** the guard change; L-1089 to L-1122; the four existing ber- rows; jiran, sepupu and pindah.

## 4. Not verified

- **Kamus Dewan:** none of the chapter 10 forms was checked (end of the project, Sam). The be- spelling rule is the plan's
  [INFERRED] reading of secondary sources.
- **Japanese:** card meanings are the ledger's drafts; the chapter title, scenario title and frame meanings are my drafts. All for
  the native review.
- **Malay naturalness** is my judgement; please read the 19 scenario lines and 6 frames. Points I am least sure of:
  «Itu pun bagus!», «Encik datang, ya!» as an invitation, «berminat untuk belajar …», the card note «berhenti kerja = to quit a job»,
  and «berpakaian kemas» glossed "neatly dressed".
- The plan's 10B speaking link (Hanashishou `grab_ride_chat`, `new_neighbour`) is not used in Kata-Kata; the scenario is new.

## 5. Questions for Sam

1. **Jambatan and the guard.** The Jambatan packs carry Hanashishou words Kata-Kata does not teach (tertinggal, silakan …). Under
   the new rules four of them would fail at chapter 9, so the guard treats Jambatan as outside the chapter sequence (like Cikgu
   Sensai's unplaced packs): only the Indonesian-form check applies. Keep it that way?
2. **Hanashishou band.** "Band 2 once every chapter is ready" now means chapters 1 to 9 only, so adding Stage 2 chapters does
   not change it. Should finishing Stage 2 suggest a higher band later?
3. **Ledger tags.** L-0779 berjiran, L-0781 berkenalan, L-0807 bersiap and L-0916 bersedia have no Affix tag; their cards say
   ber-. Fill "ber-" in the ledger (a ledger session)?
4. **Sedia Kelas for chapter 10 has no Dunia scene**, so it has no Cari Benda round. Add a picture scene for chapter 10 later,
   or leave it?
5. L-0657 «tempat kerja» (left unplaced in step 1) is still waiting for your answer; chapter 10 does not use it.

## 6. For other sessions

- **Cikgu Sensai:** refresh `curriculum/reference/katakata/` with `c10.json` and the ledger copy (its checker already loads
  every pinned chapter file). Not done here: this session does not edit Cikgu Sensai.
- **Kata-Kata c11 to c18:** follow [HANDOFF.md](HANDOFF.md).
