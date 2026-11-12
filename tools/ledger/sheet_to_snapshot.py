"""Turn a read of the sheet's Ledger tab into the repo snapshot content/ledger/malay-ledger.csv.

Usage (from the repo root):
    python3 -I tools/ledger/sheet_to_snapshot.py <values.json> [content/ledger/malay-ledger.csv]

<values.json> is the JSON the Google Sheets `get_values` call returns for Ledger!A1:T<last row>
(`{"range": ..., "values": [[...], ...]}`; the connector saves it to a file when it is too large to
show). Short rows are padded to the 20 columns. The snapshot uses CRLF line endings, like the
earlier copies, so a diff shows exactly the changed and new rows.
"""

import csv
import json
import sys
from pathlib import Path

COLUMNS = 20


def main(src, dest):
    values = json.loads(Path(src).read_text(encoding="utf-8"))["values"]
    rows = [r + [""] * (COLUMNS - len(r)) for r in values]
    if rows[0][0] != "ID" or not rows[-1][0].startswith("L-"):
        raise SystemExit("unexpected shape: the first row must be the header and the last an L-#### row")
    ids = [r[0] for r in rows[1:]]
    if len(set(ids)) != len(ids):
        raise SystemExit("duplicate ledger IDs in the read")
    with open(dest, "w", encoding="utf-8", newline="") as f:
        csv.writer(f, lineterminator="\r\n").writerows(rows)
    print(f"wrote {dest}: {len(rows) - 1} rows, {ids[0]} to {ids[-1]}")


if __name__ == "__main__":
    if len(sys.argv) not in (2, 3):
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) == 3 else "content/ledger/malay-ledger.csv")
