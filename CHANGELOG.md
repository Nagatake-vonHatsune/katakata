# Changelog

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
