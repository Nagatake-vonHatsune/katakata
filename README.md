# Kata-Kata · マレー語 ことば道場

A free, offline Malay word trainer for Japanese adults, built for Sam's class.
It's a static PWA: no accounts, no analytics, no server. Learner data leaves the
device only when the learner exports it.

*Satu kata, satu langkah.* 一語ずつ、一歩ずつ。

- Student app: `/` (Japanese, English or Malay interface; the first screen asks, and the 🌐 button on every screen changes it)
- Settings: `/#/settings` (language, display, sound). Records (`/#/rekod`) holds stamps, progress and the savefile.
- Language links for sharing: `/?lang=ja`, `/?lang=en`, `/?lang=ms`
- Teacher Desk: `/teacher/` (drop in student files, merge questions, print the class agenda)
- Version **0.10.0**, a 1.0 release candidate: see [docs/RELEASE-1.0.md](docs/RELEASE-1.0.md) and [CHANGELOG.md](CHANGELOG.md).

With the English or Malay interface, word meanings are shown in English (the Vocab Bank has English
and Japanese glosses). Katakana hints only appear in the Japanese interface.

## Features

| Spec item | Where |
|---|---|
| Onboarding: name, voice check, iOS "Add to Home Screen" step | `src/views/onboarding.ts` |
| All nine Kelas chapters, 19 Dunia scenes and 5 Jambatan scenes (805 cards) | `content/ms/` (packs with `"status": "live"`) |
| 今日の練習: due reviews, then 5–8 new words, one frame drill, one Cari Benda round | `src/core/session.ts` |
| Kad Kata, Cari Benda, Susun Ayat | `src/games/<id>/` (common `Game` interface) |
| 授業の準備 (Sedia Kelas) with "Ready" stamp | `src/views/modes.ts` |
| 先生に質問 + 先生に送る (preview, untick sections, share sheet or download) | `src/views/tanya.ts` |
| Savefile export / import (checksum, preview, merge or replace) | `src/core/savefile.ts`, `src/views/rekod.ts` |
| Stamp card, gentle streak (one rest day allowed), weekly backup reminder | `src/core/progress.ts` |
| Teacher Desk: merge, duplicate counts, prep table, weakest words, A4 agenda | `teacher/`, `src/teacher/` |
| Offline after first visit | service worker generated at build (`src/sw-template.js`) |
| 話匠へ: hand words on to Hanashishou (stage 3, Jambatan) | `src/core/bridge.ts`, `src/views/jambatan.ts` |
| Points (speed bonus, combo, personal bests; never subtracted) and the 60-second Laju! round | `src/core/score.ts`, `src/views/points.ts`, `src/views/laju.ts` |
| Colour palettes (Kancil Green, First Sound Cyan, Royal Red Gold, Rebel Blue) and text size S–XL | `src/views/settings.ts`, `src/styles.css` |

Also in: Japanese-first UI with an English toggle, やり方 cards and a `?` button on every activity,
わからない on every question, no red crosses (misses come back later in the session),
katakana hints that fade after three showings, ⚑ content reports, light/dark mode,
a simple 単語ネット word list with "my hook" notes.

## Content

**Malay vocabulary source of truth:** the Google Sheet "Malay Vocabulary Ledger" (see `content/ledger/README.md`).
Changes start there, are logged in its Journal, and are pushed to the content files below.

One JSON file per chapter or scene, validated against `content/schema/pack.schema.json`.
Card fields follow the shared Hanashishou format: `id, lang, term, gloss_en, gloss_ja, pos,
affix_tag, note, links[], scene, chapter, image`.

- Master workbook: `content/source/2026-11-06_KataKata_VocabBank_v4.xlsx`. v3 added four scenes (Bank dan pos,
  Cuti ke pantai, Telefon baru, Rumah terbuka Hari Raya); v4 adds five colloquial ones (Lepak di kedai mamak,
  Sembang di pantri, Gambar bayi, Main badminton, Simpulan bahasa harian), built by `tools/make_vocab_bank_v4.py`.
  All v3 and v4 rows are Claude drafts.
- Only packs with `"status": "live"` ship in the app (set by `live_kelas` / `live_dunia` in
  `tools/import-overrides.json`). All packs are live at the moment.
- Re-import from the workbook: `python3 -I tools/import_vocab_bank.py content/source/2026-11-06_KataKata_VocabBank_v4.xlsx`
- Japanese frame meanings, scene titles and Cari Benda emoji live in `tools/import-overrides.json`.
- Content checks (also run by `npm run build` and CI): `npm run content:check`
  - schema check on every pack
  - affix guard (ber-, be- before k/l, me- + consonant) with the spec's allow-list; the v2 bank passes with 0 flags
  - link check (targets exist; pair links only to same or earlier chapter)
- Recorded audio (plan B for phones without a Malay voice): `public/audio/ms/<card-id>.mp3`

**All Japanese text (glosses, frame meanings, scene titles, interface) is a Claude draft and needs a native check before students see it. The Malay interface (`i18n/ms.json`) and the v3/v4 scenes are Claude drafts too.**

## Develop

```bash
npm install
npm run dev        # local dev server
npm run check      # typecheck + unit tests + content check + build
```

End-to-end smoke test (onboarding → session → ask teacher → send → Teacher Desk → offline):

```bash
npx vite build && npx vite preview --port 4173 &
node tests/e2e/smoke.cjs
node tests/e2e/fun.cjs     # points, Laju!, palettes, text size
```

## Deploy (Cloudflare Workers static assets, free plan)

`wrangler.jsonc` serves `./dist` with no Worker code. With Workers Builds connected to this repo,
set in the Cloudflare dashboard (Worker `katakata` → Settings → Builds):

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy` (default)

Workers Builds does not run Wrangler's custom-build setting, so the build command must be set there.

## Hanashishou continuity

Kata-Kata is the step before [Hanashishou 話匠](https://hanashishou.vonhatsune.workers.dev/), the conversation-practice app.

- **Same scheduler:** SM-2 with Hanashishou's exact card state (`ease, interval, reps, due, lapses`), see
  `src/core/srs.ts`. A word's progress carries over unchanged. Saves from before 0.9.0 (FSRS) migrate on load.
- **Jambatan scenes** (`content/ms/jambatan/`): Hanashishou's band 1-2 Malay words that Kata-Kata does not
  teach yet, with Hanashishou's own English and Japanese meanings. Example sentences that break the
  root-word rule are left out. Regenerate after Hanashishou's vocabulary changes:
  `npm run bridge:import` (expects a Hanashishou checkout at `../hanashishou`).
- **Hand-off:** 話匠へ exports `katakata-words_<name>_<date>.json` (format: `src/core/bridge.ts`, version 1)
  and opens Hanashishou's `#/katakata?ui=<lang>` import screen. Hanashishou adds matching words to its Malay
  deck, sets Malay as the learnt language and suggests a starting band (2 once all nine chapters are
  "ready", else 1).
- Cross-app test: build and preview both apps (Kata-Kata on 4173, Hanashishou on 4179), then
  `node tests/e2e/bridge.cjs`.
