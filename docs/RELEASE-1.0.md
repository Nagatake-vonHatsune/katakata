# Kata-Kata: road to 1.0

**Proposed definition (for Sam to confirm):** the same as Hanashishou's, chosen on 2 November 2026:
**1.0 = release-ready, plus the classroom features.** Content keeps growing through 1.x.

The current version is **0.9.1** (release candidate). Bump `package.json` to 1.0.0 once every item below is ticked.

## Status

| # | Item | Status | Who |
|---|---|---|---|
| 1 | Spec phase 1 (MVP): onboarding, Kad Kata, Cari Benda, Susun Ayat, Sedia Kelas, Tanya Cikgu export, savefile, Teacher Desk, stamp card | ✅ Done; `tests/e2e/smoke.cjs` checks it end to end, offline included | Claude |
| 2 | Content: all nine Kelas chapters, 14 Dunia scenes, 5 Jambatan (bridge) scenes: 742 cards. Schema, affix guard and link check pass | ✅ Done | Claude |
| 3 | Interface in Japanese, English and Malay; language chosen on the first screen; `?lang=` links | ✅ Done | Claude |
| 4 | Hanashishou parity: same scheduler (SM-2) and card state; same hosting, offline approach and three interface languages | ✅ Done | Claude |
| 5 | Hanashishou continuity: the apps stay separate (Sam, 6 Nov 2026); progress moves across through a word file. Kata-Kata exports it (話匠へ); Hanashishou imports it into the Malay deck | ✅ Kata-Kata side live. ⏳ Hanashishou side on branch `claude/katakata-bridge`, not merged | Sam |
| 6 | **Native-speaker review of all Japanese**: glosses, frame meanings, scene titles, interface, katakana hints (spec decision 13.2) | ⏳ To do | Sam to find a reviewer |
| 7 | **Malay review**: interface (`i18n/ms.json`) and the four v3 scenes (Bank dan pos, Cuti ke pantai, Telefon baru, Rumah terbuka Hari Raya). (`belanja` on the affix allow-list: approved by Sam, 6 Nov 2026) | ⏳ To do | Sam |
| 8 | **Real-phone test** (spec 12: every phase on real student phones in airplane mode): iPhone Safari and Android Chrome, Add to Home Screen, voices and the text-only fallback, share sheet for Send to teacher and the word file | ⏳ To do | Sam |
| 9 | **Open spec decisions (13)**: unlocking (now self-paced, everything open), minutes studied (now opt-in), audio fallback (record ~200 core words?), name and mascot (native reaction, trademark and app-store search) | ⏳ Decisions | Sam |
| 10 | **Small pilot**: a few students for a week; fix what Tanya Cikgu reports and ⚑ content reports surface | ⏳ To do | Sam collects; Claude fixes |
| 11 | Accessibility and PWA audit (Lighthouse, screen-reader spot check, contrast in light and dark) | ⏳ To do | Claude |
| 12 | Cloudflare production deploy from `main` (Workers Builds) | ✅ Confirmed 6 Nov 2026 | Sam |
| 13 | Changelog and 1.0.0 version bump | ⏳ Last step | Claude |

## Phase 2 (1.x), from spec section 12

Laju, Jaring, Cakap, Kedai Tanaka and Cerita games; Cerita Tanaka stories. Phase 3: Bual scenarios, the
answers pack (cikgu-answers.json), learner-made cards with images.
