# Stage 2, build step 3f: rules sync and one card removed (14 Nov 2026)

- **Ledger sync:** exactly the two expected changes (L-1303 Retired, Journal row 200; L-0530 Action «KD4 check», row 201). Nothing else changed.
- **Card removal:** `ms-c17-026` «minggu depan» dropped (last card in c17; no other ID moved; in no Sedia Kelas list; only c17.json changed). Cards 1178 to 1177.
- **Ledger cells:** J1304 and K1304 (L-1303) cleared; whole tab read before and after; `writeback.py verify`: 2 changed, 2 planned. Journal rows 202 to 205 (written with `update_values`, read back).
- **Rules:** `stage-rules.json` and `stage-rules-fixtures.json` copied unedited from Cikgu Sensai `4f2391ba5340d60fdf3cf202fde50071e6725ca7`; `SOURCE.json` commit and hashes updated.
  `tools/stage-rules.mjs` now matches a two-word disallowed form as the two words in order (same pattern as `language_checks.py`).
  All 81 fixtures agree with their expected results (`lah-in-answer-key-fails` now uses «Takpelah, saya tunggu.»); the known-divergence exemption is removed.
- **Checks:** build reproducible (map identical on a second run; only c17.json differs from the committed packs); `npm run check` (54 tests), `smoke.cjs`, `fun.cjs`.
- Row 200 stays Open for Cikgu Sensai (remove `curriculum/phrases-taught-earlier.json`). Cikgu Sensai and Hanashishou were not edited.
