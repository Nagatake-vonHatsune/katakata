# Kata-Kata · マレー語 ことば道場

A free, offline Malay word trainer for Japanese adults, built for Sam's class.
It's a static PWA: no accounts, no analytics, no server. Learner data leaves the
device only when the learner exports it.

*Satu kata, satu langkah.* 一語ずつ、一歩ずつ。

- Student app: `/` (Japanese, English or Malay interface; the first screen asks)
- Language links for sharing: `/?lang=ja`, `/?lang=en`, `/?lang=ms`
- Teacher Desk: `/teacher/` (drop in student files, merge questions, print the class agenda)

With the English or Malay interface, word meanings are shown in English (the Vocab Bank has English
and Japanese glosses). Katakana hints only appear in the Japanese interface.

## Phase 1 (this version)

| Spec item | Where |
|---|---|
| Onboarding: name, voice check, iOS "Add to Home Screen" step | `src/views/onboarding.ts` |
| All nine Kelas chapters and 14 Dunia scenes (611 cards) | `content/ms/` (packs with `"status": "live"`) |
| 今日の練習: due reviews, then 5–8 new words, one frame drill, one Cari Benda round | `src/core/session.ts` |
| Kad Kata, Cari Benda, Susun Ayat | `src/games/<id>/` (common `Game` interface) |
| 授業の準備 (Sedia Kelas) with "Ready" stamp | `src/views/modes.ts` |
| 先生に質問 + 先生に送る (preview, untick sections, share sheet or download) | `src/views/tanya.ts` |
| Savefile export / import (checksum, preview, merge or replace) | `src/core/savefile.ts`, `src/views/rekod.ts` |
| Stamp card, gentle streak (one rest day allowed), weekly backup reminder | `src/core/progress.ts` |
| Teacher Desk: merge, duplicate counts, prep table, weakest words, A4 agenda | `teacher/`, `src/teacher/` |
| Offline after first visit | service worker generated at build (`src/sw-template.js`) |

Also in: Japanese-first UI with an English toggle, やり方 cards and a `?` button on every activity,
わからない on every question, no red crosses (misses come back later in the session),
katakana hints that fade after three showings, ⚑ content reports, light/dark mode,
a simple 単語ネット word list with "my hook" notes.

## Content

One JSON file per chapter or scene, validated against `content/schema/pack.schema.json`.
Card fields follow the shared Hanashishou format: `id, lang, term, gloss_en, gloss_ja, pos,
affix_tag, note, links[], scene, chapter, image`.

- Master workbook: `content/source/2026-11-06_KataKata_VocabBank_v3.xlsx` (v2 plus four new scenes:
  Bank dan pos, Cuti ke pantai, Telefon baru, Rumah terbuka Hari Raya; these rows are Claude drafts).
- Only packs with `"status": "live"` ship in the app (set by `live_kelas` / `live_dunia` in
  `tools/import-overrides.json`). All packs are live at the moment.
- Re-import from the workbook: `python3 -I tools/import_vocab_bank.py content/source/2026-11-06_KataKata_VocabBank_v3.xlsx`
- Japanese frame meanings, scene titles and Cari Benda emoji live in `tools/import-overrides.json`.
- Content checks (also run by `npm run build` and CI): `npm run content:check`
  - schema check on every pack
  - affix guard (ber-, be- before k/l, me- + consonant) with the spec's allow-list; the v2 bank passes with 0 flags
  - link check (targets exist; pair links only to same or earlier chapter)
- Recorded audio (plan B for phones without a Malay voice): `public/audio/ms/<card-id>.mp3`

**All Japanese text (glosses, frame meanings, scene titles, interface) is a Claude draft and needs a native check before students see it. The Malay interface (`i18n/ms.json`) and the four new v3 scenes are Claude drafts too.**

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
```

## Deploy (Cloudflare Workers static assets, free plan)

`wrangler.jsonc` serves `./dist` with no Worker code. With Workers Builds connected to this repo,
set in the Cloudflare dashboard (Worker `katakata` → Settings → Builds):

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy` (default)

Workers Builds does not run Wrangler's custom-build setting, so the build command must be set there.

## Scheduler

FSRS via [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) (MIT). Spec 10.4 asks for the same
algorithm as Hanashishou; confirm Hanashishou also uses FSRS.
