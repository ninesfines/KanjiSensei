#!/usr/bin/env python3
"""Build exact KanjiVG component-to-stroke membership, checked against app paths."""
import gzip
import json
import re
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
KVG_NS = "http://kanjivg.tagaini.net"
ELEMENT = f"{{{KVG_NS}}}element"
KANJI_ID = re.compile(r"kvg:kanji_([0-9a-fA-F]+)$")
STROKE_ID = re.compile(r"-s(\d+)$")


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    kanji_rows = load_json(ROOT / "src/data/kanji.json")["kanji"]
    stroke_rows = {}
    for path in (ROOT / "src/data").glob("strokes-*.json"):
        for row in load_json(path)["strokes"]:
            stroke_rows[row["kanji"]] = row["strokes"]

    output = {}
    with gzip.open(ROOT / "data_raw/kanjivg.xml.gz", "rb") as source:
        for root in ET.parse(source).getroot():
            match = KANJI_ID.match(root.get("id", ""))
            if not match:
                continue
            char = chr(int(match.group(1), 16))
            app_strokes = stroke_rows.get(char)
            kanji = next((k for k in kanji_rows if k["kanji"] == char), None)
            if not app_strokes or not kanji:
                continue

            xml_strokes = {}
            stroke_parent = {}
            def walk(node, ancestors):
                element = node.get(ELEMENT)
                current = ancestors + ([element] if element else [])
                node_id = node.get("id", "")
                if node.tag.endswith("path") and (m := STROKE_ID.search(node_id)):
                    nn = int(m.group(1))
                    xml_strokes[nn] = node.get("d", "")
                    stroke_parent[nn] = current
                for child in node:
                    walk(child, current)
            walk(root, [])

            # Require a one-to-one stroke order and byte-identical path strings.
            if len(xml_strokes) != len(app_strokes) or any(
                xml_strokes.get(s["nn"]) != s["d"] for s in app_strokes
            ):
                continue

            wanted = set()
            for component in kanji["components"]:
                wanted.add(component["character"])
                wanted.add(component["canonical"])
            mapping = {}
            for key in wanted:
                nums = [nn for nn, elements in stroke_parent.items() if key in elements]
                if nums:
                    mapping[key] = sorted(nums)
            if mapping:
                output[char] = mapping

    target = ROOT / "src/data/component-strokes.json"
    target.write_text(json.dumps({"version": 1, "components": output}, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {len(output)} verified kanji component maps to {target.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
