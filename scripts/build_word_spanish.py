#!/usr/bin/env python3
"""Build the app's Spanish word-gloss map from the pinned coverage report.

The report was generated from JMdict 3.6.2+20260921173324 by
analyze_spanish_coverage.py. Prefer a gloss aligned to the English meaning
shown by the app; otherwise use the first applicable Spanish gloss.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "reports/spanish-coverage/word-reading-spanish-coverage.csv"
TARGET = ROOT / "src/data/words-es.json"


def main() -> None:
    result: dict[str, str] = {}
    aligned = fallback = 0
    with SOURCE.open(encoding="utf-8-sig", newline="") as source:
        for row in csv.DictReader(source):
            if row["covered"] != "True":
                continue
            preferred = json.loads(row["meaning_aligned_spanish_glosses"])
            candidates = preferred or json.loads(row["spanish_glosses"])
            if not candidates:
                continue
            result[row["form"] + "\u0000" + row["reading"]] = candidates[0]
            if preferred:
                aligned += 1
            else:
                fallback += 1
    TARGET.write_text(json.dumps({"version": 1, "sourcePin": "3.6.2+20260921173324", "words": result}, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{len(result)} Spanish word glosses: {aligned} aligned, {fallback} fallback")


if __name__ == "__main__":
    main()
