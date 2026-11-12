# Kata-Kata: road to 1.0

**Proposed definition (for Sam to confirm):** the same as Hanashishou's, chosen on 2 November 2026:
**1.0 = release-ready, plus the classroom features.** Content keeps growing through 1.x.

The current version is **0.10.0** (release candidate). Bump `package.json` to 1.0.0 once every item below is ticked.

## Status

| # | Item | Status | Who |
|---|---|---|---|
| 1 | Spec phase 1 (MVP): onboarding, Kad Kata, Cari Benda, Susun Ayat, Sedia Kelas, Tanya Cikgu export, savefile, Teacher Desk, stamp card | ✅ Done; `tests/e2e/smoke.cjs` checks it end to end, offline included | Claude |
| 2 | Content: all nine Kelas chapters, 20 Dunia scenes (five colloquial ones added in v4, a greetings scene for Ch1 in v5), 5 Jambatan (bridge) scenes: 920 cards after the 12 Nov 2026 clean-up ([report](CLEANUP-2026-11-12.md)). Schema, affix guard and link check pass | ✅ Done | Claude |
| 3 | Interface in Japanese, English and Malay; language chosen on the first screen; `?lang=` links | ✅ Done | Claude |
| 4 | Hanashishou parity: same scheduler (SM-2) and card state; same hosting, offline approach and three interface languages | ✅ Done | Claude |
| 5 | Hanashishou continuity: the apps stay separate (Sam, 6 Nov 2026); progress moves across through a word file. Kata-Kata exports it (話匠へ); Hanashishou imports it into the Malay deck | ✅ Done: both sides live; Hanashishou import merged to `main` and deployed 6 Nov 2026 | Claude |
| 6 | **Native-speaker review of all Japanese**: glosses, frame meanings, scene titles, interface, katakana hints (spec decision 13.2) | ⏳ To do | Sam to find a reviewer |
| 7 | **Malay review**: interface (`i18n/ms.json`), the four v3 scenes and the v5 additions (123 new cards: Japanese is a draft too) (Bank dan pos, Cuti ke pantai, Telefon baru, Rumah terbuka Hari Raya). (`belanja` on the affix allow-list: approved by Sam, 6 Nov 2026) | ⏳ To do | Sam |
| 8 | **Real-phone test** (spec 12: every phase on real student phones in airplane mode): iPhone Safari and Android Chrome, Add to Home Screen, voices and the text-only fallback, share sheet for Send to teacher and the word file | ⏳ To do | Sam |
| 9 | **Open spec decisions (13)**: unlocking (now self-paced, everything open), minutes studied (now opt-in), audio fallback (record ~200 core words?), name and mascot (native reaction, trademark and app-store search) | ⏳ Decisions | Sam |
| 10 | **Small pilot**: a few students for a week; fix what Tanya Cikgu reports and ⚑ content reports surface | ⏳ To do | Sam collects; Claude fixes |
| 11 | Accessibility and PWA audit (Lighthouse, screen-reader spot check, contrast in light and dark) | ⏳ To do | Claude |
| 12 | Cloudflare production deploy from `main` (Workers Builds) | ✅ Confirmed 6 Nov 2026 | Sam |
| 13 | Changelog and 1.0.0 version bump | ⏳ Last step | Claude |

## After the clean-up (12 Nov 2026)

Open items from [CLEANUP-2026-11-12.md](CLEANUP-2026-11-12.md): the Cikgu Sensai snapshot refresh (`c01.json` to `c09.json`),
the Hanashishou mapping of L-0592 to L-0330, the Kamus Dewan check of L-0983 to L-1088, and Sam's four questions.

## Phase 2 (1.x), from spec section 12

Laju, Jaring, Cakap, Kedai Tanaka and Cerita games; Cerita Tanaka stories. Phase 3: Bual scenarios, the
answers pack (cikgu-answers.json), learner-made cards with images.
