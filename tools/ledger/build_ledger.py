"""Build the Malay vocabulary ledger rows from both apps, checked against Kamus Dewan.

Usage (from the Kata-Kata repo root):
    python3 -I tools/ledger/build_ledger.py ../hanashishou /path/to/kd4.txt out.json

kd4.txt is `pdftotext -layout` of the Kamus Dewan Edisi Keempat PDF Sam provided (an unofficial text
conversion; page numbers are PDF pages, not the printed book). The dictionary text itself is never
written out: the ledger only records whether and where a term was found.

Writes out.json: {"rows": [...], "stats": {...}}. Each row is one Malay term (case-insensitive) with its
place in Kata-Kata and in Hanashishou. The Google Sheet "Malay Ledger" is the source of truth; this script
seeds it and, later, reconciles it against the repos (tools/ledger/reconcile.py).
"""

import glob
import json
import re
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def norm(t):
    return re.sub(r"[.!?,]", "", t).strip().lower()


def commit(repo):
    return subprocess.run(["git", "-C", str(repo), "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()


# ---------------- Kamus Dewan index ----------------
def _lis(keys):
    """Indices of a longest non-decreasing subsequence (patience sorting, O(n log n))."""
    import bisect
    tails, tails_idx, prev = [], [], [-1] * len(keys)
    for i, k in enumerate(keys):
        j = bisect.bisect_right(tails, k)
        if j == len(tails):
            tails.append(k)
            tails_idx.append(i)
        else:
            tails[j] = k
            tails_idx[j] = i
        prev[i] = tails_idx[j - 1] if j > 0 else -1
    out, i = [], tails_idx[-1] if tails_idx else -1
    while i != -1:
        out.append(i)
        i = prev[i]
    return set(out)


def kd4_index(path):
    """Headword -> PDF page, and headword -> (page, entry text) for phrase and derived-form lookups.

    The text conversion does not mark bold, and on some pages derived forms or wrapped lines start at the
    margin. Real headwords run A to Z through the book, so the longest alphabetical run of margin lines is
    taken as the headwords and everything else as part of the entry above it.
    """
    pages = Path(path).read_text(encoding="utf-8").split("\f")
    labels = r"Ar|Jw|Id|Jk|Mn|Kl|Ing|Bel|Cn|Tm|Sk|Por|Hind|Bio|kep|sl|sr|sj|sbg"
    hw_re = re.compile(
        r"^([A-Za-zÀ-ÿ'\-\.]+(?:\s[A-Za-zÀ-ÿ'\-\.]+)*?)"  # headword (may be several words)
        r"(?=\s+(?:I{1,3}|IV|V|VI{0,3})\b"  # homograph number
        r"|\s+[A-Z][A-Za-z]{0,3}\b"  # label: Ar, Jw, IB, Kd ...
        r"|\s*→|\s{3,}|\s*[;,=]"  # cross-reference, column gap, punctuation
        r"|\s+(?:" + labels + r"|\d|\()|\s+[a-z~(\"“]|$)"
    )
    lines = []  # (page, text, names or None)
    for pi, pg in enumerate(pages, start=1):
        if pi == 1:
            continue
        for line in pg.split("\n"):
            if not line.strip():
                continue
            names = None
            if not line.startswith(" "):
                m = hw_re.match(line)
                if m:
                    names = [h.strip().lower() for h in re.split(r",\s*", m.group(1)) if h.strip()]
            lines.append((pi, line.strip(), names))
    margin = [i for i, (_, _, n) in enumerate(lines) if n]
    keys = [re.sub(r"[^a-z]", "", lines[i][2][0]) for i in margin]
    real = {margin[j] for j in _lis(keys)}
    head, blocks, cur = {}, {}, None
    for i, (pi, text, names) in enumerate(lines):
        if i in real:
            for h in names:
                head.setdefault(h, pi)
            cur = names[0]
            if cur not in blocks:
                blocks[cur] = (pi, [])
        if cur:
            blocks[cur][1].append(text)
    return head, {h: (pg, " ".join(ls)) for h, (pg, ls) in blocks.items()}


PREFIXES = ["memper", "menge", "meng", "meny", "mem", "men", "me", "ber", "be", "bel", "peng", "peny", "pem", "pen", "pel",
            "per", "pe", "ke", "se", "ter", "di"]
SUFFIXES = ["kannya", "kan", "an", "i", "nya", "kah", "lah"]
NASAL = {"mem": "p", "pem": "p", "men": "t", "pen": "t", "meng": "k", "peng": "k", "meny": "s", "peny": "s"}


def root_candidates(w):
    """Possible roots of an affixed word, most specific first (berjaga-jaga -> jaga, menghargai -> harga)."""
    w = w.lower()
    out = []
    if "-" in w:  # reduplication: berjaga-jaga, sebaik-baiknya, berulang-alik
        a, b = w.split("-", 1)
        for x in (b, a):
            out.append(x)
            out += root_candidates(x)
    stems = [w]
    for suf in SUFFIXES:
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            st = w[: -len(suf)]
            stems.append(st)
            if suf == "an" and st.endswith("p"):  # jawab -> jawapan
                stems.append(st[:-1] + "b")
    out += [st for st in stems if st != w]  # ketuai -> ketua before tuai
    for st in stems:
        for pre in PREFIXES:
            if st.startswith(pre) and len(st) - len(pre) >= 3:
                base = st[len(pre):]
                out.append(base)
                for suf in SUFFIXES:  # kesimpulan -> simpul
                    if base.endswith(suf) and len(base) - len(suf) >= 3:
                        out.append(base[: -len(suf)])
                if pre in NASAL:
                    out.append(NASAL[pre] + base)
                if pre in ("ke", "pe", "per", "ber", "ter", "se", "di"):
                    for p2 in ("ber", "per", "ter", "se"):  # keberkesanan, sebaik-baiknya
                        if base.startswith(p2) and len(base) - len(p2) >= 3:
                            out.append(base[len(p2):])
    return list(dict.fromkeys(x for x in out if x and x != w))


def _find_word(w, head, blocks):
    """-> ('Headword'|'Under root', page, root) or None for a single word."""
    if w in head:
        return ("Headword", head[w], "")
    for r in root_candidates(w):
        if r in blocks and re.search(rf"(?<![a-z]){re.escape(w)}(?![a-z])", blocks[r][1]):
            return ("Under root", blocks[r][0], r)
    for r in root_candidates(w):
        if r in head:
            return ("Root only", head[r], r)
    return None


def cross_reference(w, head, blocks):
    """KD4 entries like "krew → kru" point to the preferred spelling."""
    b = blocks.get(w)
    m = re.match(rf"{re.escape(w)}\s*→\s*([a-z\-]+)", b[1]) if b else None
    return (m.group(1), head[m.group(1)]) if m and m.group(1) in head else None


def spelling_variant(w, head, blocks):
    """A near-identical KD4 headword (selsema -> selesema, emel -> e-mel, stokin -> stoking)."""
    import difflib
    for v in (w[0] + "-" + w[1:], w.replace("-", "")):  # emel -> e-mel
        if v != w and v in head:
            return (v, head[v])
    if len(w) < 5:  # short words and acronyms give false matches (tac -> taci)
        return None
    pool = [h for h in head if h[:1] == w[:1] and abs(len(h) - len(w)) <= 2 and " " not in h]
    near = difflib.get_close_matches(w, pool, n=1, cutoff=0.85)
    return (near[0], head[near[0]]) if near else None


def kd4_check(term, head, blocks):
    """-> (status, ref, root) for a term, possibly multiword or with '/' alternatives.

    Statuses, best first: Headword; Under root (listed inside its root's entry); Phrase under headword
    (e.g. "~ terbang" under kapal); Root only (the root is listed, this form is not); Words found separately;
    Not found.
    """
    order = ["Headword", "Under root", "Phrase under headword", "Root only", "Words found separately", "Spelling differs", "Not found"]
    alts = [a for a in re.split(r"\s*/\s*", re.sub(r"\(.*?\)", " ", term)) if a.strip()]
    results = []
    for alt in alts:
        t = norm(alt).strip("-")
        words = t.split()
        if len(words) == 1:
            xref = cross_reference(t, head, blocks)
            f = None if xref else _find_word(t, head, blocks)
            if f:
                results.append((f[0], f"p.{f[1]}", f[2]))
            else:
                v = xref or spelling_variant(t, head, blocks)
                results.append(("Spelling differs", f"KD4: {v[0]} p.{v[1]}", "") if v else ("Not found", "", ""))
            continue
        if t in head:
            results.append(("Headword", f"p.{head[t]}", ""))
            continue
        hit = None
        for w in words:
            b = blocks.get(w)
            others = " ".join(x for x in words if x != w)
            if b and (re.search(rf"~\s*{re.escape(others)}(?![a-z])", b[1]) or re.search(rf"(?<![a-z]){re.escape(t)}(?![a-z])", b[1])):
                hit = w
                break
        if hit:
            results.append(("Phrase under headword", f"p.{blocks[hit][0]}", hit))
            continue
        found = {w: _find_word(w, head, blocks) for w in words}
        missing = [w for w, f in found.items() if not f]
        variants = {w: spelling_variant(w, head, blocks) for w in missing}
        if missing and all(variants.values()):
            results.append(("Spelling differs", "KD4: " + ", ".join(f"{v[0]} p.{v[1]}" for v in variants.values()), ""))
        elif missing:
            results.append(("Not found", "missing: " + ", ".join(missing), ""))
        else:
            results.append(("Words found separately", ", ".join(f"{w} p.{f[1]}" for w, f in found.items()), ""))
    worst = max(results, key=lambda r: order.index(r[0]))
    if len(results) == 1:
        return worst
    return (worst[0], " / ".join(r[1] for r in results if r[1]), " / ".join(r[2] for r in results if r[2]))


# ---------------- apps ----------------
def load_katakata():
    rows = []
    src_v3 = {"bank-pos", "cuti-pantai", "telefon-baru", "perayaan-raya"}
    for f in sorted(glob.glob(str(ROOT / "content/ms/**/*.json"), recursive=True)):
        p = json.load(open(f, encoding="utf-8"))
        for c in p["cards"]:
            if p["kind"] == "kelas":
                loc, origin = f"Ch{p['chapter']}", "Vocab Bank v2"
            elif p["world"]["id"] == "jambatan":
                loc, origin = f"Jambatan · {p['title']['en']}", "Hanashishou (bridge)"
            else:
                loc, origin = f"Dunia · {p['title']['ms']} (primes Ch{p['chapter']})", "Vocab Bank v3 (Claude)" if p["id"] in src_v3 else "Vocab Bank v2"
            rows.append({"term": c["term"], "id": c["id"], "loc": loc, "origin": origin, "pos": c["pos"], "affix": c["affix_tag"],
                         "en": c["gloss_en"], "ja": c["gloss_ja"], "recognise_only": c.get("recognise_only", False)})
    return rows


ALLOW = {"berat", "bersih", "belok", "belakang", "belas", "belum", "beli", "besar", "bebas", "beliau", "berus", "merah", "meja",
         "meter", "mesyuarat", "mereka", "mendung", "menu", "belanja", "berapa", "belajar", "melati", "melaka"}


def affixed_words(sentence):
    """ber-/be-(k,l)/meN- shaped words not on the allow-list (same rule as tools/affix-guard.mjs)."""
    out = []
    for w in re.findall(r"[A-Za-z][A-Za-z'-]*", sentence or ""):
        lw = w.lower()
        if lw in ALLOW:
            continue
        if lw.startswith("ber") or re.match(r"^be[kl]", lw) or re.match(r"^me[^aeiou\W]", lw):
            out.append(w)
    return out


def load_hanashishou(hs):
    out = {}
    for vf in sorted(glob.glob(str(Path(hs) / "content/packs/*/targets/ms/vocab.json"))):
        pack = vf.split("/")[-4]
        lang = {l: json.load(open(Path(hs) / f"content/packs/{pack}/targets/ms/lang/{l}.json", encoding="utf-8")) for l in ("en", "ja")}
        for w, c in json.load(open(vf, encoding="utf-8")).items():
            breaks = []
            if c["band"] <= 2:
                for b, ex in (c.get("examples") or {}).items():
                    bad = affixed_words(ex) if int(b) <= 2 else []
                    if bad:
                        breaks.append(f"band {b} example \"{ex}\" uses {', '.join(bad)}")
            out[w] = {"breaks": breaks, "pack": pack, "band": c["band"], "pos": c.get("pos", ""),
                      "en": (lang["en"].get(f"vocab.{w}.meaning") or "").strip().rstrip("."),
                      "ja": (lang["ja"].get(f"vocab.{w}.meaning") or "").strip().rstrip("。")}
    return out


def _content_words(s):
    s = re.sub(r"\(.*?\)", " ", s.lower())
    return {w for w in re.findall(r"[a-z]+", s) if w not in {"a", "an", "the", "to", "of", "or", "and", "lit", "for", "in", "when"}}


def meanings_differ(a, b):
    """True when two English glosses share less than half their content words (\"meeting\" vs \"A meeting\" is the same)."""
    x, y = _content_words(a), _content_words(b)
    if not x or not y:
        return False
    return len(x & y) / min(len(x), len(y)) < 0.5


def main(hs, kd4_txt, out):
    head, blocks = kd4_index(kd4_txt)
    kk = load_katakata()
    hsv = load_hanashishou(hs)
    terms = {}
    for r in kk:
        k = norm(r["term"])
        e = terms.setdefault(k, {"term": r["term"], "kk": [], "hs": None})
        e["kk"].append(r)
    for w, h in hsv.items():
        e = terms.setdefault(norm(w), {"term": w, "kk": [], "hs": None})
        e["hs"] = {**h, "word": w}

    # order: Kata-Kata class track first (by chapter, card id), then Dunia, Jambatan, Hanashishou-only by pack/band
    def key(e):
        if e["kk"]:
            first = e["kk"][0]
            grp = 0 if first["origin"] == "Vocab Bank v2" and first["loc"].startswith("Ch") else 1 if first["loc"].startswith("Dunia") else 2
            return (grp, first["id"])
        return (3, f"{e['hs']['pack']}-{e['hs']['band']}-{e['term'].lower()}")

    rows, stats = [], Counter()
    for i, e in enumerate(sorted(terms.values(), key=key), start=1):
        k0 = e["kk"][0] if e["kk"] else None
        h = e["hs"]
        status, ref, root = kd4_check(e["term"], head, blocks)
        stats[status] += 1
        actions = []
        hs_en = ""
        if k0 and h and k0["origin"] != "Hanashishou (bridge)" and meanings_differ(k0["en"], h["en"]):
            hs_en = h["en"]
            actions.append("Meanings differ between the apps: agree one wording")
        if h and h.get("breaks"):
            actions.append("Hanashishou root-word rule: " + "; ".join(h["breaks"]))
        if status == "Not found":
            actions.append("Not in KD4: loanword or colloquial? Confirm it is the form to teach")
        if status == "Spelling differs":
            actions.append(f"KD4 standard spelling differs ({ref}): keep ours or switch?")
        affix = k0["affix"] if k0 else ""
        rows.append({
            "ID": f"L-{i:04d}",
            "Malay": e["term"],
            "Root (KD4)": root,
            "Affix tag": affix,
            "POS": (k0["pos"] if k0 else h["pos"]),
            "Meaning (EN)": (k0["en"] if k0 else h["en"]),
            "Meaning (JA)": (k0["ja"] if k0 else h["ja"]),
            "Kata-Kata": ", ".join(r["id"] for r in e["kk"]),
            "Kata-Kata place": "; ".join(dict.fromkeys(r["loc"] for r in e["kk"])),
            "Hanashishou": f"{h['pack']} · band {h['band']}" if h else "",
            "Hanashishou meaning (if different)": hs_en,
            "In both": "Yes" if e["kk"] and h else "",
            "KD4 check": status,
            "KD4 ref (PDF page)": ref,
            "Origin": (k0["origin"] if k0 else "Hanashishou"),
            "Review status": "Draft",
            "Action": "; ".join(actions),
            "Sam's notes": "",
            "Last changed": "2026-11-06",
            "Changed by": "Claude (seed)",
        })
        stats["rows"] += 1
        stats["in_both"] += bool(e["kk"] and h)
        stats["kk_only"] += bool(e["kk"] and not h)
        stats["hs_only"] += bool(h and not e["kk"])
        stats["actions"] += bool(actions)
    json.dump({"rows": rows, "stats": stats, "katakata": commit(ROOT), "hanashishou": commit(hs)}, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(dict(stats))


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    main(*sys.argv[1:])
