#!/usr/bin/env python3
"""KanjiSensei data builder.

Reads open dictionaries from data_raw/ and emits:
  src/data/kanji.json    - full kanji records for the app set
  src/data/radicals.json - radical/component registry

Sources (open data; see README for attribution):
  kanjidic2-en-3.6.2.json        EDRDG KANJIDIC2 (CC BY-SA 4.0)
  jmdict-eng-common-3.6.2.json   JMdictE common-only words (CC BY-SA 4.0)
  jmdict-examples-eng-3.6.2.json Tatoeba-backed example pairs (CC BY 2.0 FR)
  krad.json                      KRADFILE (EDRDG): kanji -> components
  kr.txt                         Kanjium radicals (names/meaning/variants)
  kanjivg.xml.gz                 KanjiVG (CC BY-SA 3.0): structure/positions
  david.json                     Kanji JSON by davidluzgouveia (new JLPT map)

Stdlib only. Run: python3 scripts/build_data.py
"""
from __future__ import annotations

import gzip
import json
import re
import time
import xml.parsers.expat as expat
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data_raw"
OUT = ROOT / "src" / "data"
JMDICT_V = "3.6.2"

_COMBOKANA = {
    "きゃ": "kya", "きゅ": "kyu", "きょ": "kyo",
    "ぎゃ": "gya", "ぎゅ": "gyu", "ぎょ": "gyo",
    "しゃ": "sha", "しゅ": "shu", "しょ": "sho",
    "じゃ": "ja", "じゅ": "ju", "じょ": "jo",
    "ちゃ": "cha", "ちゅ": "chu", "ちょ": "cho",
    "にゃ": "nya", "にゅ": "nyu", "にょ": "nyo",
    "ひゃ": "hya", "ひゅ": "hyu", "ひょ": "hyo",
    "びゃ": "bya", "びゅ": "byu", "びょ": "byo",
    "ぴゃ": "pya", "ぴゅ": "pyu", "ぴょ": "pyo",
    "みゃ": "mya", "みゅ": "myu", "みょ": "myo",
    "りゃ": "rya", "りゅ": "ryu", "りょ": "ryo",
    "ふぁ": "fa", "ふぃ": "fi", "ふぇ": "fe", "ふぉ": "fo",
}

_BASE = {
    "あ": "a", "い": "i", "う": "u", "え": "e", "お": "o",
    "か": "ka", "き": "ki", "く": "ku", "け": "ke", "こ": "ko",
    "が": "ga", "ぎ": "gi", "ぐ": "gu", "げ": "ge", "ご": "go",
    "さ": "sa", "し": "shi", "す": "su", "せ": "se", "そ": "so",
    "ざ": "za", "じ": "ji", "ず": "zu", "ぜ": "ze", "ぞ": "zo",
    "た": "ta", "ち": "chi", "つ": "tsu", "て": "te", "と": "to",
    "だ": "da", "ぢ": "ji", "づ": "zu", "で": "de", "ど": "do",
    "な": "na", "に": "ni", "ぬ": "nu", "ね": "ne", "の": "no",
    "は": "ha", "ひ": "hi", "ふ": "fu", "へ": "he", "ほ": "ho",
    "ば": "ba", "び": "bi", "ぶ": "bu", "べ": "be", "ぼ": "bo",
    "ぱ": "pa", "ぴ": "pi", "ぷ": "pu", "ぺ": "pe", "ぽ": "po",
    "ま": "ma", "み": "mi", "む": "mu", "め": "me", "も": "mo",
    "や": "ya", "ゆ": "yu", "よ": "yo",
    "ら": "ra", "り": "ri", "る": "ru", "れ": "re", "ろ": "ro",
    "わ": "wa", "ゐ": "wi", "ゑ": "we", "を": "wo",
    "ぁ": "a", "ぃ": "i", "ぅ": "u", "ぇ": "e", "ぉ": "o",
    "ん": "n", "ー": "-", "-": "",
}


def hira_to_romaji(text: str) -> str:
    out = []
    i, n = 0, len(text)
    while i < n:
        ch = text[i]
        if ch == "っ":
            i += 1
            continue
        two = text[i : i + 2]
        if two in _COMBOKANA:
            out.append(_COMBOKANA[two])
            i += 2
            continue
        r = _BASE.get(ch)
        if r is None:
            out.append(ch)
            i += 1
            continue
        out.append(r)
        i += 1
    return "".join(out)


def kana_names_to_romaji(ja: str) -> list[str]:
    return [hira_to_romaji(n) for n in re.split("[、・]", ja) if n.strip()]


def classify_position(names_ja: list[str]) -> str | None:
    joined = "".join(names_ja)
    for frag, pos in (
        ("がまえ", "kamae"), ("にょう", "nyou"), ("だれ", "tare"),
        ("かんむり", "kanmuri"), ("がしら", "kanmuri"), ("あし", "ashi"),
        ("つくり", "tsukuri"), ("づくり", "tsukuri"), ("へん", "hen"),
    ):
        if frag in joined:
            return pos
    return None


KRAD_ALIASES = {
    "⺾": "艸", "丷": "八", "⺡": "水", "⺣": "火", "⺅": "人",
    "𠆢": "人", "⺖": "心", "⺉": "刀", "⺌": "小", "⽧": "疒",
    "⻏": "邑", "⻖": "阜", "⻂": "衣", "⺨": "犬", "⺹": "爪",
    "⺭": "示", "⽱": "耒", "扌": "手", "𠂉": "人", "⻌": "辵",
    "邑": "邑",
}

STANDALONE_COMPONENTS = {
    "𠂉": {"name": "hito", "meaning": "person (variant)"},
    "啇": {"name": "teki", "meaning": "phonetic (top of 滴)"},
    "⺲": {"name": "", "meaning": ""},
}

JLPT_RANK = {"N5": 5, "N4": 4, "N3": 3, "N2": 2, "N1": 1}

KANJIVG_POS = {
    "left": "hen", "right": "tsukuri", "top": "kanmuri", "bottom": "ashi",
    "tare": "tare", "nyō": "nyou", "nyou": "nyou", "kamae": "kamae",
}


def normalize_pos(p: str) -> str | None:
    if not p:
        return None
    return KANJIVG_POS.get(p.lower().strip())


def radical_signature(entry: dict) -> tuple[str, list[str]]:
    roms = kana_names_to_romaji("、".join(entry["names_ja"]))
    primary = roms[0] if roms else entry["character"]
    if entry["variants"]:
        for rom, ja in zip(roms, entry["names_ja"]):
            if any(
                f in ja
                for f in ("へん", "べん", "づくり", "つくり", "かんむり", "がしら", "あし", "がまえ", "にょう", "だれ")
            ):
                primary = rom
                break
    return primary, roms


class KanjiVgParser:
    """Streaming parser extracting g structure per kanji from KanjiVG XML."""

    def __init__(self) -> None:
        self.collected: dict[str, list[dict]] = {}
        self.stroke_data: dict[str, list[dict]] = {}
        self._paths: list[dict] = []
        self._cp_to_char: dict[str, str] = {}
        self._cur_char: str | None = None
        self._nodes: list[dict] = []
        self._gstack: list[int] = []
        self._in_kanji = False
        self._parser = expat.ParserCreate()
        self._parser.StartElementHandler = self._start
        self._parser.EndElementHandler = self._end

    def _start(self, name: str, attrs: dict) -> None:
        if name == "kanji":
            hexcp = re.search(r"[0-9a-fA-F]{4,5}$", attrs.get("id", ""))
            key = hexcp.group(0).upper() if hexcp else ""
            key = key.lstrip("0") or "0"
            self._cur_char = self._cp_to_char.get(key)
            self._in_kanji = True
            self._nodes = []
            self._paths = []
            self._gstack = []
        elif name == "g" and self._in_kanji:
            node = {
                "element": attrs.get("kvg:element") or "",
                "position": attrs.get("kvg:position") or "",
                "phon": attrs.get("kvg:phon") or "",
                "radical": attrs.get("kvg:radical") or "",
                "parent": self._gstack[-1] if self._gstack else None,
            }
            self._nodes.append(node)
            self._gstack.append(len(self._nodes) - 1)
        elif name == "path" and self._in_kanji:
            m = re.search(r"-s(\d+)$", attrs.get("id", ""))
            d = attrs.get("d") or ""
            if not (m and d):
                return
            # innermost enclosing <g> with a kvg:element ("" when none)
            el = ""
            for gi in reversed(self._gstack):
                e2 = self._nodes[gi]["element"]
                if e2:
                    el = e2
                    break
            self._paths.append({"nn": int(m.group(1)), "d": d, "element": el})

    def _end(self, name: str) -> None:
        if name == "g" and self._in_kanji:
            if self._gstack:
                self._gstack.pop()
        elif name == "kanji" and self._in_kanji:
            if self._cur_char:
                self.collected[self._cur_char] = self._nodes
                self.stroke_data[self._cur_char] = sorted(self._paths, key=lambda p: p["nn"])
            self._in_kanji = False
            self._cur_char = None

    def parse(self, path: Path) -> dict[str, list[dict]]:
        with gzip.open(path, "rb") as fh:
            self._parser.ParseFile(fh)
        return self.collected


def main() -> None:  # PART2-MARKER
    t0 = time.time()
    print("building kanjisensei data ...")
    generated = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    OUT.mkdir(parents=True, exist_ok=True)

    print("  kanjium radicals ...")
    kanjium: list[dict] = []
    for line in (RAW / "kr.txt").read_text(encoding="utf-8").splitlines():
        cols = line.split("\t")
        if len(cols) < 6 or not cols[0].strip():
            continue
        try:
            number, strokes = int(cols[2]), int(cols[3])
        except ValueError:
            number, strokes = 0, 0
        variants = [v for v in re.split(r"[、・\s]+", cols[1]) if v.strip()] if cols[1].strip() else []
        names_ja = [n for n in re.split("[、・]", cols[4]) if n.strip()]
        kanjium.append({
            "character": cols[0].strip(),
            "variants": variants,
            "number": number,
            "strokes": strokes,
            "names_ja": names_ja,
            "meaning": cols[5].strip(),
        })

    by_canonical = {r["character"]: r for r in kanjium}
    variant_to_canonical: dict[str, str] = {}
    for r in kanjium:
        variant_to_canonical[r["character"]] = r["character"]
        for v in r["variants"]:
            variant_to_canonical.setdefault(v, r["character"])
    variant_to_canonical.update(KRAD_ALIASES)
    canonical_to_variant = {r["character"]: r["variants"][0] for r in kanjium if r["variants"]}
    number_to_entry = {r["number"]: r for r in kanjium if r["number"]}

    print("  kanjidic2 ...")
    kd_raw = json.loads((RAW / f"kanjidic2-en-{JMDICT_V}.json").read_text(encoding="utf-8"))
    kd: dict[str, dict] = {}
    for c in kd_raw["characters"]:
        lit = c.get("literal")
        if not lit:
            continue
        misc = c.get("misc", {}) or {}
        rm = c.get("readingMeaning") or {}
        on, kun, meanings = [], [], []
        for group in rm.get("groups", []):
            for r in group.get("readings", []):
                if r.get("type") == "ja_on":
                    on.append(r.get("value", ""))
                elif r.get("type") == "ja_kun":
                    kun.append(r.get("value", ""))
            for m in group.get("meanings", []):
                if isinstance(m, dict) and m.get("lang", "eng") in ("eng", "en") and m.get("value"):
                    meanings.append(m["value"])
        classical = None
        for rad in c.get("radicals", []):
            if rad.get("type") == "classical":
                classical = rad.get("value")
        heisig = None
        for dr in c.get("dictionaryReferences", []):
            if dr.get("type") == "heisig":
                heisig = str(dr.get("value"))
                break
        kd[lit] = {
            "grade": misc.get("grade"),
            "strokes": (misc.get("strokeCounts") or [None])[0],
            "freq": misc.get("frequency"),
            "jlpt_old": misc.get("jlptLevel"),
            "on": on,
            "kun": kun,
            "meanings": meanings,
            "heisig": heisig,
            "classical": classical,
        }

    print("  new-jlpt map ...")
    david = json.loads((RAW / "david.json").read_text(encoding="utf-8"))

    def jlpt_new_of(ch: str) -> str | None:
        d = david.get(ch)
        if d and d.get("jlpt_new"):
            return f"N{int(d['jlpt_new'])}"
        old = kd.get(ch, {}).get("jlpt_old")
        if old is None:
            return None
        return {1: "N1", 2: "N2", 3: "N4", 4: "N5"}.get(int(old))

    app_list = list(david.keys())
    app_set = set(app_list)
    for lit, meta in kd.items():
        if meta["jlpt_old"] and lit not in app_set:
            app_list.append(lit)
            app_set.add(lit)
    print(f"  app set: {len(app_set)} kanji")

    def canonical_of_comp(c: str) -> str:
        return variant_to_canonical.get(c, c)

    krad = json.loads((RAW / "krad.json").read_text(encoding="utf-8"))
    decomposition: dict[str, list[str]] = {e["kanji"]: e["radicals"] for e in krad}

    reverse_index: dict[str, list[str]] = defaultdict(list)
    for ech, comps in decomposition.items():
        if ech not in app_set:
            continue
        for comp in comps:
            reverse_index[canonical_of_comp(comp)].append(ech)

    print("  kanjivg parsing ...")
    vg = KanjiVgParser()
    vg._cp_to_char = {f"{ord(ch):X}": ch for ch in app_set}
    structures = vg.parse(RAW / "kanjivg.xml.gz")
    print(f"    parsed structure for {len(structures)} kanji")
    print(f"    stroke paths for {len(vg.stroke_data)} kanji")

    def topmost_positions(char: str, comp_canons: list[str]) -> dict[str, str]:
        out: dict[str, str] = {}
        nodes = structures.get(char)
        if not nodes:
            return out
        allowed = set(comp_canons)
        anchored: dict[str, int] = {}
        for idx, n in enumerate(nodes):
            el = variant_to_canonical.get(n["element"], n["element"])
            if el not in allowed or el in anchored:
                continue
            par, blocked = n["parent"], False
            while par is not None:
                pel = variant_to_canonical.get(nodes[par]["element"], nodes[par]["element"])
                if pel in allowed:
                    blocked = True
                    break
                par = nodes[par]["parent"]
            if not blocked:
                anchored[el] = idx
        for el, idx in anchored.items():
            node = nodes[idx]
            pos = node["position"]
            par = node["parent"]
            while not pos and par is not None:
                pos = nodes[par]["position"]
                par = nodes[par]["parent"]
            if pos:
                out[el] = pos
        return out

    def phonetic_components(char: str, comp_canons: list[str]) -> set[str]:
        nodes = structures.get(char)
        out: set[str] = set()
        if not nodes:
            return out
        for n in nodes:
            el = variant_to_canonical.get(n["element"], n["element"])
            if el in set(comp_canons) and n["phon"]:
                out.add(el)
        return out

    def radical_components(char: str, comp_canons: list[str]) -> set[str]:
        nodes = structures.get(char)
        out: set[str] = set()
        if not nodes:
            return out
        for n in nodes:
            el = variant_to_canonical.get(n["element"], n["element"])
            if el in set(comp_canons) and n["radical"]:
                out.add(el)
        return out

    print("  jmdict common words ...")
    common_words = json.loads((RAW / f"jmdict-eng-common-{JMDICT_V}.json").read_text(encoding="utf-8"))
    word_buckets: dict[str, list[dict]] = defaultdict(list)
    WORD_CAP = 10
    for w in common_words["words"]:
        forms = [kx["text"] for kx in w["kanji"] if kx.get("text")]
        if not forms:
            continue
        readings = [kx["text"] for kx in w["kana"] if kx.get("text")]
        glosses = []
        for s in w["sense"]:
            for g in s.get("gloss", []):
                t = g.get("text")
                if t and g.get("lang", "eng") == "eng":
                    glosses.append(t)
        if not glosses:
            continue
        form = forms[0]
        reading = readings[0] if readings else ""
        seen: set[str] = set()
        for ch in form:
            if ch in seen or ch not in app_set:
                continue
            seen.add(ch)
            if len(word_buckets[ch]) < WORD_CAP:
                word_buckets[ch].append({"kanji": form, "kana": reading, "meaning": glosses[0]})

    print("  example sentences ...")
    exam = json.loads((RAW / f"jmdict-examples-eng-{JMDICT_V}.json").read_text(encoding="utf-8"))
    sentence_buckets: dict[str, list[dict]] = defaultdict(list)
    SENT_CAP = 4
    for w in exam["words"]:
        for s in w.get("sense", []):
            for ex in s.get("examples", []) or []:
                jp = eng = None
                for pair in ex.get("sentences", []):
                    if pair.get("lang") == "jpn":
                        jp = pair.get("text")
                    elif pair.get("lang") == "eng":
                        eng = pair.get("text")
                if not (jp and eng):
                    continue
                seen: set[str] = set()
                for ch in jp:
                    if ch in seen or ch not in app_set:
                        continue
                    seen.add(ch)
                    if len(sentence_buckets[ch]) < SENT_CAP:
                        sentence_buckets[ch].append({"jp": jp, "en": eng})

    # ASSEMBLE-MARKER
    print("  assembling kanji records ...")
    records: list[dict] = []
    for ch in sorted(app_set, key=lambda c: (-(JLPT_RANK.get(jlpt_new_of(c), 0)), kd.get(c, {}).get("freq") or 9999, kd.get(c, {}).get("grade") or 99, c)):
        meta = kd.get(ch, {})
        comps_raw = decomposition.get(ch, [])
        comp_canons = [canonical_of_comp(c) for c in comps_raw]
        unique_canons = list(dict.fromkeys(comp_canons))
        pos_map = topmost_positions(ch, unique_canons)
        phon_set = phonetic_components(ch, unique_canons)
        rad_set = radical_components(ch, unique_canons)
        classical = meta.get("classical")
        classical_entry = number_to_entry.get(classical) if classical else None

        components = []
        for c in comps_raw:
            canon = canonical_of_comp(c)
            standalone = STANDALONE_COMPONENTS.get(c)
            entry = by_canonical.get(canon)
            if entry:
                name, _roms = radical_signature(entry)
                meaning = entry["meaning"]
            elif standalone:
                name, meaning = standalone["name"], standalone["meaning"]
            else:
                name, meaning = "", ""
            if canon in rad_set or (classical_entry and canon == classical_entry["character"]):
                role = "radical"
            elif canon in phon_set:
                role = "phonetic"
            else:
                role = "semantic"
            components.append({
                "character": c,
                "canonical": canon,
                "name": name,
                "meaning": meaning,
                "position": normalize_pos(pos_map.get(canon, "")),
                "role": role,
            })

        rad_entry = classical_entry
        if not rad_entry:
            for c in comps_raw:
                e2 = by_canonical.get(canonical_of_comp(c))
                if e2:
                    rad_entry = e2
                    break
        if rad_entry:
            rad_name, _r = radical_signature(rad_entry)
            rad_canon = rad_entry["character"]
            rad_variant_print = canonical_to_variant.get(rad_canon) or rad_canon
            rad_meaning = rad_entry["meaning"]
        else:
            rad_name = ""
            rad_canon = comp_canons[0] if comp_canons else ""
            rad_variant_print = rad_canon
            rad_meaning = ""
        rad_pos = normalize_pos(pos_map.get(rad_canon, ""))
        records.append({
            "kanji": ch,
            "meanings": meta.get("meanings", [])[:8],
            "jlpt": jlpt_new_of(ch),
            "grade": meta.get("grade"),
            "freq": meta.get("freq"),
            "strokeCount": meta.get("strokes") or 0,
            "onyomi": meta.get("on", [])[:8],
            "kunyomi": meta.get("kun", [])[:8],
            "heisig": meta.get("heisig"),
            "radical": {
                "character": rad_canon,
                "variant": rad_variant_print,
                "name": rad_name,
                "meaning": rad_meaning,
                "position": rad_pos,
                "number": classical,
            },
            "components": components,
            "words": word_buckets.get(ch, []),
            "sentences": sentence_buckets.get(ch, []),
        })

    (OUT / "kanji.json").write_text(
        json.dumps({"version": 1, "generatedAt": generated, "kanji": records}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"  kanji.json: {len(records)} kanji, {(OUT / 'kanji.json').stat().st_size / 1024:.0f} KB")

    # STROKES-MARKER
    print("  stroke chunks (kanjivg paths) ...")
    stroke_buckets: dict[str, list[dict]] = defaultdict(list)
    missing_strokes: list[str] = []
    for rec in records:
        sd = vg.stroke_data.get(rec["kanji"])
        if sd:
            stroke_buckets[rec["jlpt"] or "none"].append({"kanji": rec["kanji"], "strokes": sd})
        else:
            missing_strokes.append(rec["kanji"])
    for key in ("n5", "n4", "n3", "n2", "n1", "none"):
        rows = stroke_buckets.get(key.upper() if key != "none" else "none", [])
        fname = f"strokes-{key}.json"
        (OUT / fname).write_text(
            json.dumps({"version": 1, "generatedAt": generated, "strokes": rows}, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        print(f"    {fname}: {len(rows)} kanji, {(OUT / fname).stat().st_size / 1024:.0f} KB")
    covered = len(records) - len(missing_strokes)
    print(f"    kanjivg stroke coverage: {covered}/{len(records)} ({covered / max(1, len(records)):.1%})")
    if missing_strokes:
        print("    no stroke data: " + " ".join(missing_strokes[:12]) + (" …" if len(missing_strokes) > 12 else ""))

    # RADICALS-MARKER
    def fam_weight(ch: str):
        jl = jlpt_new_of(ch)
        return (-(JLPT_RANK.get(jl, 0)), kd.get(ch, {}).get("freq") or 9999)

    def sort_family(chars: list[str]) -> list[str]:
        seen2: set[str] = set()
        uniq = [c for c in chars if not (c in seen2 or seen2.add(c))]
        uniq.sort(key=fam_weight)
        return uniq

    rad_records: list[dict] = []
    used: set[str] = set()
    for entry in sorted(kanjium, key=lambda r: r["number"] if r["number"] else 999):
        if not entry["number"] or entry["character"] in used:
            continue
        used.add(entry["character"])
        name, roms = radical_signature(entry)
        rad_records.append({
            "character": entry["character"],
            "variant": canonical_to_variant.get(entry["character"]) or entry["character"],
            "number": entry["number"],
            "strokeCount": entry["strokes"],
            "name": name,
            "names": roms,
            "meaning": entry["meaning"],
            "position": classify_position(entry["names_ja"]),
            "kanji": sort_family(reverse_index.get(entry["character"], [])),
        })

    extra = []
    for key in reverse_index.keys():
        if key in used:
            continue
        fam = reverse_index[key]
        if not any(c in app_set for c in fam):
            continue
        used.add(key)
        standalone = STANDALONE_COMPONENTS.get(key)
        entry = by_canonical.get(key)
        if entry:
            name, roms = radical_signature(entry)
            meaning = entry["meaning"]
            number = entry["number"]
            strokes = entry["strokes"]
            pos = classify_position(entry["names_ja"])
            fams = fam
        elif standalone:
            name, meaning = standalone["name"], standalone["meaning"]
            roms, number, strokes, pos, fams = [], 0, 0, None, fam
            fams = fam
        else:
            continue
        variant = canonical_to_variant.get(key, key)
        extra.append({
            "character": key,
            "variant": variant,
            "number": number,
            "strokeCount": strokes,
            "name": name,
            "names": roms,
            "meaning": meaning,
            "position": pos,
            "kanji": sort_family(fam),
        })
    rad_records.extend(extra)
    rad_records.sort(key=lambda r: (r["number"] if r["number"] else 999, r["character"]))
    (OUT / "radicals.json").write_text(
        json.dumps({"version": 1, "generatedAt": generated, "radicals": rad_records}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"  radicals.json: {len(rad_records)} radicals, {(OUT / 'radicals.json').stat().st_size / 1024:.0f} KB")

    # VERIFY-MARKER
    print("  verification ...")
    kmap = {r["kanji"]: r for r in records}
    assert [c["character"] for c in kmap["族"]["components"]] == ["方", "矢", "𠂉"], "族 decomposition wrong"
    assert [c["character"] for c in kmap["私"]["components"]] == ["禾", "厶"], "私 decomposition wrong"
    ka = kmap["家"]
    byc = {c["canonical"]: c for c in ka["components"]}
    assert byc["宀"]["position"] == "kanmuri", f"家 宀 position = {byc['宀']['position']}"
    assert byc["豕"]["position"] == "ashi", f"家 豕 position = {byc['豕']['position']}"
    ukan = next(r for r in rad_records if r["character"] == "宀")
    for k in "家室安客宅宿官":
        assert k in ukan["kanji"], f"宀 family missing {k}"
    nin = next(r for r in rad_records if r["character"] == "人")
    assert len(nin["kanji"]) > 100, "人 family too small"
    for k in "住作使低体休":
        assert k in nin["kanji"], f"人 family missing {k}"
    assert kmap["族"]["radical"]["name"], "族 radical name missing"
    print("  ✓ spec examples verified (族/私/家/宀/人)")

    stroke_map = {row["kanji"]: row["strokes"] for rows in stroke_buckets.values() for row in rows}
    assert len(stroke_map["家"]) == 10, f"家 stroke count = {len(stroke_map['家'])}"
    assert len(stroke_map["私"]) == 7, f"私 stroke count = {len(stroke_map['私'])}"
    assert len(stroke_map["族"]) == 11, f"族 stroke count = {len(stroke_map['族'])}"
    els = {s["element"] for s in stroke_map["家"]}
    assert "宀" in els and "豕" in els, f"家 stroke groups wrong: {els}"
    nns = [s["nn"] for s in stroke_map["家"]]
    assert nns == sorted(nns) and nns[0] == 1 and len(set(nns)) == len(nns), "家 stroke order wrong"
    print("  ✓ stroke data verified (家=10 私=7 族=11, 宀/豕 groups, ordered)")
    print(f"done in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
