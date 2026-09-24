# KanjiSensei

An interactive map of Kanji construction. Start from a kanji, decompose it into
radicals and components, then jump to every kanji that shares those components —
discovery-first, not dictionary-first.

## Run

```bash
npm install
python3 scripts/build_data.py   # regenerate src/data/*.json from data_raw/
npm run dev                     # http://localhost:5173
npm run build && npm run preview
```

## Features

- **Kanji explorer** — big kanji, meanings, JLPT, grade, frequency, stroke count,
  on/kun readings, common words, Tatoeba example sentences.
- **Component breakdown** — every kanji decomposed into its components with
  Japanese radical names (ninben, ukanmuri…), meanings, positional type
  (hen/tsukuri/kanmuri/ashi/tare/nyou/kamae) and color-coded role
  (radical / semantic / phonetic). Click any chip to jump.
- **Reverse component tree** — every radical page lists every kanji that
  contains it, click-through in ├─ style, with a dataset-only filter.
- **Relationship graph** — Obsidian-style force graph (Cytoscape): zoom, pan,
  click nodes to navigate; kanji/radical/component color coded.
- **Search** — kanji, meaning, on/kun (kana or romaji), radical names,
  component characters, `JLPT N5`, `13 strokes`.
- **Browse by radical** — all 214 Kangxi radicals plus non-Kangxi components,
  grouped by stroke count, with family sizes.

## Data

Generated offline into `src/data/{kanji,radicals}.json` by
`scripts/build_data.py` (stdlib only) from `data_raw/`:

| File | Source | Licence |
| --- | --- | --- |
| `kanjidic2-en-3.6.2.json` | EDRDG KANJIDIC2 | CC BY-SA 4.0 |
| `jmdict-eng-common-3.6.2.json` | EDRDG JMdictE (common) | CC BY-SA 4.0 |
| `jmdict-examples-eng-3.6.2.json` | EDRDG + Tatoeba pairs | CC BY-SA 4.0 / CC BY 2.0 FR |
| `krad.json` | RADKFILE/KRADFILE (recommended replacements) | EDRDG licence |
| `kr.txt` | Kanjium radicals | MIT |
| `kanjivg.xml.gz` | KanjiVG (structure/positions) | CC BY-SA 3.0 |
| `david.json` | davidluzgouveia/kanji-data (new JLPT mapping) | CC BY-SA 4.0 / EDRDG |

Attribution required by the licences above — this file serves as such. If you
redistribute, keep the attribution table. EDRDG licence: https://edrdg.org/edrg/licence.html

## Architecture

- `scripts/build_data.py` — single build step; all heavy data wrangling offline.
- `src/lib/data.ts` — **the only query layer over the JSON data**; future
  features (flashcards, quizzes, SRS, progress) consume this module only.
- `src/lib/search.ts` — omnibox search with romaji→kana conversion and ranking.
- `src/lib/graph.ts` — scoped subgraph construction for Cytoscape.
- `src/components/`, `src/pages/` — UI; dark theme from `src/styles.css`.

Download `data_raw/` files as in the table (pin jmdict-simplified release
`3.6.2`), then run the builder and verification is built-in
(族/私/家/宀/人 spec checks).
