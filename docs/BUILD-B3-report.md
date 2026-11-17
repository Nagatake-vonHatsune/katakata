# Build B3: Sam's answers to the B2 questions, his Malay fixes, and the Jambatan words (report)

**17 Nov 2026 · Claude.** Brief: Sam's Build B3 message of 17 Nov 2026. Read first: [HANDOFF.md](HANDOFF.md), [BUILD-B2-report.md](BUILD-B2-report.md),
[BUILD-B1-report.md](BUILD-B1-report.md), [VOCAB-PLACEMENT-proposal-report.md](VOCAB-PLACEMENT-proposal-report.md) and the proposal CSV.
`main` was at `b63ce9d` and did not move during the session (fetched before every push; nothing to rebase). Only this repo was edited;
Hanashishou was checked out read-only at `4be57ac` in `../hanashishou` for the audit and the importer.

## Summary

- **All seven B2 answers are applied.** «satu per satu» is merged into L-1532; L-1638 is retired. «bisnes» is a Jambatan card paired with «perniagaan»; «takkan» stays out. Line notes now show under their own line.
- **Sam's five Malay fixes are in.**
  - ⚡ 11 uses «hantar».
  - ⚡ 13 and ⚡ 15 use Sam's lines; in ⚡ 15 the lines around «Pelik! Cepat, bagi dia kopi.» were rewritten so the reason is clear.
  - ⚡ 17 has a new dialogue.
  - In ⚡ 18 the line is rewritten («kehidupan» has no row, and ⚡ 18 has no new words).
- **Jambatan: 302 → 512 cards in nine scenes.** «Events and outings» is now «Parties and food» (58) and «Music and shows» (50). The 211 new rows are placement batch 2's Jambatan words plus «bisnes».
- **⚡ 17 casual words.** Four standard/spoken pairs (kasihan/kesian, semakin/makin, emak/mak, mengantuk/ngantuk), standard card first, all used in the new dialogue.
- **Ledger.**
  - 218 new rows (L-1817 to L-2034) and 56 cells of existing rows, written with `insert_dimension` + `update_values`.
  - Read before and after; `verify` OK; no word twice among live rows.
  - Journal rows 257 to 261, all Open.
- **Guard 0 flags for every pack.** 67 packs, 1981 cards. Unit tests 204 → 210; e2e stretch 101 → 116 checks; smoke, fun (11) and nombor (16) pass.

## 1. Final main hash and commits

| Commit | What |
| --- | --- |
| `c84fede` | Line notes show under their own line (answer 7); unit and e2e checks |
| `8d259c9` | The merge, the ⚡ 11/13/15/18 fixes, the new ⚡ 17 dialogue and casual words, the Jambatan batch and scene split; the ledger snapshot with the planned cells; tests and screenshots |
| `eb9d3ae` | ⚡ 17: a wrong reply no longer shows «mak» before the dialogue's first «emak» |
| this report | Report, HANDOFF, README, CHANGELOG |

**Final `main`:** the commit that adds this report. The commit before it is `eb9d3ae`.

- Every commit was made only after `npm run check` and all four e2e suites passed on that exact tree. `c84fede` was tested on its own in a separate worktree (205 unit tests; stretch 102 checks).
- No separate snapshot commit: the snapshot made from the sheet read-back is byte-identical to the one committed in `8d259c9`.

## 2. What changed, per answer

| B2 question | Sam's answer | Done |
| --- | --- | --- |
| 1. «satu per satu» | Merge | L-1532 is now «satu per satu» (tag chunk), card ms-x03-022. Its note says, en: "One by one, one at a time: «jawab soalan satu per satu» … «satu-satu» is also heard."; ja: «satu-satu» とも言います。<br>L-1638 is Retired, like L-1303: no card, place «Retired: merged into L-1532», note says why.<br>ms-x03-023 is in `RETIRED_IDS` and `MOVED_CARDS` → ms-x03-022, so its schedule moves once and never overwrites one already on ms-x03-022 (unit test).<br>**No ⚡ 3 line or frame needs the retired card:** the frame «Pelajar itu jawab soalan satu per satu.» now matches L-1532, and no ⚡ 3 text has «satu-satu» (unit test). |
| 2, 3, 5, 6 | Stay as built | Unchanged. This also decided the ⚡ 18 fix (section 3). |
| 4. «takkan», «bisnes» | «bisnes» to Jambatan, paired with «perniagaan»; «takkan» stays out | «bisnes» is L-2027, Jambatan · Daily life, card ms-j-daily-life-108.<br>Its card note says "Spoken form; standard: perniagaan." (the importer's `SPOKEN` pairs), and the ledger row says the same.<br>«takkan» has no row. |
| 7. Line notes | With their own line | Lines that are not reply steps used to be invisible, so a note jumped to the next reply step. Now every line is shown once, in order:<br>• lines before the first prompt lead the first reply step;<br>• lines after an answer follow that answer;<br>• a note sits directly under its line.<br>The ⚡ 8 «bungkus» / «balut» note now follows the answer to line 9, under «Tolong bungkus, ya.» (screenshot `x08-line-note-kancil-light`); the line 13 step shows no note (e2e). Code: `lineContext` in `src/core/session.ts`, `src/games/reply/index.ts`. |

## 3. Sam's Malay fixes

| ⚡ | Before | After |
| --- | --- | --- |
| 11 | «Encik Tanaka, tolong memberi slaid produk kita kepada mereka.» | **«Pukul sepuluh. Encik Tanaka, tolong hantar slaid produk kita kepada mereka.»** (en "please send them the slides on our products") |
| 13 | «Sepatutnya Encik makan kurang nasi lemak dan roti canai.» | «Mungkin sebab makanan. Encik patut kurangkan makan nasi lemak dan roti canai.» |
| 15 | lines 11 to 13 | see below |
| 17 | the beach trip | a new dialogue (section 4) |
| 18 | «Bagaimana hidup Encik di sini sekarang?» | «Encik seronok tinggal di sini sekarang?» (en "Are you enjoying life here now?") |

- **⚡ 11, the line I chose.**
  - «berikan» is L-1166, a Ch12 core word, and «beri» is a ⚡ 4 word, so the guard blocks both in ⚡ 11.
  - «hantar» (L-0528, Dunia, primes Ch2) is placed long before chapter 11.
  - No guard exception was added.
- **⚡ 15.** The old line 11 said the manager is "the only person in the office who doesn't drink coffee", which made "give her a coffee" puzzling. Now:
  - 11 Cik Mei Ling: «Ya. Sebelum minum kopi, dia tidak mahu bercakap dengan sesiapa. Pagi ini dia belum minum kopi.» (Before her coffee she won't talk to anyone, and she hasn't had it yet this morning.)
  - 12 Tanaka: «Pelik! Cepat, bagi dia kopi.»
  - 13 Cik Mei Ling: «Baik, saya buat kopi untuk dia sekarang. Tetapi jangan beritahu sesiapa saya cakap begini.», with the wrong replies «Baik, saya minum kopi dia sekarang.» and «Jangan! Dia satu-satunya gergasi di pejabat.»
  - So «dia» is the new manager, and the reason is that she has not had her coffee.
- **⚡ 18, rewritten, no row.** «kehidupan» has no row. A Ch18 (extension) row would give ⚡ 18 its first card, but Sam kept ⚡ 18 as "harder review, no new words" (answer 6). So the line was rewritten instead.
- **⚡ 13** no longer uses the ⚡ 13 card «sepatutnya». The card stays.

## 4. The new ⚡ 17 dialogue: «A sleepy morning» (ja draft 「眠い朝」)

Monday morning at the office.

- Tanaka speaks standard Malay. Cik Mei Ling, a colleague, answers casually, so each casual form comes right after its standard partner in the scene as well as in the cards.
- There are 12 lines and 5 reply steps.
- **«tetapi» is used only in Tanaka's standard lines.**
- **«tapi» is not used.** No pack labels it as spoken: the c05 card «tetapi / tapi» has no note, which is the Stage 1 register finding.
- Joined -lah appears in «Takpelah», «rehatlah» and «Jomlah».

| # | Speaker | Malay | English | Wrong replies |
| ---: | --- | --- | --- | --- |
| 1 | Tanaka | «Selamat pagi, Cik Mei Ling. Maaf, hari ini saya sangat mengantuk.» | Good morning, Ms Mei Ling. Sorry, I'm very sleepy today. | |
| 2 | Cik Mei Ling | «Pagi! Ngantuk? Kenapa? Semalam tak tidur?» | Morning! Sleepy? Why? Didn't you sleep last night? | «Pagi! Ngantuk? Bagus, mesyuarat kita sepanjang hari!» / «Pagi! Ngantuk? Jom kita tidur kat bilik mesyuarat!» |
| 3 | Tanaka | «Emak saya datang dari Jepun semalam. Kami bercakap sampai pukul dua pagi.» | My mother arrived from Japan yesterday. We talked until two in the morning. | |
| 4 | Cik Mei Ling | «Wah, mak Encik datang? Seronoknya! Dia tinggal berapa lama?» | Wow, your mum's here? How lovely! How long is she staying? | «Wah, mak Encik datang? Saya tak tau Encik ada mak!» / «Wah, mak Encik datang? Bagus, dia boleh kerja kat pejabat kita!» |
| 5 | Tanaka | «Dua minggu. Tetapi kasihan emak saya. Dia tidak boleh tahan makanan pedas.» | Two weeks. But my poor mother: she can't handle spicy food. | |
| 6 | Cik Mei Ling | «Kesian dia! Takpelah, saya tau kedai yang tak pedas. Jom bawa mak Encik makan kat sana.» | Poor thing! Never mind, I know a place that isn't spicy. Let's take your mum to eat there. | «Kesian dia! Bagi dia cili yang paling pedas.» / «Kesian dia! Jom kita makan semua makanan dia.» |
| 7 | Tanaka | «Terima kasih! Emak saya mesti suka. Dia kata bahasa Melayu saya semakin baik.» | Thank you! My mother is sure to like it. She says my Malay is getting better and better. | |
| 8 | Cik Mei Ling | «Betul, makin baik! Nanti Encik cakap dengan pekerja kedai dalam bahasa Melayu, ya.» | It's true, it's getting better! You can talk to the staff at the shop in Malay, okay? | |
| 9 | Tanaka | «Boleh. Hari Sabtu, pukul satu?» | Sure. Saturday, at one? | «Boleh. Saya cakap bahasa Jepun sahaja.» / «Merepek! Emak saya tidak makan.» |
| 10 | Cik Mei Ling | «Set! Jumpa hari Sabtu. Sekarang Encik rehatlah dulu.» | Deal! See you on Saturday. Now get some rest first. | |
| 11 | Tanaka | «Terima kasih, Cik. Saya minum kopi dulu.» | Thank you. I'll have a coffee first. | «Terima kasih, Cik. Saya tidur di meja Cik dulu.» / «Tak apa. Saya tidur dalam mesyuarat.» |
| 12 | Cik Mei Ling | «Tak ada hal. Jomlah, saya belanja kopi!» | No problem. Come on, the coffee's on me! | |

**The ⚡ 17 cards (23):** the 15 from B2, then:

- 016 kasihan, 017 kesian
- 018 semakin, 019 makin
- 020 emak, 021 mak
- 022 mengantuk, 023 ngantuk

Each standard card comes before its spoken partner (unit test). Each spoken card's note begins "Spoken: «kesian» for «kasihan» (above)". The six B2 frames are unchanged.

## 5. Jambatan count per scene

| Scene | Before (`b63ce9d`) | After |
| --- | ---: | ---: |
| Daily life | 82 | 109 |
| At work | 54 | 77 |
| Home and condo | 38 | 59 |
| Health | 30 | 43 |
| Social: Talking and explaining | 30 | 56 |
| Social: Feelings and opinions | 21 | 42 |
| Social: Events and outings | 45 | (split) |
| Social: Parties and food | | 58 |
| Social: Music and shows | | 50 |
| How to play | 2 | 18 |
| **All** | **302** | **512** |

Health lost «mengantuk» (now ⚡ 17).

**The split** is my draft, in `SOCIAL_SPLIT`:

- Parties and food: food, parties, weddings, plans and outings.
- Music and shows: music, singing, films and stage, fireworks displays, and Jinx's demo-day and workshop words, as the closest fit (dron, demo, kimpal, gogal …).
- Sam may move words: edit `SOCIAL_SPLIT` and rerun the importer. IDs never change.
- Titles: ms «Parti dan makanan», «Muzik dan persembahan»; en as Sam named them; ja drafts 「パーティーと食べ物」「音楽とショー」.

**How it was built:**

- `tools/bridge-metfirst.sh ../hanashishou` was rerun on the new snapshot: 506 met-first ledger rows.
- Then `python3 -I tools/import_hanashishou_bridge.py ../hanashishou`. A second run gives identical packs and map.
- The remade audit no longer meets L-1410 «hari bulan», because Hanashishou still writes «haribulan». Its card kept its place and ID, but would have lost its note, so the importer now keeps the old note of a card no scene meets.

## 6. Ledger and Journal

Sheet `1X8t3ENRVUY_NHJ3xEB7UY3OiwwUg_KUZT-ESbtiMC0o`, tab Ledger. Plan: `tools/ledger/b3_batch.py` → `tools/ledger/batches/b3-plan.json`.

1. **Before read** (A1:T600, A601:T1817).
   - It was identical to the `b63ce9d` snapshot: 0 cells differed, so there were no edits by Sam to keep.
   - All 56 planned "before" values matched.
2. **`insert_dimension`** for rows 0-based 1817 to 2035, then **`update_values`** `A1818:T2035` in 9 chunks. `append_values` was not used.
3. **Existing rows.**
   - Column K of the 45 moved rows: two calls over K705:K873 and K1310:K1491. Unplanned cells in those ranges were written with their unchanged values.
   - The three changed rows: L-0768 J:K, and L-1532 and L-1638 written as whole rows.
4. **After read** (A1:T600, A601:T2045), then `stretch_batch.py verify`:
   - **"56 changed cells in existing rows (56 planned), 218 new rows: OK"**.
   - Sheet row N holds L-(N−1).
   - The read-back equals the committed snapshot byte for byte.
   - **No word appears twice among live rows.**

| Rows | What | Origin |
| --- | --- | --- |
| L-1817 to L-2026 (210) | Jambatan, placement batch 2; place «Jambatan · <scene>» | Kata-Kata placement batch 2 (Sam approved 15 Nov) |
| L-2027 bisnes | Jambatan · Daily life | Sam approved 17 Nov |
| L-2028 to L-2034 | kasihan, kesian, semakin, makin, emak, mak, ngantuk: Ch17 (extension) | Sam approved 17 Nov |
| L-0768 mengantuk | promoted: J ms-j-health-37 → ms-x17-022, K Jambatan · Health → Ch17 (extension) | (place change) |
| L-1532 | B «satu-satu» → «satu per satu», F lex → chunk, R note added | |
| L-1638 | J cleared, K «Retired: merged into L-1532», P Retired, Q cleared, R note, T «Claude (Sam's decision)» | |
| 45 Events and outings rows | K only → Parties and food (25) / Music and shows (20) | |

**New row cells:**

- In both = Yes and Hanashishou (pack · band) from the metfirst CSV wherever the word is in Hanashishou. That is every Jambatan row and kesian, makin, mak, ngantuk.
- Column N = the English meaning.
- kasihan, semakin and emak are not in Hanashishou, so those cells are blank.
- Two proposal cells were changed because the pack schema has no such tag: «perbaharui» (tag `lex`, ja 更新する for the active verb) and «pustakawan» (tag `lex`).

**Journal (rows 257 to 261, all Open, read back):**

- 257: the Jambatan batch with «bisnes»;
- 258: the scene split;
- 259: the casual words and the «mengantuk» promotion;
- 260: the «satu per satu» merge;
- 261: the line fixes, ⚡ 11, 13, 15, 17 and 18.

## 7. Duplicates found, and words not added

- **«belon»** already has a row (L-1781, ⚡ 9, B2). It gets no Jambatan row.
- **«mengantuk»** already had a row (L-0768, Jambatan · Health). It is promoted to ⚡ 17, not duplicated.
- **The four spoken words** (kesian, makin, mak, ngantuk), which the proposal marked for Jambatan, are ⚡ 17 rows instead, as Sam asked.
- **Four proposal words get no row:** «pengarah», «jagung», «skru», «pangkat».
  - Hanashishou meets them only inside compounds of this batch («lembaga pengarah», «bertih jagung», «pemutar skru», «kenaikan pangkat»).
  - Once the compound has a row, the audit never meets the word alone, so it would be a Jambatan row with no card. The first importer run showed this.
- **Totals:** 219 − 1 − 4 − 4 = 210, plus «bisnes», gives 211 Jambatan rows.
- No other new word matched any ledger row, live, Retired or Jambatan, by word or by its "/" alternatives.

## 8. The four casual pairs, for the later Cikgu Sensai rules update

The shared `register_pairs` have none of these. The rules files were not edited.

| spoken | standard | from_chapter | Ledger |
| --- | --- | ---: | --- |
| kesian | kasihan | 17 | L-2029 / L-2028 |
| makin | semakin | 17 | L-2031 / L-2030 |
| mak | emak | 17 | L-2033 / L-2032 |
| ngantuk | mengantuk | 17 | L-2034 / L-0768 |

«bisnes → perniagaan» is already a pair, from chapter 17. Because «perniagaan» is a ⚡ 10 word, the Jambatan card «bisnes» is now a Stage 1 register *finding*: Jambatan has no chapter, so it does not block. It is the one new finding: 7 → 8.

## 9. Test counts

| | Before (`b63ce9d`) | After |
| --- | --- | --- |
| content | 66 packs, 1764 cards; 0 flags, 31 derivations; Stage 1: 7 register, 5 ledger gap | 67 packs, 1981 cards; **0 flags**, 34 derivations; 8 register (+ Jambatan «bisnes»), 5 ledger gap |
| `npm test` | 204 tests, 5 files | 210 tests, 5 files |
| `tests/e2e/smoke.cjs` | passes | passes |
| `tests/e2e/fun.cjs` | 11 checks | 11 checks |
| `tests/e2e/nombor.cjs` | 16 checks | 16 checks |
| `tests/e2e/stretch.cjs` | 101 checks | 116 checks |

**New unit tests:**

- the merge: the moved card keeps its schedule and never overwrites one; L-1638 is Retired; no ⚡ 3 text needs it;
- the scene split: all 45 old IDs are unchanged, each is in one of the two new scenes, and the ledger K matches;
- the line-note placement: lines are shown once and in order in every ⚡ dialogue, and the ⚡ 8 note follows line 9;
- ⚡ 17 standard before casual: in the cards and in the dialogue, with «Spoken:» notes, no «tapi», no «tetapi» with casual words, joined -lah;
- the ⚡ 11/13/15/18 lines;
- every new Jambatan row has a card in the scene its place names; «bisnes»; no duplicate live word.

**New e2e checks:**

- the ⚡ 8 note under its own line, and none in the next step;
- ⚡ 17 played whole (5/5), each standard form on screen before its casual partner;
- both new Jambatan scenes listed in Jaring with all their words (58, 50), and no «Acara dan keluar»;
- the ⚡ 3 «satu per satu» card with its note.

`tests/e2e/bridge.cjs` was not run: it needs Hanashishou served on port 4179.

## 10. Screenshots (`docs/stretch-stage/`, Pixel 7, kancil light)

| File | Screen |
| --- | --- |
| `x17-dialogue-1-kancil-light` | the first ⚡ 17 reply step («… saya sangat mengantuk.» → «Pagi! Ngantuk? …») |
| `x17-dialogue-3-kancil-light`, `x17-dialogue-4-kancil-light` | the «Kesian dia! Takpelah …» step and the «makin baik» step |
| `x17-screen-kancil-light` | the ⚡ 17 screen with its 23 words |
| `x08-line-note-kancil-light` | **a line note on its own line**: after the line 9 answer, line 10, then «Tolong bungkus, ya. Ini hadiah.» with the «balut» note under it |
| `jambatan-social-parties-kancil-light`, `jambatan-social-music-kancil-light` | the two new Jambatan scenes, every word (long images) |
| `x03-card-satu-per-satu-kancil-light` | the ⚡ 3 card «satu per satu» with its note open |
| `x03-screen-kancil-light` | the ⚡ 3 screen (22 words) |

The reply-step shots `05-reply-step-*` and `04-decoy-frame-*` were retaken and show the new layout.

## 11. Malay lines I am unsure of

Every line is mine and unchecked by a native speaker.

- **⚡ 17**
  - «Semalam tak tidur?» (no «ke»: «ke» has no row)
  - «Dia tinggal berapa lama?»
  - «Tetapi kasihan emak saya.» (is «kasihan» natural before the noun here, or «Kasihan, emak saya …»?)
  - «Jom bawa mak Encik makan kat sana.»
  - «Dia kata bahasa Melayu saya semakin baik.» / «Betul, makin baik!» (is «makin» really the spoken partner, or simply a shorter standard word?)
  - «Nanti Encik cakap dengan pekerja kedai dalam bahasa Melayu, ya.»
  - «Sekarang Encik rehatlah dulu.»
  - «Encik» between colleagues who are friends: would Cik Mei Ling use his name?
- **⚡ 15:** «Sebelum minum kopi, dia tidak mahu bercakap dengan sesiapa. Pagi ini dia belum minum kopi.» and «Baik, saya buat kopi untuk dia sekarang.»
- **⚡ 18:** «Encik seronok tinggal di sini sekarang?»
- **⚡ 11:** «tolong hantar slaid … kepada mereka» (send vs hand over: in person, «beri» or «berikan» would be the usual word)
- **Ledger:** «tetapkan» and «letupkan» carry passive Japanese (定められる, 爆破される) from the proposal, where the scene form is di-. «perbaharui» was fixed; these two should be checked the same way.
- **Japanese:** all of it is draft, including the scene titles and the casual-card notes.

## 12. What Kata-Kata still needs before it can be used as class content

1. **A native read** of every ⚡ line: B1 section 8, B2 section 10 and section 11 here. ⚡ packs are about 250 lines of my Malay.
2. **The KD4 check** of the 529 rows added since Build B1, all marked «KD4 check» and «Not yet checked». Meanings, POS, tags and roots are my reading.
3. **The native Japanese check** of every ja string: cards, notes, scene and chapter titles, UI drafts.
4. **Sam's decisions still open:**
   - the Events split (`SOCIAL_SPLIT`);
   - «hai» / «helo» (B1);
   - whether c05 «tetapi / tapi» should get a «Spoken:» note, so «tapi» can be taught;
   - the Open Journal rows to close (243 to 255 from B2, 257 to 261 from B3).
5. **The other repos:**
   - Cikgu Sensai's rules update (section 8) and its `curriculum/reference/katakata/` refresh (ledger to L-2034, ⚡ packs, the nine Jambatan scenes);
   - Hanashishou's audit reading extension rows like practice-pool rows;
   - Hanashishou's «haribulan» fix;
   - Hanashishou's prep list (it loses «mengantuk», and gains the new scenes).
6. **A phone check** of the new reply-step layout, the two new Jambatan scenes and ⚡ 17, then `tests/e2e/bridge.cjs` with Hanashishou served.
7. **Teaching use:** the Teacher Desk shows prep counts. No lesson plans or teacher notes exist for the ⚡ stages. They are optional extension work and should be described to a class as such.
