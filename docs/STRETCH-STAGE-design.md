# ⚡ stage: design note (phase 1, proposal)

**15 Nov 2026 · Claude.** Proposal only. No app code, pack or ledger is changed by this note. It goes with
[VOCAB-PLACEMENT-proposal.csv](VOCAB-PLACEMENT-proposal.csv) and [VOCAB-PLACEMENT-proposal-report.md](VOCAB-PLACEMENT-proposal-report.md).
Code references are to `main` at the commit this note was written on.

The ⚡ stage is an optional, harder stage for one chapter. It holds that chapter's extension words (ledger place
`ChN (extension)`), together with more varied sentences, longer dialogue and harder rounds of the existing games. It has no name in the
UI: the learner sees only ⚡ next to the chapter number ("4 ⚡").

## 1. Checkpoints (🔥) and the completion stages the app already has

**What the app tracks today** (`src/core/progress.ts`, `awardStamps`). There are exactly **two chapter completion stages**, and each one is
stored as a stamp in `state.stamps` (`{id, kind, date, chapter}`):

| Stage | Condition (computed live) | Stored as | Awarded |
| --- | --- | --- | --- |
| 1. Class prep done | `isReady(N)`: every Sedia Kelas card (`sedia_kelas.cards`) is known (`srs.reps > 0 && interval >= 1`) **and** both Sedia Kelas frames were built correctly at least once (`state.frames[id].correct > 0`) | stamp `kind: 'ready'` | once per chapter, at the end of any session (`hasStamp` ignores the date for this kind) |
| 2. Chapter done | `chapterProgress(N).known === total`: every card in the chapter pack is known | stamp `kind: 'chapter'` | once per chapter, same way |

Nothing else is a per-chapter completion stage. Laju! and points records are global; `state.frames` holds every frame's tries and correct
answers, but the app does not treat "all frames built" as a stage. A learner meets the chapter several times on the way (Sedia Kelas runs,
Today's practice, reviews), but only these two moments are recorded.

**Mapping.** One 🔥 per stage:

| Chapters | Checkpoints | Why |
| --- | --- | --- |
| 1 to 17 | **2**: 🔥 class prep, 🔥 chapter done | both stamps can be earned |
| 18 | **1**: 🔥 class prep | chapter 18 is a review pack with no cards of its own (`cards: []`), so `chapterProgress` has `total = 0` and the 'chapter' stamp can never be awarded |

A checkpoint is **lit when its stamp exists, or when its condition is true now** (so a learner who meets the condition is not kept
waiting until their next session ends; the stamp follows at that session end as today). Once lit it stays lit: a later lapse makes a card
"not known" again and can lower the bar's fill, but it never puts out a flame or locks ⚡ again. When every checkpoint of a chapter is lit, its
⚡ stage appears. No new stored field is needed to decide this.

## 2. The progress bar and the chapter select on a phone

The chapter select is the Sedia Kelas list (`renderSediaList` in `src/views/modes.ts`, route `#/sedia`). Today each row is one button
with the title, the gloss, a bar of core words known and "Prep a/b".

**The bar.** It keeps one track but is split into one segment per checkpoint, so it shows how far there is to go:

- Segment 1 (class prep): Sedia Kelas cards plus the two Sedia Kelas frames. Its fill is the cards known plus the frames built.
- Segment 2 (chapter done): the chapter's cards that are **not** in the Sedia Kelas list. Its fill is how many of them are known.
- Each segment's width is proportional to its item count, with a minimum of 15 % so the two 🔥 never touch. Examples from the current packs:
  chapter 4: 28 + 49 items, so the first 🔥 sits at 36 %; chapter 17: 34 + 7, so it sits at 83 % (both under the 85 % ceiling);
  chapter 18: one segment.
- At each segment's end there is a checkpoint mark: an outlined circle (`--muted` border) until lit, then 🔥.
- The status line under the bar: `🔥 0/2 · Prep 12/28`, then `🔥 1/2 · 18 words to go`, then `🔥 2/2` (and the ⚡ chip appears).

**Layout (360 px wide, 16 px gutters, text size M).** The ⚡ chip is a second button beside the chapter button (one button cannot contain
another), 52 px wide to match `--tap`.

```
┌──────────────────────────────────────┐
│ ←  Class prep                         │
│ Learn the words before class, so…     │
│                                       │
│ ┌───────────────────────────┐ ┌─────┐ │
│ │ Chapter 4  Masa dan Kala  │ │     │ │
│ │ Time and tense            │ │ 4 ⚡│ │   ← blue chip: appears at 🔥 2/2
│ │ ██████████🔥█████████████🔥│ │     │ │
│ │ 🔥 2/2                     │ └─────┘ │
│ └───────────────────────────┘         │
│ ┌──────────────────────────────────┐  │
│ │ Chapter 5  Kata Sifat            │  │
│ │ Adjectives                       │  │
│ │ ██████████🔥█████░░░░░░░░░░░░░ ○ │  │   ← bar is wider while there is no chip
│ │ 🔥 1/2 · 21 words to go           │  │
│ └──────────────────────────────────┘  │
│ ┌──────────────────────────────────┐  │
│ │ Chapter 6  Perbandingan          │  │
│ │ Comparisons                      │  │
│ │ ██████░░░░ ○ ░░░░░░░░░░░░░░░░░ ○ │  │
│ │ 🔥 0/2 · Prep 9/24                │  │
│ └──────────────────────────────────┘  │
│ ┌──────────────────────────────────┐  │
│ │ Chapter 18  Ulang Kaji…          │  │
│ │ ████████████████████████████ ○   │  │   ← one checkpoint only
│ │ 🔥 0/1 · Prep 14/22               │  │
│ └──────────────────────────────────┘  │
└──────────────────────────────────────┘
```

- The chip, the first time it appears: a one-time toast "⚡ is open for Chapter 4" at the end of the session that lit the last flame (in
  the summary screen, beside the new stamps). The "seen" state goes in the existing `howToSeen` record (key `stretch-4`).
- The same bar (without the chip) replaces the plain bar in the Home "next class" card. In Rekod (`#/rekod`), each chapter row gets the flames
  after its word count (`🔥🔥`), and a chapter whose ⚡ stage is complete gets a blue ⚡.
- **The ⚡ screen** (route `#/sedia/4/x`; the route name is internal and never shown):

```
┌──────────────────────────────────────┐
│ ←  4 ⚡                                │   ← top bar: chapter number and ⚡ only
│ Masa dan Kala                         │
│ Extra words and harder sentences for  │
│ this chapter. Do it whenever you like.│
│ ▓▓▓▓▓▓▓▓░░░░░░░░░░░░  7/19 · 1/4      │   ← blue bar: extra words known · frames built
│ ┌──────────────────────────────────┐  │
│ │      Start ⚡  · 12 steps · 5 min  │  │   ← blue filled button
│ └──────────────────────────────────┘  │
│ Extra words (19)                      │
│  ✓ beri — to give                     │
│  ✓ bantu — to help                    │
│  ・ hampir — ？                        │
│  …                                    │
│ Harder sentence patterns (4)          │
│  Saya ___ semula selepas ___.         │
│  …                                    │
└──────────────────────────────────────┘
```

**Accessibility.** The chip has `aria-label` "Chapter 4 ⚡: extra words and harder practice". Each checkpoint mark has a label
("Checkpoint 1 of 2, class prep: reached"). The bar keeps `role="progressbar"`, and its value is the sum of both segments. Colour is never
the only signal: ⚡ and 🔥 carry the meaning.

## 3. The blue accent, per theme

The app has four palettes (`kancil`, `cyan`, `royal`, `rebel`), each with a light and a dark variant (`[data-palette]` and `[data-theme]` in
`src/styles.css`, plus `prefers-color-scheme`): 8 themes. Three new tokens go into each theme block, next to the existing ones:

- `--stretch`: ⚡ text, the chip border, the ⚡ bar fill and the ⚡ button background.
- `--stretch-ink`: text on a `--stretch` fill (the Start ⚡ button).
- `--stretch-soft`: the chip background and the ⚡ screen header band.

Contrast ratios (WCAG 2.x relative luminance), worked out from the existing `--surface`, `--bg` and `--surface-2` values. AA needs 4.5 for
text and 3.0 for non-text parts (the bar fill against its `--surface-2` track):

| Theme | `--stretch` | `--stretch-ink` | `--stretch-soft` | on surface | on bg | on surface-2 (track) | ink on stretch | stretch on soft | hue ⚡ / brand / neutral |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| kancil-light | `#1a5bc8` | `#ffffff` | `#e3ecfb` | 6.2 | 5.6 | 5.1 | 6.2 | 5.2 | 218° / 152° / 218° |
| kancil-dark | `#7cb4ff` | `#08142b` | `#1b2b45` | 7.3 | 8.3 | 6.4 | 8.6 | 6.7 | 214° / 147° / 220° |
| cyan-light | `#1d55c4` | `#ffffff` | `#e2eafb` | 6.7 | 6.2 | 5.6 | 6.7 | 5.5 | 220° / 176° / 218° |
| cyan-dark | `#86b8ff` | `#071a33` | `#1a2a47` | 7.9 | 8.8 | 6.9 | 8.6 | 7.0 | 215° / 176° / 227° |
| royal-light | `#1f4fbf` | `#ffffff` | `#e3e9fa` | 7.2 | 6.6 | 5.8 | 7.2 | 5.9 | 222° / 357° / 218° |
| royal-dark | `#8ab4ff` | `#0a1530` | `#1f2a4a` | 8.6 | 9.2 | 7.8 | 8.6 | 6.8 | 218° / 356° / 220° |
| rebel-light | `#0064a8` | `#ffffff` | `#dcedf8` | 6.2 | 5.6 | 5.0 | 6.2 | 5.2 | 204° / 221° / 229° |
| rebel-dark | `#5fd0ff` | `#03192a` | `#0f3047` | 10.1 | 10.9 | 9.1 | 10.2 | 7.8 | 198° / 216° / 228° |

Every pair passes AA, both for text (≥ 4.5) and for the bar (≥ 3.0). Notes:

- **Kancil, cyan, royal:** the brand colours are green, teal and red, so the blue stands out clearly. The existing `--neutral` (used for the
  "again later" feedback and focus rings) has the same hue but is a greyed slate (saturation 37 % in kancil-light against 77 % for ⚡), so the
  two do not read as the same colour.
- **Rebel:** its brand is already blue (`#1f56c9` / `#5c9dff`). ⚡ moves 17 to 18° towards cerulean (`#0064a8` / `#5fd0ff`), and the chip
  is outlined on a soft fill, never a filled brand-style button, so the two stay apart. This is the closest pair; look at it on a phone in the
  build (question 2 in the report).
- The ⚡ emoji itself is drawn by the system (yellow on most phones), so it cannot follow the theme. The blue goes on the chip, the bar and
  the text around it. The values were checked with the script used for this note; the build should add them to a unit test, as with the
  existing palettes.

## 4. What a ⚡ stage contains

| Part | Per chapter | Reuses | Harder because |
| --- | --- | --- | --- |
| **Extension cards** | the chapter's `ChN (extension)` rows: 1 (Ch1) to 32 (Ch7, 13, 14); see the report's chapter table | Kad Kata (intro, both MC directions, recall) | distractors from the same chapter and part of speech (closer meanings); Malay-first recall comes after one correct answer instead of waiting for `reps >= 2 && interval >= 6` |
| **⚡ frames** | 4 to 6 | Susun Ayat | longer examples (8 to 12 tiles instead of 4 to 7); one or two **decoy tiles** (a near miss: the wrong affix, the spoken form, a word from the same family) that must be left out; frames combine two of the chapter's patterns ("Saya ___ semula selepas ___.") |
| **⚡ dialogue** | 8 to 14 lines, with 3 to 5 reply choices | a new `reply` step built from the Kad Kata MC options (no new game): hear a line, choose the best Malay reply of three | three replies differ in register or meaning, not only one keyword; for a branching line, the choice picks the next line (two branches at most, which join again, the way Hanashishou does it); the pilot is linear |
| **Cari Benda ⚡** | only where the chapter has a picture scene and the extension nouns have pictures (food in Ch5, clothes and things in Ch8, places in Ch7) | Cari Benda | six objects on the board instead of four; extension objects mixed with core ones |
| **Laju! ⚡** | optional | Laju! | a 60-second round on the chapter's extension words, once 8 are known |

A ⚡ run (`buildStretch(N)`, built like `buildSedia`): weak extension cards first, then up to 8 new ones (`newWordBlock`), two ⚡ frames,
three replies and, where there is a picture scene, three Cari Benda rounds. It is about 5 to 8 minutes long and can be repeated.

**The scenario gap.** The app shows no scenario lines today. The packs carry them (`scenario.lines`), but only the title is used, and the
📖 tile on Home is "soon". The ⚡ dialogue therefore needs the small `reply` step above. It reuses the MC component and the TTS buttons, and
it does not need a full story player.

## 5. Only words placed up to chapter N

A ⚡ pack for chapter N (the build's file `content/ms/stretch/xNN.json`, kind `stretch`) may use:

1. core words whose ledger row is placed at or before N (`Ch1` to `ChN`, Dunia rows that prime a chapter at or before N, as today);
2. **its own** extension words (`ChN (extension)`), but only after the word's card, in the order the guard already uses (cards, then frames,
   then dialogue lines);
3. spoken forms only after their standard partner, under the existing register rule.

It may **not** use extension words of other chapters, even earlier ones: a learner can open ⚡ 6 without ever doing ⚡ 4. A word that two
chapters need is placed once and reviewed with a gloss. All the affix gates, the Indonesian-form list and the ledger-gap check apply at
chapter N, as for a Kelas pack. For chapters 1 to 9 this means the ⚡ pack gets the Stage 2 ledger-placement check, which the Stage 1 Kelas
packs never had (the build must switch it on for ⚡ packs).

The other half of the rule is the core: Kelas packs, Dunia scenes and Cikgu Sensai's core units in Stages 1 and 2 must not depend on a ⚡ word.
So for core texts the guard reads an extension row as **unplaced** (like a Jambatan row). For Stage 3 (chapter 19 on) extension rows become
core and are read as placed at N.

**IDs and progress keys.** Cards `ms-xNN-001…`, frames `ms-xNN-f01…`, dialogue lines `ms-xNN-d01…`. Nothing is added to the chapter pack's
`cards`, so `chapterProgress`, the 'chapter' stamp, Sedia Kelas and the learning path (`content.path`) do not change. **This matters:** if
extension cards went into the chapter pack, every learner who has finished a chapter would lose that chapter's 🔥, and ⚡ could never open
without first learning the ⚡ words.

## 6. Saving progress, and learners who have already finished chapters

- **Extension cards** use the normal schedule (`state.srs`, SM-2), so once met they come back in Today's practice and in reviews like any
  other word. They are never *introduced* by Today's practice or Sedia Kelas, only by a ⚡ run.
- **⚡ frames** use `state.frames` (tries, correct), as frames do today. **Replies** go in a new optional record `state.lines`
  (`{tries, correct, last}` per line ID). `migrate()` fills it with `{}`, so `schemaVersion` stays 1.
- **⚡ complete:** every extension card known and every ⚡ frame built once gives a new stamp, `kind: 'stretch'` (a blue ⚡ hanko in Rekod).
  `mergeStates` already merges stamps by kind, chapter and date, so savefile merges keep working (the Teacher Desk's own merge,
  `src/teacher/merge.ts`, must be checked in the build). An older app that
  imports a newer savefile shows such a stamp with the 'chapter' label; that is harmless.
- **Promoted Jambatan words** (42 rows that move from Jambatan to a chapter's ⚡ stage) get a new ⚡ card ID. Their old Jambatan IDs go
  into the importer's `RETIRED_IDS`. A new `movedCards` map (old ID → new ID) in `migrate()` copies the old schedule to the new ID once, if
  the new ID has none. So a learner who already knows «beri» from Jambatan starts ⚡ 4 with «beri» known.
- **Learners who have finished chapters:** their 'ready' and 'chapter' stamps already exist (a stage is stamped at the end of the session that
  reaches it), so their flames are lit on the first launch after the update, and their ⚡ chips are already there. A
  learner who meets a condition but has no stamp yet (for example after a savefile merge) is lit by the live check in section 1. Nothing has
  to be migrated for flames or unlocking.
- Cards added to a chapter later (as in step 3e) cannot put out a flame that is already lit. A new learner still needs them for the 🔥.

## 7. UI text (drafts: en, ja, ms)

The stage has no name, so there are only short labels and tooltips. All Japanese and Malay strings are drafts for the native check.

| Key | en | ja | ms |
| --- | --- | --- | --- |
| `stretch.chip` | {n} ⚡ | {n} ⚡ | {n} ⚡ |
| `stretch.chip_aria` | Chapter {n} ⚡: extra words and harder practice | 第{n}課 ⚡：追加の単語と発展練習 | Bab {n} ⚡: perkataan tambahan dan latihan lanjutan |
| `stretch.tip` | Extra words and harder sentences for this chapter. Optional. | この課の追加の単語と、少し難しい文。やるかどうかは自由です。 | Perkataan tambahan dan ayat yang lebih mencabar untuk bab ini. Pilihan sendiri. |
| `stretch.flames` | 🔥 {a}/{b} | 🔥 {a}/{b} | 🔥 {a}/{b} |
| `stretch.to_go` | {n} words to go | あと{n}語 | {n} perkataan lagi |
| `stretch.locked` | Light every 🔥 to open ⚡ | 🔥 を全部ともすと ⚡ が開きます | Nyalakan semua 🔥 untuk membuka ⚡ |
| `stretch.cp_ready` | Checkpoint {i} of {b}, class prep: {state} | チェックポイント {i}/{b}（授業の準備）：{state} | Titik semak {i}/{b}, persediaan kelas: {state} |
| `stretch.cp_chapter` | Checkpoint {i} of {b}, every word known: {state} | チェックポイント {i}/{b}（全部の単語）：{state} | Titik semak {i}/{b}, semua perkataan: {state} |
| `stretch.reached` / `stretch.not_yet` | reached / not yet | 達成 / まだ | dicapai / belum |
| `stretch.open` | ⚡ is open for Chapter {n} | 第{n}課の ⚡ が開きました | ⚡ Bab {n} sudah dibuka |
| `stretch.start` | Start ⚡ | ⚡ を始める | Mula ⚡ |
| `stretch.continue` | Continue ⚡ | ⚡ を続ける | Teruskan ⚡ |
| `stretch.words` | Extra words ({n}) | 追加の単語（{n}） | Perkataan tambahan ({n}) |
| `stretch.frames` | Harder sentence patterns ({n}) | 少し難しい文型（{n}） | Pola ayat lebih mencabar ({n}) |
| `stretch.reply` | Choose the best reply | いちばん合う返事を選ぼう | Pilih jawapan yang paling sesuai |
| `stretch.decoy` | One tile is extra. Leave it out. | 使わないタイルが1つあります | Ada satu jubin lebihan. Jangan guna. |
| `stretch.done` | ⚡ done | ⚡ 完了 | ⚡ selesai |
| `rekod.stamp.stretch` | ⚡ done | ⚡ 完了 | ⚡ selesai |

Existing strings reused: `common.chapter` ("Chapter {n}" / 第{n}課 / Bab {n}), `sedia.progress` (Prep a/b), `game.susun.*`.

## 8. Pilot chapter

**Chapter 4 (Masa dan Kala).** Reasons:

- It has 19 extension words, and 7 of them are very common promoted Jambatan rows («beri», «bantu», «semula», «ulang», «biasa», «hampir»,
  «sejam»). The pilot therefore also tests the ID move and schedule copy (section 6) on words that learners may already know.
- Any learner who has finished chapter 4 already holds both of its stamps, so the "flames from existing stamps" path can be tested on real
  savefiles on day one.
- It has primed picture scenes (Bangun pagi, Satu hari Encik Tanaka, Hujan petang, Cuti ke pantai), so Cari Benda ⚡ can be tried.
- It is a Stage 1 chapter, so it also tests the one new guard behaviour, the ledger-placement check on a Stage 1 ⚡ pack (section 5).
- The affix gates are simple at chapter 4 (no ber-, meN- or -kan), which keeps the first ⚡ content easy to write and check.

The second pilot is **chapter 10** (21 words: the first ber- chapter, with the chapter 10 picture scene). It tests Stage 2 gates and a
chapter whose Sedia Kelas list holds review cards from earlier chapters (13 of 33), which shapes the first segment of the bar.

## 9. Two clashes with existing symbols

- **⚡ already means Laju!** (the Home tile, its top bar, the Start button and "⚡ best" in Rekod and in the summary). With the ⚡ stage, a learner
  would see one symbol for two things. Proposal: Laju! changes to ⏱️ (it is a 60-second round). This is Sam's call (question 1 in the report).
- **🔥 already means the streak** (Home pill) **and the best combo** (Rekod). The checkpoint flames are on a progress bar, in another
  context, and the brief asks for 🔥, so this note keeps it. It is listed so that Sam can decide with the ⚡ question.
