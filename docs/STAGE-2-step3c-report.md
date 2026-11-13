# Stage 2, build step 3c: Malay fixes to chapters 12 to 18 (13 Nov 2026)

Sam's review fixes to the packs of [step 3b](STAGE-2-c11-c18-report.md). Sources: Sam's instructions of 13 Nov 2026, the ledger
(Google Sheet, synced first: exactly the expected changes, nothing else), `content/rules/` unchanged. Cikgu Sensai and
Hanashishou were not touched (Hanashishou is not checked out; no Jambatan card changed). Commits: `c3e4a5a` ledger snapshot
(Sam's 16 Affix tags, row L-1267), `57cc0d8` the fixes, then the ledger snapshot after the write-back and this report.
Cards 1115 → **1116** (the new L-1267 card). `npm run check`, `smoke.cjs` and `fun.cjs` pass (fun.cjs 6 of 6 reruns).

## 1. Lines changed per chapter (each passed `tools/stage-check.mjs`, then the whole guard)

| Ch | Changed | Lines |
|---|---|---|
| 12 | scenario «Juruteknik akan melihat siling itu.» | 1 |
| 13 | f06 «Borang ini wajib diisi.» (frame «Borang ini wajib ___.»); receptionist «Sila isi borang ini.»; doctor «Saya berikan cuti sakit satu hari.»; L-1187 note | 3 |
| 14 | nothing (both lines failed, see 2) | 0 |
| 15 | new exchange «Seperti ini?» / «Ya, seperti itu, tetapi ada zip.» (2 new scenario lines); Tanaka «Yang ada zip. Yang itu! …». The «seperti» card note already names the seperti itu / macam tu pair | 3 |
| 16 | f05 «Yang ini termurah, tetapi dompet saya tertinggal di rumah.» (frame «Yang ini ___, tetapi dompet saya ___ di rumah.»); «Mesyuarat belum bermula.»; the three ter- cards now carry the ledger's ter- tag | 2 |
| 17 | f01 «Sudikah encik datang?» (frame «Sudikah encik ___?», "Would you like to come? (polite)"); Puan Aini «Bos belanja. Sudikah encik datang?»; Tanaka «Sayangnya hari Sabtu saya tidak lapang. Saya segan untuk menolak jemputan puan.»; Mei Ling «… Saya belanja!»; Tanaka «Tetapi makanan di kafe itu pedas. Saya tidak boleh tahan pedas.» (your wording, exactly); Mei Ling «Takpelah. …». Notes: sudi (asks the other person, not used of oneself), segan (new wording) | 6 |
| 18 | «Cik perlu minta cuti sakit daripada doktor.»; «Saya sudi datang.» deleted; the technician line (see 5) | 3 |

New card **L-1267 «tidak boleh tahan»** (ms-c17-023): standard, core, note says it is not «boleh tahan» (Dunia, Ch5, "not bad"). It is the last
card of the pack so no earlier card ID moves. Scenario line IDs after the c15 insertion and the c18 deletion move; nothing in the
app stores them. Japanese drafts updated for the three changed frames (c13 f06, c16 f05, c17 f01); scenario lines carry no Japanese.

## 2. Lines that failed the check (old line kept)

| Where | New wording | Why it fails |
|---|---|---|
| c14 scenario | «… kita tangguhkan ke hari Ahad atau ke hari Sabtu depan» | no ledger row «tangguhkan» |
| c14 scenario | «Kita batalkan rancangan mendaki, tetapi …» | no ledger row «batalkan» |
| c15 f03 | «Lelaki yang memakai ___.» | no ledger row «memakai» |
| c15 f04 | «Beg itu berwarna ___ dan ada ___.» | no ledger row «berwarna» |
| c15 scenario (visitor line) | «yang memakai» ×2, «membawa» | «memakai» (the «membawa» part passes on its own, but the line keeps its old form so the register stays the same) |
| c18 f03 | «Saya belum mendaftar, tetapi …» | no ledger row «mendaftar» |
| c18 f04 | «Boleh kita tangguhkan ke hari Ahad?» | no ledger row «tangguhkan» |
| c17 card **L-0690 «tak tahan»** | the Spoken card after L-1267 | see 4 |

The old lines stay as in the 3b report; the L-0641 and L-1217 card notes also still say «tangguh hingga».

## 3. Ledger and Journal

- **Ledger tab:** one cell: J1268 (L-1267 card ID `ms-c17-023`; K already read "Ch17 (unit 17)"). Whole tab read before and after;
  `writeback.py verify`: 1 cell changed, 1 planned. L-0690 untouched. Sam's 16 Affix tags were not written by me (they came in the sync).
- **Journal rows 179 to 183:** L-1267 card ID; L-0690 still open (updates row 172); the content fixes; the lines kept (ledger gaps);
  the checker change. Read back. (Row 176 is blank in the sheet; I left it.)

## 4. Checker and tests

- **Written «-lah».** `tools/stage-rules.mjs` now reads «Xlah» as X + lah once the «lah» row is placed (Ch17) when X is a known form
  (and the word is not a ledger word or adalah, masalah), like -kah. Two unit tests in `tests/unit/stage-rules.test.ts` (takpelah passes
  at 17, is still a gap at 16; masalah, adalah, salah are not read as base + lah). This is a **Kata-Kata addition**: Cikgu Sensai's
  Python checker has no such rule, so it would report «takpelah» as a ledger gap on these packs. The 72 shared fixtures still agree.
- **`fun.cjs`** seeds `Math.random` (mulberry32), so the option order is the same every run; the "points badge" step no longer needs a lucky click.
- **L-0690.** The shared register pair R3 (`content/rules/stage-rules.json`, a Cikgu Sensai file I must not edit) is «tak tahan» → «tidak tahan».
  The check wants that exact standard taught first; the ledger standard is «tidak boleh tahan», so the guard blocks the card
  ("tak tahan: Standard tidak tahan has no earlier teaching occurrence"). The wording Sam approved is saved as a comment in `ch17`.

## 5. Beyond the list (disclosed)

- c18 repeated the c12 sentence «Juruteknik akan membaiki paip itu» (with «paip» never mentioned in that scene); I changed it to «melihat siling itu» too. Easy to revert.
- The c16 and c17 frames were reworded around your example sentences (a frame must match its example).
- Tanaka's c17 refusal lost its «Terima kasih.» because I used your wording exactly.
- c14 still has «Jika hujan, kita tangguh.» (bare «tangguh»).

## 6. Questions for Sam

1. **L-0690.** Ask Cikgu Sensai to change the R3 pair to «tak tahan» → «tidak boleh tahan» (rules file and fixture); I then copy it and build the card with your wording and drop ms-j-office-14. (Or I can show «tidak tahan» in L-1267's term, but you did not choose that form.)
2. **Ledger rows** for «memakai», «berwarna», «tangguhkan», «batalkan», «mendaftar» (and placements), if you want those seven lines; otherwise say which wording to use with existing words.
3. c18 technician line and the bare «tangguh» in c14 line 546: fine, or change?
4. Cikgu Sensai: refresh `curriculum/reference/katakata/` (c10 to c18, ledger copy) and decide on «-lah» in its checker.
