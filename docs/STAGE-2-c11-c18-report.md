# Stage 2, build step 3b: packs c11 to c18 (13 Nov 2026)

**What this is.** The report for chapters 11 to 18 of the Kata-Kata half of Stage 2 build step 3, which Sam authorised on
13 Nov 2026 after the step 3a report ([STAGE-2-c10-report.md](STAGE-2-c10-report.md)). Sources: Cikgu Sensai
`docs/stage-2-plan.md` and `docs/stage-2-decisions.md` at `56627dc` (read only; `curriculum/stage-rules.json` is unchanged since
`56627dc`, so `content/rules/` is still current), the Malay ledger (Google Sheet), and Hanashishou `e5e167c` for the Jambatan
rebuild (read only). Neither repository was edited. The chapter template in [HANDOFF.md](HANDOFF.md) was followed for every
chapter, one chapter per commit; each chapter ran `npm run check`, both end-to-end tests, the ledger write-back and a push to
`main` (Cloudflare deploys `main`).

**Result:** 958 → **1115** live cards, 35 → **43** packs (Kelas chapters 1 to 18). 196 new class cards, 39 Jambatan cards
replaced by class cards. Final `npm run check` (types, 48 unit tests, content check, build) and `smoke.cjs` and `fun.cjs` pass.

## 1. Per chapter

| Ch | Topic | Class cards | Recognise-only | Frames | Scenario lines | Sedia Kelas (chapter + review) | Jambatan dropped |
|---|---|---:|---:|---:|---:|---|---:|
| 11 | meN- verbs (11A, 11B) | 43 | 2 (tukar, deadline) | 6 | 18 | 34 = 19 + 15 | 5 |
| 12 | -kan and -i (12A, 12B) | 45 | 1 (nombor tracking) | 6 | 19 | 36 = 21 + 15 | 14 |
| 13 | health: permission, need, advice | 24 | 0 | 6 | 18 | 27 = 13 + 14 | 8 |
| 14 | reasons, conditions, purpose, sequence | 20 | 0 | 6 | 15 | 29 = 14 + 15 | 2 |
| 15 | describing with yang | 19 | 0 | 6 | 15 | 28 = 14 + 14 | 3 |
| 16 | accidental ter- | 23 | 0 | 6 | 17 | 31 = 16 + 15 | 3 |
| 17 | standard and spoken Malay, particles, invitations | 22 of 23 rows | 3 (kan, lah, takpe / tak apa) | 6 | 20 | 32 = 18 + 14 | 4 |
| 18 | Stage 2 review (no new words) | 0 | 0 | 6 | 22 | 20 review only | 0 |

| Commit | What |
|---|---|
| `323b5fc` | Ledger snapshot synced from the sheet (the four ber- tags, Journal row 152); `LEDGER_BASELINE` moves to it and c10 rebuilds unchanged |
| `7b4cfb5` `99439b4` | c11 pack, then its ledger snapshot |
| `c2f7387` `1ac39f5` `c7b5d34` | c12 pack, its snapshot, hand-off counts |
| `fd68eab` `e3d7517` | c13 pack, snapshot |
| `9266ada` `0e3e9c1` | c14 pack, snapshot |
| `80d567d` `2acf8d0` | c15 pack, snapshot |
| `8cf3c8f` `dc1de33` | c16 pack, snapshot |
| `69f2d19` | c15 follow-up: «seperti itu» (see 2.5) |
| `1b21fb4` `a0cf983` | c17 pack, snapshot |
| `1ab4c3e` | c18 review pack, importer, schema and check-content support for a chapter without vocabulary rows |

Every card takes the ledger row's Malay, English, draft Japanese, part of speech and affix tag. Every affixed card shows its root
and the chapter where Kata-Kata teaches it. Every frame example, scenario line and card term passes all four checks at its own
chapter (only words placed in chapters 1 to N, no Indonesian forms, spoken forms only after their standard form and a "Spoken:"
label). Earlier packs rebuild byte for byte (checked each chapter, and the workbook rebuild is identical on a second run).

## 2. What was done where the plan needed a decision

1. **c11 spelling.** Each card names its nasal change (mem- before b; the t, p, s or k of the root drops: menulis, memanggil,
   menyewa, mengira; meng- before h or a vowel; men- before c, d, j; me- before l and m) and the Chapter 9 di- partner where one
   exists (dibaca, ditulis …). No di- passive is shown for verbs without a Chapter 9 form (mencari, menerima, melihat …) or
   without an object (melancong). «terima» and «lihat» have no root card, so they are taught as whole words (plan).
2. **c12.** -kan and -i cards show root + suffix with the root's chapter; pe-, ke-an words are marked as whole words; «bersihkan»
   is bersih + -kan, «berikan» is beri + -kan (not ber- + ikan), double k in letakkan and tunjukkan.
3. **c13.** The scenes only ask for clarification; no diagnosis, treatment or dose is written (the doctor's lines are "should
   rest", sick leave). «mesti» is a root, «dibenarkan» is di- … -kan, «kebenaran» is taught only as "permission".
4. **c16.** The first cards contrast accident ter- with the Chapter 6 superlatives; terkunci, tercedera and terputus are marked as
   states. The «ter-» ledger tag is `ter-` on the 11 new rows but `root` on L-0619, L-0621, L-0644 (cards follow the ledger).
5. **c15 follow-up (`69f2d19`).** The plan puts «seperti itu» in Chapter 15 so that the Chapter 17 spoken «macam tu» comes after its
   standard form, and the register check needs that order. My c15 only used «seperti», so the scenario now says «Yang ada zip,
   seperti itu.» and the «seperti» card names the pair. No ledger cell changed.
6. **c17.** Standard first: «tidak mengapa» comes before «takpe»; «kan» and «lah» (and «takpe», ledger row L-1266, added after
   the plan) are recognise-only; every spoken card's note starts with "Spoken:" and names its standard partner. The L-1266 card
   shows both spoken forms («takpe / tak apa», like «mahu / nak» in Stage 1), because the check only counts a spoken form as
   labelled if an earlier card's term contains it, and «tak apa» is otherwise only the Chapter 5 Dunia card. **L-0690 «tak tahan» is
   not built** (question 1).
7. **c18.** No class cards, so no ledger cells; the pack has six frames (one pattern from each of chapters 10 to 17), a 22-line
   scenario (a working week: introduction and handover, a leak and a parcel, an appointment and sick leave, a lost wallet, a
   dinner invitation moved to Sunday) and 20 review cards from chapters 10 to 17 across the five themes. To build it the
   importer now emits a chapter that has frames and a scenario but no vocabulary rows, `cards` may be empty in the pack schema,
   and `check-content` accepts an empty Kelas pack only when it has review cards, frames and a scenario. The app shows it as
   "Chapter 18 · Prep 0/20", opens its Sedia Kelas page and the Rekod page without errors (checked in a browser).

## 3. Ledger and Journal

- **Ledger tab (columns J and K only):** 235 cells over 196 rows: c11 48, c12 59, c13 32, c14 22, c15 22, c16 26, c17 26. After
  each write the whole tab was read back and compared with the read before it (`tools/ledger/writeback.py verify`): exactly the
  planned cells changed, every time. Action "KD4 check", "Last changed" and "Changed by" were not touched. c18 writes nothing.
- **Journal rows 153 to 175 (23 rows):** per chapter the new rows' card IDs, the existing rows' card IDs, the rows that lost a
  Jambatan card, the ledger tags that are blank or `root`, the open L-0690 row, the c15 content change, the c18 pack, and Sam's
  answers 1, 2, 4 and 5 to the step 3a questions (row 175; answer 3 is row 152).
- **Cards whose ledger Affix tag was blank (the card carries a tag, the ledger does not):** L-0865 mendaki, L-0792 menyimpan,
  L-0819 menyemak (meN-), L-0849 tarikh akhir (chunk); L-0743 pastikan (-kan), L-0789 menghubungi (meN- -i), L-0871 perlahankan
  (-kan); L-0752 tersilap, L-0875 tersangkut (ter-), L-0758 tidak sengaja (chunk); L-0828 sudi (root), L-0787 malangnya (-nya),
  L-0748 singgah (root). 13 rows.
- Tools added: `tools/ledger/join_reads.py` (join the two reads of the tab), `tools/ledger/wbcalls.py` (the update calls for a plan).

## 4. Not verified

- **Kamus Dewan:** none of the chapter 11 to 18 forms was checked (end of the project, Sam). The nasal spellings follow the plan;
  «menge-» before a one-syllable root (mengecas) is general grammar that the plan does not state: [INFERRED]. «tangguh» is used
  without meN- («Boleh kita tangguh hingga hari Ahad?»), as the ledger row has it.
- **Japanese:** card meanings are the ledger's drafts; chapter titles, scenario titles and frame meanings are my drafts, for the
  native review.
- **Fictional procedures:** the guardhouse, the management office keeping a parcel, the technician slot and the panel clinic are
  invented classroom scenes. Whether couriers print «nombor penjejakan» is still unconfirmed (plan note).
- **The Opus check of each pack's frames** that the build order asks for was not run in this session. The frames and lines in
  section 6 are the ones to read first.
- **Naturalness** is my judgement throughout; no native speaker has read any of it.

## 5. Questions for Sam

1. **L-0690 «tak tahan».** The plan says show «tidak tahan» first, and the register check needs the standard form taught before the
   spoken one. The ledger has no row for «tidak tahan» (or «tahan»), so writing it is a ledger gap that blocks the build, and the
   «tak tahan» card cannot pass without it. Either add a «tidak tahan» row in Chapter 17 (then I build both cards), or leave
   L-0690 as the Jambatan card it is now. Its ledger cells are untouched.
2. **Ledger tags.** Fill in the Affix tag on the 13 rows above, and decide whether L-0619 tertinggal, L-0621 terlepas, L-0644
   terlupa should be `ter-` like the 11 new ter- rows (they say `root`). A ledger session.
3. **Chapter 17 recognition.** I made «kan», «lah» (your R4) and «takpe / tak apa» recognise-only; kat, ni, tu, macam tu and set
   are ordinary cards labelled "Spoken:". Is that the split you want? And is the combined term «takpe / tak apa» on L-1266 fine?
4. **c15 edit after the push.** I changed one scenario line and one card note in c15 so that «seperti itu» comes before «macam tu»
   (section 2.5). Fine, or should «seperti itu» go in a frame instead?
5. **Opus check.** HANDOFF says each pack's frames get an Opus check before the next chapter. Do you want it now for c11 to c18,
   or at the native review?
6. **Cikgu Sensai** still has `curriculum/reference/katakata/` at c10: it needs `c11.json` to `c18.json` and the ledger copy
   (this session does not edit it).

## 6. Malay a native should read first

- **c11:** «Sudah. Saya membaca emel itu pagi tadi, kemudian saya menghantar fail itu.» · «Saya mengira jumlah itu semalam, tetapi
  tolong semak sekali lagi.» · «Boleh saya mengecas telefon saya di sini? Bateri sudah habis.» · «Isteri saya mengajar saya
  memasak nasi lemak.» · «Mari kita minum kopi. Saya yang membayar.»
- **c12:** «Boleh tolong hantarkan bungkusan kecil itu ke unit 8-1?» · «Saya simpankan bungkusan itu di pondok pengawal dulu.» ·
  «Nombor penjejakan ada dalam mesej ini.» · «Air turun dari siling atau dari paip?» · «Saya takut lampu itu rosak.» · «Saya isi
  borang aduan sekarang.»
- **c13:** «Encik tidak perlu datang ke pejabat esok.» · «Saya bagi cuti sakit satu hari.» · «Maaf, boleh cakap lagi sekali? Saya
  tidak faham arahan itu.» · «Encik mesti baca arahan di label. Dos ada di label itu.» · «Boleh doktor melihat tangan saya
  sekarang?»
- **c14:** «Ada dua pilihan: kita tangguh hingga hari Ahad atau hingga hari Sabtu depan.» · «Mendaki batal, tetapi kita masih makan di
  kafe.» · «Oh, itu bahasa mesej. Kalau kita bercakap, kita guna kalau dan bila, ya?»
- **c15:** «Yang ada zip, seperti itu.» · «Saya tidak ingat jenamanya. Bentuknya segi empat, seperti kotak kecil.» · «Dia dengan seorang
  perempuan yang pakai topi.» · «Dia dekat kaunter, di sebelah lif.»
- **c16:** «Kunci saya tertinggal di dalam rumah. Pintu terkunci.» · «Saya terlepas bas, kemudian saya tersangkut di jalan yang sesak.» ·
  «Di mana yang sakit?» · «Boleh doktor melihat tangan saya sekarang?»
- **c17:** «Takpe lah. Kita cari kedai lain. Macam tu boleh?» · «Ada, kedai mamak kat depan pejabat tu. Dekat sahaja.» · «Saya segan
  menolak jemputan itu.» · «Cakap seperti itu pun bagus, kan?» · «Bos belanja. Encik sudi datang?»
- **c18:** «Hari ini cik akan membaca emel ini dan menyemak draf itu.» · «Label itu koyak, jadi pengawal mahu tengok mesej saya.» ·
  «Cuba tanya di kaunter barang hilang di stesen.»

## 7. Other notes

- `tests/e2e/fun.cjs` failed once during c14 at "a right answer shows a points badge" (the test clicks the first option and needs
  one right answer in 25 steps), then passed 9 of 9 reruns and in every later chapter. It looks like a flaky test, not content.
- The ledger sheet was read in two parts each time (A1:T600 and A601:T1400); no other session edited it during the run (each
  "before" read equalled the snapshot).
- Hanashishou stays untouched; its local checkout at `e5e167c` was used read only for the Jambatan rebuild.
