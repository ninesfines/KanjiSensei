#!/usr/bin/env python3
"""Analyze Spanish gloss coverage for the current KanjiSensei dataset.

Uses the all-language KANJIDIC2 JSON and Spanish JMdict JSON from the same
pinned jmdict-simplified release as the repo's English files. No production
data is modified. See docs/analisis-cobertura-espanol.md for inputs and method.
"""
from __future__ import annotations

import argparse
import csv
import json
import random
from collections import defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
PIN = "3.6.2+20260921173324"
EXPECTED_DATE = "2026-09-21"
APP_DATA = ROOT / "src/data/kanji.json"
EN_KANJI = ROOT / "data_raw/kanjidic2-en-3.6.2.json"
EN_WORDS = ROOT / "data_raw/jmdict-eng-common-3.6.2.json"


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise SystemExit(f"Input missing: {path}\nSee the report for pinned source URLs.")


def validate_date(label: str, data: dict[str, Any]) -> None:
    if data.get("version") != "3.6.2":
        raise SystemExit(f"{label} version mismatch: expected 3.6.2, found {data.get('version')!r}")
    date = data.get("dictDate")
    if date != EXPECTED_DATE:
        raise SystemExit(f"{label} date mismatch: expected {EXPECTED_DATE}, found {date!r}")


def app_records(data: dict[str, Any]) -> list[dict[str, Any]]:
    rows = data.get("kanji")
    if not isinstance(rows, list):
        raise SystemExit("Expected src/data/kanji.json shape {kanji: [...]}")
    return rows


def glosses_for_character(entry: dict[str, Any]) -> list[str]:
    out: list[str] = []
    rm = entry.get("readingMeaning") or {}
    for group in rm.get("groups", []):
        for meaning in group.get("meanings", []):
            if meaning.get("lang") == "es" and meaning.get("value"):
                out.append(meaning["value"])
    return list(dict.fromkeys(out))


def kanji_analysis(records: list[dict[str, Any]], es_data: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    es_by_char = {e.get("literal"): glosses_for_character(e) for e in es_data.get("characters", [])}
    levels = ("N5", "N4", "N3", "N2", "N1", "Sin JLPT")
    summary: dict[str, Any] = {"total": len(records), "covered": 0, "by_jlpt": {}}
    detail: list[dict[str, Any]] = []
    for level in levels:
        group = [r for r in records if (r.get("jlpt") or "Sin JLPT") == level]
        covered = sum(bool(es_by_char.get(r["kanji"])) for r in group)
        summary["by_jlpt"][level] = {"total": len(group), "covered": covered, "missing": len(group) - covered}
    for r in records:
        ch = r["kanji"]
        meanings = es_by_char.get(ch, [])
        detail.append({"kanji": ch, "jlpt": r.get("jlpt") or "Sin JLPT", "covered": bool(meanings), "spanish": meanings})
    summary["covered"] = sum(row["covered"] for row in detail)
    return summary, detail


def forms(entry: dict[str, Any]) -> set[str]:
    return {x.get("text", "") for x in entry.get("kanji", []) if x.get("text")}


def readings(entry: dict[str, Any]) -> set[str]:
    return {x.get("text", "") for x in entry.get("kana", []) if x.get("text")}


def valid_form_reading_pairs(entry: dict[str, Any]) -> set[tuple[str, str]]:
    """Enumerate only JMdict form/reading combinations allowed by kana metadata."""
    result = set()
    for form in forms(entry):
        for kana in entry.get("kana", []):
            reading = kana.get("text", "")
            applies = kana.get("appliesToKanji") or ["*"]
            if reading and ("*" in applies or form in applies):
                result.add((form, reading))
    return result


def sense_applies(sense: dict[str, Any], form: str, reading: str) -> bool:
    kanji_scope = sense.get("appliesToKanji") or ["*"]
    kana_scope = sense.get("appliesToKana") or ["*"]
    return ("*" in kanji_scope or form in kanji_scope) and ("*" in kana_scope or reading in kana_scope)


def sense_alignment_signature(sense: dict[str, Any]) -> tuple[tuple[str, tuple[str, ...]], ...]:
    """Conservative signature for cross-language sense pairing.

    JMdict's all-language JSON keeps language-specific gloss groups as separate
    sense records, so array positions are not cross-language sense IDs. Pair
    only on matching POS, applicability, field, dialect, and register tags.
    """
    fields = ("partOfSpeech", "appliesToKanji", "appliesToKana", "field", "dialect", "misc")
    return tuple((field, tuple(sorted(sense.get(field) or (["*"] if field.startswith("appliesTo") else [])))) for field in fields)


def spanish_senses(entry: dict[str, Any], form: str, reading: str, app_english: str) -> list[dict[str, Any]]:
    english_senses = [
        (i, sense) for i, sense in enumerate(entry.get("sense", []), start=1)
        if sense_applies(sense, form, reading)
        and any(g.get("lang") == "eng" and g.get("text") for g in sense.get("gloss", []))
    ]
    result = []
    for i, sense in enumerate(entry.get("sense", []), start=1):
        if not sense_applies(sense, form, reading):
            continue
        es = list(dict.fromkeys(
            g.get("text", "") for g in sense.get("gloss", [])
            if g.get("lang") == "spa" and g.get("text")
        ))
        if es:
            matches = [
                (en_i, en_sense) for en_i, en_sense in english_senses
                if sense_alignment_signature(en_sense) == sense_alignment_signature(sense)
            ]
            entry_meaning_matches = [
                (en_i, en_sense) for en_i, en_sense in english_senses
                if any(normalize_gloss(app_english) == normalize_gloss(g.get("text", "")) for g in en_sense.get("gloss", []) if g.get("lang") == "eng")
            ]
            meaning_matches = [
                (en_i, en_sense) for en_i, en_sense in matches
                if any(normalize_gloss(app_english) == normalize_gloss(g.get("text", "")) for g in en_sense.get("gloss", []) if g.get("lang") == "eng")
            ]
            paired = meaning_matches if len(meaning_matches) == 1 else matches
            en = list(dict.fromkeys(
                g.get("text", "") for _en_i, en_sense in paired for g in en_sense.get("gloss", [])
                if g.get("lang") == "eng" and g.get("text")
            ))
            status = "unique_by_displayed_gloss" if len(meaning_matches) == 1 else ("ambiguous" if len(meaning_matches) > 1 else ("unique_by_metadata" if len(matches) == 1 else ("ambiguous" if len(matches) > 1 else "unmatched")))
            result.append({
                "sense": i,
                "spanish": es,
                "english_candidates": [{"sense": en_i, "glosses": [g.get("text") for g in en_sense.get("gloss", []) if g.get("lang") == "eng" and g.get("text")]} for en_i, en_sense in matches],
                "paired_english_senses": [{"sense": en_i, "glosses": [g.get("text") for g in en_sense.get("gloss", []) if g.get("lang") == "eng" and g.get("text")]} for en_i, en_sense in paired],
                "alignment": status,
                "displayed_english_aligned": len(meaning_matches) == 1,
                "displayed_english_unique_in_entry": len(entry_meaning_matches) == 1,
            })
    return result


def first_english_gloss(entry: dict[str, Any]) -> str:
    for sense in entry.get("sense", []):
        for gloss in sense.get("gloss", []):
            if gloss.get("lang") == "eng" and gloss.get("text"):
                return gloss["text"]
    return ""


def normalize_gloss(value: str) -> str:
    return " ".join(value.casefold().split())


def words_analysis(records: list[dict[str, Any]], en_data: dict[str, Any], all_data: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    # The app's common-only English data identifies its word universe. Match
    # exact form/reading pairs to JMdict IDs, then use the all-language source
    # so English and Spanish glosses stay in the same sense record.
    en_by_pair: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    all_by_id: dict[str, dict[str, Any]] = {}
    for entry in en_data.get("words", []):
        for pair in valid_form_reading_pairs(entry):
            en_by_pair[pair].append(entry)
    for entry in all_data.get("words", []):
        all_by_id[str(entry.get("id"))] = entry

    pairs: dict[tuple[str, str], dict[str, Any]] = {}
    for rec in records:
        for word in rec.get("words", []):
            pair = (word.get("kanji", ""), word.get("kana", ""))
            if pair[0] and pair[1]:
                pairs.setdefault(pair, {"form": pair[0], "reading": pair[1], "english": word.get("meaning", ""), "kanji": set()})["kanji"].add(rec["kanji"])

    rows: list[dict[str, Any]] = []
    for (form, reading), app in sorted(pairs.items()):
        pair_candidates = en_by_pair.get((form, reading), [])
        meaning_candidates = [e for e in pair_candidates if first_english_gloss(e) == app["english"]]
        selected = meaning_candidates or pair_candidates
        selected_ids = sorted({str(e.get("id")) for e in selected})
        entry_ids: list[str] = []
        by_id: dict[str, list[dict[str, Any]]] = {}
        for source_id in selected_ids:
            entry = all_by_id.get(source_id)
            if entry:
                entry_ids.append(source_id)
                senses = spanish_senses(entry, form, reading, app["english"])
                if senses:
                    by_id[source_id] = senses
        all_glosses = list(dict.fromkeys(g for senses in by_id.values() for sense in senses for g in sense["spanish"]))
        aligned_glosses = list(dict.fromkeys(
            gloss
            for senses in by_id.values()
            for sense in senses
            if sense["displayed_english_aligned"]
            for gloss in sense["spanish"]
        ))
        unique_sense_pairs = sum(1 for senses in by_id.values() for sense in senses if sense["alignment"].startswith("unique"))
        ambiguous_sense_pairs = sum(1 for senses in by_id.values() for sense in senses if sense["alignment"] == "ambiguous")
        unmatched_senses = sum(1 for senses in by_id.values() for sense in senses if sense["alignment"] == "unmatched")
        exact_english_sense_pairs = sum(1 for senses in by_id.values() for sense in senses if sense["displayed_english_unique_in_entry"])
        rows.append({
            "form": form,
            "reading": reading,
            "english": app["english"],
            "kanji": sorted(app["kanji"]),
            "candidate_ids": sorted({str(e.get("id")) for e in pair_candidates}),
            "selected_ids": selected_ids,
            "spanish_entry_ids": entry_ids,
            "matched_ids": sorted(by_id),
            "ambiguous": len(selected_ids) > 1,
            "resolved_by_english_gloss": len({str(e.get("id")) for e in pair_candidates}) > 1 and len(selected_ids) == 1,
            "english_gloss_no_candidate_match": bool(pair_candidates) and not bool(meaning_candidates),
            "missing_reason": "covered" if all_glosses else ("no_english_id_match" if not pair_candidates else ("no_spanish_entry" if not entry_ids else "no_applicable_spanish_gloss")),
            "covered": bool(all_glosses),
            "meaning_aligned_covered": bool(aligned_glosses),
            "uniquely_aligned_sense_count": unique_sense_pairs,
            "ambiguous_sense_count": ambiguous_sense_pairs,
            "unmatched_sense_count": unmatched_senses,
            "exact_english_sense_count": exact_english_sense_pairs,
            "spanish_glosses": all_glosses,
            "meaning_aligned_spanish_glosses": aligned_glosses,
            "spanish_by_id": by_id,
        })
    summary = {
        "total": len(rows),
        "covered": sum(r["covered"] for r in rows),
        "missing": sum(not r["covered"] for r in rows),
        "no_english_id_match": sum(r["missing_reason"] == "no_english_id_match" for r in rows),
        "no_spanish_entry": sum(r["missing_reason"] == "no_spanish_entry" for r in rows),
        "no_applicable_spanish_gloss": sum(r["missing_reason"] == "no_applicable_spanish_gloss" for r in rows),
        "meaning_aligned_covered": sum(r["meaning_aligned_covered"] for r in rows),
        "spanish_present_but_not_aligned_to_displayed_english": sum(r["covered"] and not r["meaning_aligned_covered"] for r in rows),
        "pairs_with_unique_sense_alignment": sum(r["uniquely_aligned_sense_count"] > 0 for r in rows),
        "pairs_with_unique_displayed_english_sense_in_entry": sum(r["exact_english_sense_count"] > 0 for r in rows),
        "pairs_with_ambiguous_sense_alignment": sum(r["ambiguous_sense_count"] > 0 for r in rows),
        "pairs_with_unmatched_spanish_senses": sum(r["unmatched_sense_count"] > 0 for r in rows),
        "ambiguous_source_pair": sum(r["ambiguous"] for r in rows),
        "resolved_by_english_gloss": sum(r["resolved_by_english_gloss"] for r in rows),
        "english_gloss_no_candidate_match": sum(r["english_gloss_no_candidate_match"] for r in rows),
        "multiple_spanish_ids": sum(len(r["matched_ids"]) > 1 for r in rows),
        "covered_with_multiple_senses": sum(sum(len(x) for x in r["spanish_by_id"].values()) > 1 for r in rows),
    }
    return summary, rows


def write_csv(path: Path, rows: list[dict[str, Any]], fields: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow({k: json.dumps(row[k], ensure_ascii=False) if isinstance(row.get(k), (list, dict)) else row.get(k) for k in fields})


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--kanjidic-all", type=Path, default=ROOT / "data_raw/kanjidic2-all-3.6.2.json")
    parser.add_argument("--jmdict-eng-common", type=Path, default=EN_WORDS)
    parser.add_argument("--jmdict-all", type=Path, default=ROOT / "data_raw/jmdict-all-3.6.2.json")
    parser.add_argument("--out-dir", type=Path, default=ROOT / "reports/spanish-coverage")
    args = parser.parse_args()

    app = app_records(read_json(APP_DATA))
    en_kanji = read_json(EN_KANJI)
    en_words = read_json(args.jmdict_eng_common)
    es_kanji = read_json(args.kanjidic_all)
    all_words = read_json(args.jmdict_all)
    for label, data in (("KANJIDIC2 English", en_kanji), ("JMdict English", en_words), ("KANJIDIC2 all languages", es_kanji), ("JMdict all languages", all_words)):
        validate_date(label, data)
    if en_words.get("commonOnly") is not True:
        raise SystemExit("JMdict English input must be common-only; it defines the app's word universe")
    if "all" not in es_kanji.get("languages", []):
        raise SystemExit("KANJIDIC2 input must be the all-language distribution")
    if "all" not in all_words.get("languages", []):
        raise SystemExit("JMdict input must be the all-language distribution")

    kanji_summary, kanji_rows = kanji_analysis(app, es_kanji)
    word_summary, word_rows = words_analysis(app, en_words, all_words)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    write_csv(args.out_dir / "kanji-spanish-coverage.csv", kanji_rows, ["kanji", "jlpt", "covered", "spanish"])
    write_csv(args.out_dir / "word-reading-spanish-coverage.csv", word_rows, ["form", "reading", "english", "kanji", "candidate_ids", "selected_ids", "spanish_entry_ids", "matched_ids", "ambiguous", "resolved_by_english_gloss", "english_gloss_no_candidate_match", "missing_reason", "covered", "meaning_aligned_covered", "uniquely_aligned_sense_count", "ambiguous_sense_count", "unmatched_sense_count", "exact_english_sense_count", "spanish_glosses", "meaning_aligned_spanish_glosses", "spanish_by_id"])

    # Deterministic quality-review sample: up to 3 pairs per level from each
    # coverage/alignment class, seed fixed for reproducibility.
    rng = random.Random(20261025)
    review = []
    level_by_kanji = {r["kanji"]: (r.get("jlpt") or "Sin JLPT") for r in app}
    for level in ("N5", "N4", "N3", "N2", "N1", "Sin JLPT"):
        in_level = [r for r in word_rows if any(level_by_kanji.get(ch) == level for ch in r["kanji"])]
        classes = (
            ("aligned", lambda r: r["meaning_aligned_covered"]),
            ("spanish_unaligned", lambda r: r["covered"] and not r["meaning_aligned_covered"]),
            ("no_spanish_gloss", lambda r: not r["covered"]),
        )
        for label, predicate in classes:
            bucket = [r for r in in_level if predicate(r)]
            for row in rng.sample(bucket, min(3, len(bucket))):
                row["review_group"] = label
                review.append(row)
    write_csv(args.out_dir / "quality-review-sample.csv", review, ["form", "reading", "english", "kanji", "review_group", "candidate_ids", "selected_ids", "matched_ids", "missing_reason", "covered", "meaning_aligned_covered", "uniquely_aligned_sense_count", "ambiguous_sense_count", "unmatched_sense_count", "exact_english_sense_count", "spanish_glosses", "meaning_aligned_spanish_glosses", "spanish_by_id"])

    result = {
        "source_pin": PIN,
        "source_date": EXPECTED_DATE,
        "current_app_kanji": kanji_summary,
        "unique_word_reading_pairs": word_summary,
        "sample_size": len(review),
        "review_instructions": "Manually judge sense equivalence and natural Spanish in quality-review-sample.csv; script does not infer semantic correctness.",
    }
    (args.out_dir / "summary.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
