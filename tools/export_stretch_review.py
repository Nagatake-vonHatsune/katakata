"""Export every ⚡ line for Sam's native read: docs/review/stretch-lines.csv (UTF-8 with BOM, for Google Sheets and Excel).

Usage (from the repo root):
    python3 -I tools/export_stretch_review.py

One row per Malay string, ⚡ 1 to 18 in order:
  - type "line": a dialogue line that is not a reply step;
  - type "reply (right)": a reply step's line (the reply the learner should choose), and "reply (wrong)": each wrong reply;
  - type "frame": a frame's example sentence (the sentence the learner builds), and "decoy": each decoy tile.
Columns: chapter, type, id, speaker, Malay, English, OK, Fix (OK and Fix blank, for Sam). Wrong replies and decoys have the
line's or frame's ID plus "#w1", "#d1" …. A second run gives an identical file.
"""

import csv
import io
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "review" / "stretch-lines.csv"


def rows():
    for p in sorted((ROOT / "content" / "ms" / "stretch").glob("x*.json")):
        x = json.loads(p.read_text(encoding="utf-8"))
        ch = x["chapter"]
        for line in x["scenario"]["lines"]:
            if line.get("choices"):
                yield [ch, "reply (right)", line["id"], line["speaker"], line["ms"], line["en"]]
                for i, (ms, en) in enumerate(zip(line["choices"], line.get("choices_en", [""] * len(line["choices"]))), 1):
                    yield [ch, "reply (wrong)", f"{line['id']}#w{i}", line["speaker"], ms, en]
            else:
                yield [ch, "line", line["id"], line["speaker"], line["ms"], line["en"]]
        for f in x["frames"]:
            yield [ch, "frame", f["id"], "", f["example"], f["meaning_en"]]
            for i, d in enumerate(f.get("decoys", []), 1):
                yield [ch, "decoy", f"{f['id']}#d{i}", "", d, ""]


def main():
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\r\n")
    w.writerow(["chapter", "type", "id", "speaker", "Malay", "English", "OK", "Fix"])
    n = 0
    for r in rows():
        w.writerow(r + ["", ""])
        n += 1
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(b"\xef\xbb\xbf" + buf.getvalue().encode("utf-8"))
    print(f"wrote {OUT.relative_to(ROOT)}: {n} rows")


if __name__ == "__main__":
    main()
