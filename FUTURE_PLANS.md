# KanjiSensei — Future Ideas

Feature backlog derived from the architecture already in place (Phase 0–5 of
IMPLEMENTATION_PLAN.md are done). Every feature below must consume data through
`src/lib/data.ts` only, per the architecture rule. Offline-first ethos applies:
no backend required for anything on this list.

Effort key: **S** = hours · **M** = 1–2 days · **L** = multi-session

---

## Top picks (do these first)

1. **Stroke-order animation** — KanjiVG is already in `data_raw/`; the single
   biggest visible upgrade for the effort.
2. **Phonetic series explorer** — leverages data nobody else surfaces; pure
   frontend.
3. **Progress layer** — small by itself, but it makes the graph, reverse tree,
   and future quizzes all feel personal.

---

## 🧩 Exploration (discovery-first identity)

- [ ] **Component composer** (S, frontend only)
  Pick 2–3 components → every kanji built from that set (宀 + 豕). Uses the
  existing variant canonicalization (亻→人) and reverse indexes.
- [x] **Phonetic series explorer** (S–M, frontend only) — **DONE 2026-09-30.**
  Conditional "Phonetic series" panel on RadicalPage (series members with
  onyomi, ✓/≠ match flags, reliability stat, Graph view) + a reading-hint
  line on KanjiPage for kanji with a phonetic component. Match rule: exact
  onyomi or voiced readings (dakuten/handakuten); non-standalone components
  fall back to the series' dominant onyomi. New `src/lib/keisei.ts`; 98
  series, 214 member kanji, no pipeline changes.
- [ ] **Lookalike kanji finder** (S–M)
  Kanji sharing ≥2 components → confusable pairs (未/末, 完/冠). Natural
  extension of `src/lib/graph.ts`.
- [ ] **Random walk / Surprise me** (S)
  Random kanji button; "start here" deep-dive entry point for casual sessions.
- [ ] **JLPT constellation** (S)
  GraphPage scoped to an entire JLPT level (e.g. all N5 at once). JLPT is on
  every record; graph infra exists.
- [ ] **Component math in omnibox** (M)
  Extend `src/lib/search.ts` query syntax: `宀+豕` → kanji containing both
  components (and eventually `宀-豕`). SearchBar already parses "JLPT N5" /
  "13 strokes".
- [ ] **Heisig lookup** (S)
  Fun fact: `heisig` frame numbers are already in kanji.json but NOT exposed in
  `src/lib/types.ts` — one-line type fix away from being displayed/searchable.

## 🎓 Study (extends the planned study/ module)

- [x] **Writing practice section** (M) — **DONE 2026-10-02.** New "Practice"
  nav item + `/practice`: draw kanji and kana from animated models
  (self-check: reveal overlay + knew-it/try-again/skip; session stats,
  "re-practice the retries" recap). Kana stroke data now shipped from the
  pipeline (`kana.json`, 86 hiragana + 90 katakana from KanjiVG with romaji);
  practice-by-radical-family and phonetic-series seeding links; jump-to-glyph
  search + `?char=` deep links. Auto-scoring deferred to phase 2.
  Phase 2 DONE 2026-10-06: offline heuristic auto-scoring (`lib/score.ts`) —
  per-stroke chips (✓ exact / ⇄ reversed / ✗ off) in-draw-order against the
  KanjiVG ideal geometry + knew-it suggestion pulse; final judgment stays
  with the user.

- [ ] **Build-a-kanji quiz** (S–M, pure frontend)
  Swap of the explorer: given components, pick/assemble the kanji they form.
  Thematically perfect for this app.
- [ ] **Cloze sentence drill** (S)
  `sentences[]` data is pre-made fill-in-the-blank material: hide the kanji in
  the JP sentence, multiple-choice from 4 candidates.

- [ ] **Confusable drills** (M)
  Auto-generated from the lookalike finder: drill kanji that share real
  structure, not arbitrary selection.
- [ ] **Kanji of the day** (S)
  Deterministic pick by date (no backend); habit loop for returning users.

## 📈 Progress & personal (localStorage unlocks all of these)

- [ ] **Progress store** (S) — foundation: learned/starred markers in
  localStorage. Everything below keys off this.
- [ ] **Status-aware visualizations** (M)
  Color graph nodes and reverse-tree entries by learned/starred status →
  existing visualizations become progress maps.
- [ ] **JLPT coverage dashboard** (S)
  "Seen 68/103 N5 kanji" — trivially computed once progress exists.
- [ ] **Recently viewed timeline** (S)
  Exploration breadcrumbs from session history.

## ✨ Presentation wins

- [x] **Stroke-order animation** (M) — **DONE 2026-09-28, Tier 1+2.** See
  `IMPLEMENTATION_PLAN_ANIMATION.md`. Stroke data chunked by JLPT
  (`strokes-n5…n1/none.json`, lazily fetched per level; 100% KanjiVG coverage).
  Draw-on animation with replay/speed controls, role-colored strokes,
  chip-hover highlight dimming, and component build-up mode with live label.
  Follow-up same day: "build-up" checkbox replaced by a `strokes | components`
  segmented mode toggle, live label gains part counter + stroke range
  (`2/3 · 豕 · strokes 4–10`), and runs end with a 500 ms settle pulse.
  Follow-up Sep 29: label became a persistent interactive step strip —
  recipe preview → accented current step → placed recap, hover a step to
  highlight its strokes; hover now wins over the running group (works in
  the post-assembly state where it was previously dead).
- [x] **Graph hover tooltips** (S) — **DONE 2026-09-28.** Node hover on the
  relationship graph shows character · kind · romaji name · meaning in a
  clamped, pointer-following tooltip (`pointer-events: none` so it never
  blocks interaction); the hovered node grows smoothly (Cytoscape class-based
  hover — no `:hover` selector exists — with animated size/border transitions,
  reduced-motion gated). Touch unaffected: tap stays navigation-only.
  Data: `GraphNode` carries `name`/`meaning` from `lib/graph.ts`.
- [ ] **Font toggle** (S)
  Minchō vs gothic — genuinely useful because most learner materials print in
  minchō.
- [ ] **Furigana toggle** (S)
  Words/sentences already carry kana; toggle overlay above kanji in text.
- [ ] **Printable practice sheets** (S, pure CSS/print)
  Genkō yōshi grid PDF/print sheet for a radical family or JLPT set.
- [ ] **PWA offline install** (M)
  Matches the fully-offline data build; service worker + manifest.

---

## Previously noted (from earlier discussion)

- [ ] **EN/ES language toggle** — SEE TRANSLATION ANALYSIS IN CONVERSATION.
  UI strings: easy (~2–3 h, ~50 strings, LangContext + two dictionaries, no
  library needed). Dictionary data: moderate (~1 day, regenerate kanji.json
  with Spanish word meanings from full multilingual JMdict + Tatoeba
  jpn↔spa pairs). Kanji glosses: no official Spanish KANJIDIC2 — recommend
  English fallback or one-time machine-translation pass over ~2k unique
  glosses. Design all Spanish fields with `es ?? en` fallback.

---

## Ordering suggestion

1. Progress store (foundation for anything personal).
2. Stroke-order animation (visible win; data already in repo).
3. Component composer + phonetic explorer (unique features, no pipeline work).
4. Study module (quiz → cloze → confusables).
5. Presentation polish (font/furigana toggles, print sheets, PWA).
