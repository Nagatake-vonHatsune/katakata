# Malay vocabulary ledger

**Source of truth:** the Google Sheet "2026-11-06_KataKata-Hanashishou_MalayLedger_v1" in Sam's Drive
(spreadsheet ID `1X8t3ENRVUY_NHJ3xEB7UY3OiwwUg_KUZT-ESbtiMC0o`). Sam decided on 6 Nov 2026 that this sheet is
the reference for audit and development of Malay vocabulary in both Kata-Kata and Hanashishou.

- One row per Malay term (permanent ID `L-0001`...), with where it lives in each app, its Kamus Dewan check,
  review status and any open action.
- Changes are logged in the sheet's **Journal** tab (date, entry, field, before → after, who, why, where it was
  pushed and the commit).
- `malay-ledger.csv` here is a snapshot of the Ledger tab at the last sync, so changes made in the sheet can be
  diffed and pushed to the apps.

## Tools

- `tools/ledger/sheet_to_snapshot.py <values.json>` turns a read of the sheet's Ledger tab (A1:T last row) into
  `malay-ledger.csv` (CRLF, 20 columns), so a diff shows exactly the changed rows. The snapshot is at L-1266 (13 Nov 2026).

- `tools/ledger/build_ledger.py ../hanashishou kd4.txt out.json` builds the rows from both apps and checks each
  term against Kamus Dewan Edisi Keempat. `kd4.txt` is `pdftotext -layout` of the KD4 PDF Sam provided (an
  unofficial text conversion; page numbers are PDF pages). The dictionary text is never committed: only
  whether and where a term was found.
- The sheet's hidden **Check** tab holds a per-row fingerprint used to verify uploads.
