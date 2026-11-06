# Changelog

## 0.10.0 (6 November 2026)

- **Points.** Every right answer earns points, with a ⚡ speed bonus and a 🔥 combo multiplier (up to ×2).
  A miss never takes points away; it only resets the combo. Points never change the review schedule.
  The summary shows score, best combo and fastest answer with "New best!" tags; Records keeps personal bests.
  Settings can hide points.
- **Laju!** (⚡ on Home): a 60-second round on words you already know (needs 8). Practice only: it does not
  change the review schedule. The clock pauses when the app is in the background.
- **Colour palettes:** Kancil Green (default), First Sound Cyan, Royal Red Gold and Rebel Blue, each with a light
  and a dark variant; every text/background pair meets WCAG AA (4.5:1). Kancil's accent is a shade darker for
  the same reason.
- **Text size:** S, M, L, XL (the whole app scales).
- New end-to-end test `tests/e2e/fun.cjs` (points, Laju!, palettes, text size).

- Ch4 time frame: "pukul empat kurang suku" (not used in everyday Malay) replaced with "pukul empat suku";
  the Ch4 lunch scenario line now says "pukul satu suku" (Sam's correction).
- Both common spellings taught: emel / e-mel, selsema / selesema, stokin / stoking, krew / kru (Sam's decision,
  recorded in the ledger's Rules tab).
- Five colloquial Dunia scenes (Vocab Bank v4, 64 cards, Claude drafts): Lepak di kedai mamak (tapau, boleh tahan,
  teh tarik...), Sembang di pantri (alamak, mana ada, lama tak jumpa...), Gambar bayi (face words), Main badminton
  (arm and leg words; it also gives Ch6 class prep a Cari Benda round) and Simpulan bahasa harian (14 idioms such
  as kepala batu, panjang tangan, buah tangan, each checked against Kamus Dewan, with a Japanese idiom hook).
- Jambatan no longer repeats a class word written as an alternative ("pintu masuk" is taught in Ch7).
- Malay ledger: rows L-0919 to L-0981 added with `tools/ledger/append_ledger.py`, which keeps existing IDs.

## 0.9.1 (6 November 2026)

- New ⚙️ Settings screen (language, display, sound, reset, about). Records (記録) now holds only stamps,
  progress and the savefile, and says where settings went.
- Change the interface language at any time: a 🌐 button at the top of every screen, including during
  practice (the new language starts from the next question).

## 0.9.0 (6 November 2026), release candidate

- **Hanashishou continuity.** New 話匠へ (To Hanashishou) screen exports a word file that Hanashishou's
  "Bring words from Kata-Kata" screen imports (Hanashishou branch `claude/katakata-bridge`).
  Five Jambatan (bridge) scenes teach Hanashishou's band 1-2 Malay words that Kata-Kata did not have, with
  Hanashishou's own meanings; cards that also appear in Hanashishou carry a 🦁 chip.
- **Same scheduler as Hanashishou.** Switched from FSRS to SM-2 with Hanashishou's exact card state, so
  progress carries over unchanged. Older saves migrate automatically.
- Release checklist: `docs/RELEASE-1.0.md`.

## 0.2.0 (6 November 2026)

- All nine chapters and the ten starter scenes live; four new scenes (Vocab Bank v3).
- Malay interface; language choice on the first screen; `?lang=` links.

## 0.1.0 (6 November 2026)

- Phase 1 MVP: onboarding, Today's practice, Sedia Kelas, Kad Kata, Cari Benda, Susun Ayat, Tanya Cikgu
  with Send to teacher, savefile, stamp card, Teacher Desk. Chapters 1-3 and three scenes.
