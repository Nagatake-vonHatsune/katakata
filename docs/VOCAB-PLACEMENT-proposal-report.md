# Vocabulary placement and the ⚡ stage: proposal report (phase 1, documents only)

**15 Nov 2026 · Claude.** Authorised by Sam (brief of 15 Nov 2026). Documents only: the ledger, the packs, the app code and the other two
repos were only read. Files: [VOCAB-PLACEMENT-proposal.csv](VOCAB-PLACEMENT-proposal.csv) (657 rows), the design note
[STRETCH-STAGE-design.md](STRETCH-STAGE-design.md) and this report. Claude reviews before any build phase.

## Summary

- **615 candidate words** (622 words from Hanashishou's audit, with forms merged), including the Stage 3 backlog word «pesakit»; plus **42 batch 1 bridge rows** promoted from Jambatan.
- **72 excluded** (31 fillers and interjections, 30 English insertions and initialisms, 8 minigame-instruction words, 2 stretched spellings, 1 regular plural). That leaves **543 new words**.
- **Split of the new words: 324 to a chapter (59.7 %), 219 to Jambatan (40.3 %).** With the 42 promoted rows, **366 rows** become `ChN (extension)`.
- **Cap: 32 per chapter.** It is reached by chapters 7, 13 and 14; chapter 1 has 1 extension word and chapter 2 has 9.
- **Every chapter placement passes Kata-Kata's stage checker** (`tools/stage-rules.mjs`, rules from Cikgu Sensai `909596e`), run on a ledger copy that holds the proposal. The only findings are 4 known checker quirks, flagged in the CSV. **Roots:** 12 placements are whole words whose root has no ledger row, all flagged; every other affixed word's root is placed at or before its chapter.
- **⚡ stage:** **2 checkpoints** per chapter (the app's 'ready' and 'chapter' stamps); chapter 18 has 1. Flames light from the existing stamps, so learners who have finished chapters see them lit at once. The blue accent passes AA in all 8 themes. **Pilot: chapter 4.**

## 1. Inputs read

| Source | What | Version |
| --- | --- | --- |
| Hanashishou | `docs/STAGE-2-step6a2-metfirst.csv` (meanings, home pack), `docs/STAGE-2-step6a3-report.md` (exclusions, Stage 3 candidates), `docs/STAGE-2-step6a3-bridge-batch1.csv` | `4be57ac` |
| Hanashishou audit | `scripts/malay-audit.ts` run in a scratch copy against Kata-Kata's current ledger snapshot (as `tools/bridge-metfirst.sh` does): **990 met-first words, group (c) 622** | `4be57ac` |
| Cikgu Sensai | `docs/handoff/charter-snapshot.md` chapter table; `HANDOFF.md` "Stage 3 word backlog"; `curriculum/stage-rules.json` (identical to Kata-Kata's copy) | `a235a35` |
| Kata-Kata | ledger snapshot (L-0001 to L-1493), packs c01 to c18, `src/styles.css` palettes, `src/core/progress.ts`, `state.ts`, `session.ts`, `content.ts`, `savefile.ts`, the views | this branch |

The metfirst CSV dates from step 6a-2 (1005 words). The audit was re-run against today's ledger instead, so the candidate set is exact: the
group (c) words that still have no ledger row once batch 1 is in. «pulih» (added by the step 6a-3 line fix) is the one word that is not in
the CSV; its meaning was written by hand.

## 2. Method

1. **Candidates.** The 622 group (c) words. Forms of one word became one row: -nya forms under their base (as batch 1 did with «penyanyinya»), «percayalah» under «percaya», «datanya» under «data», and compound-only words under their compound («penghawa» and «dingin» in «penghawa dingin», «temu» and «duga» in «temu duga», «raya» in «pasar raya», «pulih» in «baik pulih»). That gives 615 rows. The column `scene form` lists the forms the scenes use.
2. **Exclusions** (section 5) use the batch 1 categories and Sam's lists. Greetings «hai» and «helo» stay excluded as interjections (question 6).
3. **Promotions.** Of the 184 batch 1 rows (now Jambatan rows L-1310 to L-1493), I promoted 42: the 30 Stage 3 candidates in Hanashishou's report («baharu» is an alias, not a row), plus «tunjuk», «kenal», «bahagian», «percuma», «terima», «hampir», «selama», «sejam», «tanpa», «teruk», «pasukan» and «sebenar». Each has a strong chapter fit, or is the root of a new extension word («kenalkan», «menunjukkan», «sebahagian», «sebenarnya»). They keep their ledger IDs; only their place changes.
4. **A chapter, when:** the word fits the chapter's theme, scenes and can-do goals (the charter table); a learner there is likely to need it; and it passes the stage rules at that chapter:
   - affix gates: ber- 10, meN- 11, -kan and -i 12, accident ter- 16, se- by its family;
   - root placed at or before the chapter (in the ledger or in this proposal);
   - a spoken form only after its standard partner;
   - no Indonesian form.

   Very common words went to the earliest chapter that fits («mana» 2, «cuma» 3, «beri» 4). Words that are too rare, only coach text, or whose root is a Jambatan row (or has no row) went to Jambatan.
5. **Jambatan topic:** the word's Hanashishou home pack (`office` → At work, `daily-life` → Daily life, `home-condo` → Home and condo, `health` → Health, `tutorial` → How to play). Social words are split by meaning into Talking and explaining, Events and outings, or Feelings and opinions (the three `SOCIAL_SPLIT` scenes).
6. **Rebalancing.** The first pass gave 47 % to chapters and put 38 words in chapter 5. I moved words with a real chapter use (for example «jarak», «petak», «izin», «formal», «santai», «markah», «zaman») from Jambatan into chapters, and moved some chapter 5 adjectives to chapter 15 (describing a person) and to chapter 8 (shopping). That reached 59.7 %, with no chapter over 32.
7. **Checks.** `validate.mjs` (scratch) adds the proposal to a copy of the ledger and runs `Checker.inspect` on every chapter word and scene form at its chapter. A root script checks every affixed word's root placement. Neither script is committed (documents only).

## 3. The ratio

| | Rows | Share of new words |
| --- | ---: | ---: |
| New words, chapter extension | 324 | **59.7 %** |
| New words, Jambatan | 219 | **40.3 %** |
| New words kept | 543 | 100 % |
| New words excluded | 72 | |
| Promoted batch 1 rows (Jambatan → chapter extension) | 42 | not counted above |
| **All `ChN (extension)` rows** | **366** | |

The build would add **543 new ledger rows** (from L-1494) and change the place of 42 existing rows. Counting the 42 moves, the ⚡ stages
gain 366 words and Jambatan gains 219 new words while losing 42, a net gain of 177.

## 4. Per chapter (cap 32)

| Ch | Theme (charter) | New | Promoted | Total | Examples (promoted marked *) |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Greetings, titles | 1 | 0 | 1 | saudari |
| 2 | Self-introduction, people, Siapa / Apa / Di mana | 7 | 2 | 9 | mana*, kenal*, ajar, ayah, lahir, pencetak |
| 3 | Numbers, money, quantities | 19 | 3 | 22 | cuma*, beberapa*, percuma*, kedua-dua, bajet, kos, juruwang |
| 4 | Time, routine, frequency | 12 | 7 | 19 | beri*, bantu*, semula*, ulang*, biasa*, hampir*, sejam*, setahun, pagi-pagi |
| 5 | Adjectives, food, feelings, Bagaimana | 25 | 6 | 31 | salah*, tentang*, nampak*, cara*, bunyi*, tanpa*, kira-kira, malu, bau |
| 6 | Comparison, sport and games | 17 | 3 | 20 | pasukan*, betul-betul*, selama*, beza, permainan, sebanyak, markah |
| 7 | Directions, places, transport | 31 | 1 | 32 | tunjuk*, perhentian bas, pasar raya, jarak, lorong, tambang, pandu |
| 8 | Classifiers, shopping | 15 | 2 | 17 | seorang*, sendiri*, sekotak, secawan, sehelai, jaket, hadiah |
| 9 | Passive di-, signs and notices, festivals | 17 | 1 | 18 | terima*, keselamatan, denda, sehingga, kesulitan, sambut |
| 10 | ber- verbs, retelling your day and background | 20 | 1 | 21 | cerita*, berbincang, berubah, bertulis, serumah, zaman |
| 11 | meN- verbs, the office | 26 | 1 | 27 | bahagian*, memandu, memberi, temu duga, data, tajuk, invois |
| 12 | -kan and -i, requests, home and condo repairs | 31 | 0 | 31 | penghawa dingin, baik pulih, bocor, penghantaran, kenalkan, tempahkan |
| 13 | Negation and modals, health | 26 | 6 | 32 | tiada*, mungkin*, dapat*, penting*, langsung*, kena*, pesakit, benarkan |
| 14 | Linking words, reasons, social | 26 | 6 | 32 | memang*, perkara*, sebenarnya*, begitu*, pasti*, sebenar*, masuk akal, punca |
| 15 | yang clauses, question words, describing | 11 | 2 | 13 | sesuatu*, apa-apa*, seseorang, sesiapa, mana-mana, garang, tegas |
| 16 | ter- for mishaps, complaints | 23 | 1 | 24 | teruk*, nasib baik, tersalah, terkejut, terpaksa, kesilapan, tiba-tiba |
| 17 | Spoken register, inviting and declining | 17 | 0 | 17 | je, tau, kejap, takkan, tak ada hal, bersetuju, formal, santai |
| 18 | Review | 0 | 0 | 0 | (the ⚡ stage of chapter 18 is harder review only) |
| | **All** | **324** | **42** | **366** | |

The full list is in the CSV. Chapters 1 and 2 are small, because few unplaced words belong there. Their ⚡ stages would rest mostly on
harder frames and dialogue built from the core words.

**Jambatan (219 new):** Events and outings 66, Daily life 28, Talking and explaining 28, At work 24, Feelings and opinions 21, Home and condo 21,
How to play 16, Health 15. «Events and outings» would grow from 46 to 112 cards (question 7).

## 5. Exclusions (72)

| Reason | Words (Hanashishou scenes) |
| --- | --- |
| **Fillers and interjections (31)** | hai (35), hmm (34), helo (17), eh (11), err (10), ah (9), haha (8), nah (5), erm (4), aiyo (3), ha (3), hah (3), hm (3), la (3), aduh (2), ish (2), ooh (2), yeay (2), yelah (2), amboi, bip, eee, emm, er, haa, hahaha, hehe, hoi, mm, tik-tik, yay (1 each) |
| **English insertions and initialisms (30)** | okey (65), stop (7), it (4), ic (3), boss (2; the Malay row is L-0532 «bos»), bye (2), okeylah (2), sori (2), atm, bbq, bro, bubble, call, chute, cool, date, e-hailing, encore, fine, game, gb, hb, hr, medium, medium-rare, order, outstation, steamboat, tea, well-done (1 each) |
| **Minigame-instruction words (8)** | Sam's list: perkataan (58), bina (50), demi (46), susun (22), urutan (18), frasa (9), permintaan (3); also mini (1, only in "permainan mini", a minigame name) |
| **Non-standard (stretched) spellings (2)** | jadiii, yesss |
| **Regular form of a live ledger row (1)** | lagu-lagu (plural of L-1022 «lagu») |

No proper names turned up (the audit already skips them), and no Indonesian forms were found: none of the words is on the
stage-rules list. Words that are kept, but flagged, rather than excluded:

- **Sam's allowed pairs** («mall», «parkir», «pesawat»): Jambatan, each with its pair named.
- **«kesulitan»:** chapter 9, notices only, as Sam ruled (official lines fine; casual lines use «masalah»).
- **«anjing»:** kept by Sam; Jambatan.
- **Spoken forms with no standard row** («kesian», «makin», «mak», «ngantuk»): Jambatan (question 8).

## 6. Sample: 20 placements and why

| Word | Decision | Reason (from the CSV) |
| --- | --- | --- |
| «mana» | Ch2 (extension) | question words (Ch2, with Siapa / Apa / Di mana); 15 scenes; root of «mana-mana» (Ch15); promoted from Jambatan · Daily life |
| «kedua-dua» | Ch3 (extension) | numbers (Ch3): ke- with a number; standard partner of «dua-dua» (Jambatan) |
| «beri» | Ch4 (extension) | everyday verbs of the daily routine, next to bawa, guna, tulis; 31 scenes; root of «memberi» (Ch11); promoted |
| «tentang» | Ch5 (extension) | talking about food, objects and feelings; standard partner of spoken «pasal»; promoted |
| «kira-kira» | Ch5 (extension) | prices and amounts; its root «kira» is Ch5, so not earlier |
| «pertandingan» | Ch6 (extension) | sport and competitions; whole word (root «tanding» has no row) |
| «perhentian bas» | Ch7 (extension) | transport; «bas» Ch7 |
| «sekotak» | Ch8 (extension) | se- + classifier (Ch8); «kotak» Ch8 |
| «keselamatan» | Ch9 (extension) | notices: «demi keselamatan»; «selamat» Ch1 |
| «berbincang» | Ch10 (extension) | ber- (Ch10): what you did today; root «bincang» Ch10 (extension) |
| «memandu» | Ch11 (extension) | meN- (Ch11); root «pandu» Ch7 (extension) |
| «penghawa dingin» | Ch12 (extension) | home repairs: the aircon repair and service |
| «tiada» | Ch13 (extension) | negation as a system; common on notices; 27 scenes; promoted |
| «pesakit» | Ch13 (extension) | clinic notices; Cikgu Sensai Stage 3 backlog; «sakit» Ch5 |
| «masuk akal» | Ch14 (extension) | explaining why; «masuk» Ch7 |
| «seseorang» | Ch15 (extension) | indefinites with the question-word set; «seorang» Ch8 (extension) |
| «tersalah» | Ch16 (extension) | ter- accidents; «salah» Ch5 (extension) |
| «je» | Ch17 (extension) | spoken partner of «sahaja / saja» (Ch3); needs a register pair in the rules |
| «jelaskan» | Jambatan · Talking and explaining | -kan is fine from 12, but the root «jelas» is a Jambatan row |
| «belon» | Jambatan · Events and outings | the checker reads «belon» as a ber- shape (be + lon), so it cannot go before Ch10, and no later chapter fits |

## 7. The ⚡ stage design in brief

(Full note: [STRETCH-STAGE-design.md](STRETCH-STAGE-design.md).)

- **Checkpoints.** The app tracks two chapter completion stages, both stored as stamps: 'ready' (Sedia Kelas words known and both frames built) and 'chapter' (every card known). So chapters 1 to 17 have 2 🔥 and chapter 18 has 1. A flame is lit by its stamp, or by its condition being true now. It never goes out. All flames lit: the "N ⚡" chip appears beside the chapter in the Sedia Kelas list.
- **Bar.** One track in two segments (class prep, then the rest of the chapter), sized by item count, with 🔥 at each segment end. The status line reads "🔥 1/2 · 18 words to go". There are ASCII mock-ups for 360 px in the note.
- **Blue accent.** Three tokens per theme (`--stretch`, `--stretch-ink`, `--stretch-soft`). In all 8 themes the text pairs are ≥ 5.0:1 and the bar fill is ≥ 5.0:1 against its track. In Rebel, whose brand is already blue, ⚡ shifts towards cerulean.
- **Content.** Extension cards (Kad Kata with closer distractors and earlier recall), 4 to 6 harder frames (Susun Ayat with longer examples and decoy tiles), 8 to 14 dialogue lines with reply choices (a small `reply` step built from the MC component: the app has no scenario player yet), Cari Benda with six objects where there are pictures, and an optional Laju! round on the ⚡ words.
- **Word scope.** A ⚡ pack for chapter N uses core words placed by N and its own extension words (after their cards). It does not use other chapters' extension words. Core texts in Stages 1 and 2 read extension rows as unplaced.
- **Saving.** The schedule, frames and a new optional `state.lines` record, plus a new stamp kind 'stretch'. Promoted Jambatan cards get new IDs and their schedule is copied once. Learners who have finished chapters already hold the stamps, so nothing needs migrating.
- **Pilot: chapter 4.** It has 7 promoted common words (which tests the ID move), any learner who has finished it already holds both stamps, it has picture scenes, and it tests the new ledger-placement check on a Stage 1 ⚡ pack. Chapter 10 comes second.

## 8. What the build phases must change

**Stage rules (Cikgu Sensai first; Sam approves each rule change; then a copy into Kata-Kata with `SOURCE.json`):**
- `(extension)` in the place column: parsed as placed at N for ⚡ segments of chapter N. For core segments (Kelas, Dunia, Cikgu Sensai core units) in chapters 1 to 18 it is read as unplaced; from Stage 3 (chapter 19 on) as placed. This is needed in `placed_chapter` (Python) and `placedChapter` (mjs), with fixtures in `stage-rules-fixtures.json`. Today both parsers already read "Ch4 (extension)" as Ch4, so nothing would stop a core text from using a ⚡ word until this lands.
- New register pairs for the chapter 17 spoken words: je → sahaja, tau → tahu, kejap → sekejap, motor → motosikal, komplen → aduan, bisnes → perniagaan, and takkan → tidak akan if Sam wants it checked as a pair.
- Optional, to move words earlier: `ter_superlatives` + «terbaru», «tertinggi» (then Ch6, not Ch16); `lookalike_roots` + «belon», «mekanik», «meriah».
- Checker fixes: «pasar» is a proper-noun token, so «pasar raya» shows «raya» as a gap. Reduplicated plurals («kesan-kesan») are not resolved. «percayalah» reads as + lah only from Ch17 (correct, but ⚡ 14 must write «percaya»).

**Ledger (sheet, Journal):** 543 new rows (Origin e.g. "Kata-Kata placement batch 2 (Sam approved …)"), 42 place changes, one Journal row per group, and the snapshot.

**Kata-Kata importer and packs:**
- a ⚡ pack kind (`content/ms/stretch/xNN.json`, kind `stretch`) in `pack.schema.json`;
- a builder (a `stretch_NN(b)` function next to the chapter functions, or a new script);
- `import_vocab_bank.py` support, and `import-overrides.json` (`live_stretch`, Japanese titles);
- the guard: ⚡ segments are checked at N with their own extension rows, and the ledger-placement check is on for chapters 1 to 9 too.

**Jambatan importer:**
- add every new social Jambatan word to `SOCIAL_SPLIT` (it stops otherwise);
- add the 42 old card IDs to `RETIRED_IDS`;
- re-run `tools/bridge-metfirst.sh`;
- treat `(extension)` rows as placed (no Jambatan card).

**App:**
- `content.ts`: ⚡ packs are kept out of `chapters`, `path` and distractor pools until introduced;
- `progress.ts`: checkpoints, unlock, the 'stretch' stamp;
- `session.ts`: `buildStretch`;
- `susun-ayat`: decoy tiles;
- the `reply` step;
- `modes.ts`: the bar, the chip and the ⚡ screen; also the Home card and Rekod;
- `styles.css`: tokens;
- `i18n` keys;
- `state.ts` / `savefile.ts`: `lines`, `movedCards`, the new stamp kind;
- the Teacher Desk: prep counts without ⚡ cards;
- the Laju! icon (question 1);
- unit and e2e tests (`core.test.ts` counts, a contrast test, a test that flames light from existing stamps).

**Hanashishou (step 6 owner):** the audit's tag rule must read `(extension)` rows like the practice-pool rows: they do not set a scene's chapter, and they go in `firstMet`. Otherwise placing 366 rows would raise many scenes' chapter tags.

**Cikgu Sensai:**
- extension rows are kept out of core counts and coverage tests, as recognition rows are (the `CFG['core']` checks in `tests/test_stage2_ch*.py` and the step 5 suites);
- refresh `curriculum/reference/katakata/` with the new ledger;
- later, an optional ⚡ add-on for Stages 1 and 2;
- from Stage 3 on, the rows are core.

## 9. Not verified

- **No Kamus Dewan check.** Meanings, POS, affix tags and roots are my reading, like batch 1. The Japanese meanings are drafts for the native check. Loans and spoken items worth a KD4 look: «mulai», «bisnes», «komplen», «motor», «sangat-sangat», «takkan», «parkir», «tren» (batch 1).
- **Scene counts** for the new words come from today's audit. For promoted rows they come from the batch 1 CSV.
- **The checker was run one word at a time.** It cannot see sequence effects, such as the register labels a pack builds up (so «tak ada hal» shows «tak» as unlabelled). The real check is the pack guard in the build.
- **Contrast:** worked out from the hex values, not measured on a screen. The Rebel pair needs a look on a phone.
- **No placement was tried in a real ⚡ line yet.** A word that fits a theme can still be hard to use naturally at that chapter's level. The build may move a few.

## 10. Questions for Sam

1. **Laju! and ⚡.** ⚡ already marks Laju! (the Home tile, "⚡ best"). Should Laju! change to ⏱️ so ⚡ means only the stretch stage? If you don't say, the build would propose ⏱️. And 🔥 marks the streak and best combo: keep it for the checkpoints as well?
2. **Rebel blue.** The ⚡ blue is 17 to 18° from Rebel's brand blue. Is an outlined chip enough, or should ⚡ in Rebel use another accent (it would then not be blue)?
3. **Two checkpoints.** The app tracks exactly two stages, so there are two 🔥 (one in chapter 18). Do you want a third, "every frame of the chapter built once"? The data is already stored in `state.frames`, but today it is not a stage.
4. **Whole words.** 12 chapter words have a root with no ledger row: perniagaan, pertandingan, perpustakaan, persembahan, perbualan, hiasan, bilangan, kesulitan, senaman, terhenti, terkejut, terpaksa. «sesuatu» and «kanak-kanak» are also lexical. Is it OK to place them as whole words, or should they go to Jambatan (the ratio would drop to about 57 %)?
5. **Rule changes:**
   - the six or seven register pairs for chapter 17;
   - «terbaru» and «tertinggi» as ter- superlatives (to move them to Ch6);
   - «belon», «mekanik» and «meriah» as look-alike roots.

   Which do you approve?
6. **«hai» and «helo».** They are excluded as interjections (as in batch 1). Should they be chapter 1 ⚡ words instead (Ch1 has only «saudari»)?
7. **Events and outings.** That Jambatan scene would grow to 112 cards. Split it, for example into "Parties and food" and "Music and shows"?
8. **Spoken forms without a standard row** («kesian», «makin», «mak», «ngantuk»). Add «kasihan», «semakin» and «emak» as rows later, so the spoken forms can go into chapter 17?
9. **The 42 promoted rows** leave Jambatan, so they are no longer in the Hanashishou prep list before chapter N is done. Their progress carries over to the new ⚡ cards. Is that OK?
10. **The cap.** I set 32 per chapter (your example was 25 to 40). Chapters 7, 13 and 14 are at the cap. Keep it?

## 11. Commits

Docs only, on `claude/kata-vocab-placement-stretch-sosaca`, rebased on `origin/main`. Hashes are in the hand-off message.
