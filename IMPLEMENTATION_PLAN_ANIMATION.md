# KanjiSensei — Stroke-Order Animation (Tier 1+2) Implementation Plan

> Step-by-step plan for the stroke animation feature selected in discussion.
> **Decisions locked:** Tier 1 (core draw-on animation) + Tier 2 (component
> color/hover interplay + build-up mode). Stroke data delivered as **JLPT
> chunks** (`N5…N1` + `none`), lazily fetched on first kanji view.
> Out of scope (Tier 3 cherry-picks): RadicalPage heroes, step-through mode,
> print-sheet thumbnails.
>
> Status: checkboxes updated as work completes. Log at the bottom.

- Architecture rule: all stroke queries go through a new `src/lib/strokes.ts`
  (single query layer, mirroring `src/lib/data.ts`).
- Source: `data_raw/kanjivg.xml.gz` (CC BY-SA 3.0) — attribution already in README.

---

## Phase 1 — Pipeline (`scripts/build_data.py`)

- [x] 1.1 Extend `KanjiVgParser`: capture per-path `d`, stroke number (`-sN` id
      suffix), innermost enclosing `<g>`'s `kvg:element`; store as
      `stroke_data[char] = [{nn, d, element}, …]` sorted by `nn`. Existing
      `collected` (g-structure for positions/roles) must remain untouched.
- [x] 1.2 Emit chunks `src/data/strokes-{n5,n4,n3,n2,n1,none}.json` (keyed by each
      record's `jlpt`, `null` → `none`), shape
      `{version, generatedAt, strokes: [{kanji, strokes: [{nn, d, element}]}]}`.
- [x] 1.3 Print per-chunk size/count + KanjiVG coverage of the app set (with
      missing list); add spec asserts: 家=10, 私=7, 族=11 strokes and 家's
      stroke groups include 宀 & 豕.
- [x] 1.4 Run builder; confirm coverage (measured **100% — 2,387/2,387**) and
      reasonable sizes (55 KB–1.6 MB raw per chunk).

## Phase 2 — Data layer

- [x] 2.1 `src/lib/types.ts`: add `StrokeRef`, `StrokesData`, `StrokeChunkKey`.
- [x] 2.2 New `src/lib/strokes.ts`: explicit loader map (one dynamic import per
      chunk → separate Vite chunks), in-memory chunk cache + inflight dedupe,
      `getStrokes(char)` resolving the chunk from the kanji record's JLPT;
      helpers `strokeCanonical()` (variant glyph → canonical, reuses
      `variantToKey`) and `roleMapFor()` (components → role map).

## Phase 3 — `StrokeSvg` component

- [x] 3.1 New `src/components/StrokeSvg.tsx`: `<svg viewBox="0 0 109 109">`,
      one `<path>` per stroke; measure `getTotalLength()` post-mount; CSS
      `stroke-dashoffset` transitions with computed per-stroke durations/delays
      (total ink ≈1.4 s at 1×, sequential order; root-level strokes group `@root`).
- [x] 3.2 Controls: ↻ replay + speed (0.5×/1×/2×; change restarts run) and
      controlled build-up toggle (parent-owned state).
- [x] 3.3 Reduced motion (`prefers-reduced-motion`): skip animation entirely,
      render finished glyph, hide animation controls. Decorative highlight
      interplay must still work.
- [x] 3.4 Role coloring: path stroke color from `roles` map
      (radical=red/semantic=blue/phonetic=purple, other=ink token).
- [x] 3.5 Highlight interplay: when `highlight` (canonical key) is set, other
      components dim to ~14% opacity, target stays full.
- [x] 3.6 Build-up mode: group strokes by component (first-appearance order),
      animate group-by-group; per-group timers fire `onGroupChange(key|null)`;
      timers cleaned on unmount/replay.

## Phase 4 — `KanjiPage` integration

- [x] 4.1 Hero swaps text glyph → `StrokeSvg` (glyph stays while loading or when
      data missing; same box → no layout shift).
- [x] 4.2 Shared `highlight` + `buildUp`/`activeGroup` state; hover *and*
      keyboard focus on component chips set highlight; active build-up group
      lights the matching chip (`.lit`).
- [ ] 4.3 Build-up live label under hero showing current component.

## Phase 5 — Styles + QA

- [x] 5.1 `styles.css`: stroke colors, dim state, controls, `.comp-chip.lit`;
      reuse theme tokens; confirm `prefers-reduced-motion` global guard intact.
- [x] 5.2 `npm run build` (tsc strict) — chunks appear as separate lazy bundles
      (N5 20 KB gz … N1 566 KB gz; main bundle unchanged).
- [x] 5.3 Manual QA (dev server): /kanji/家 (N4 chunk) and an N1 kanji; a
      `jlpt: null` kanji (none chunk); replay/speed; chip hover highlight;
      build-up sync; reduced-motion; mobile viewport. Network tab shows exactly
      one chunk fetch. — *Confirmed working by user.*
- [x] 5.4 Tick `FUTURE_PLANS.md` stroke-animation entry; note chunk strategy.

---

## Progress log

- 2026-09-28 — Plan written; implementation started (Phase 1).
- 2026-09-28 — Phase 1 done: builder emits 6 stroke chunks, 100% KanjiVG
  coverage of the 2,387-kanji app set; spec asserts pass (家=10 私=7 族=11,
  家 groups 宀/豕, ordered 1..n). N5 chunk 55 KB raw / 20 KB gz.
- 2026-09-28 — Phases 2–5 code complete: `lib/strokes.ts` query layer,
  `StrokeSvg` component (draw-on, replay, speed, build-up, role colors,
  highlight dimming, reduced-motion), KanjiPage wiring (hover/focus chips,
  `.lit` sync), CSS block appended. `npm run build` passes strict tsc; each
  chunk bundles independently (strokes-n5 20 KB gz … strokes-n1 566 KB gz).
- 2026-09-28 — User confirmed working. Follow-up fixes: build-up no longer
  dims already-drawn parts (mode now visibly *assembles* instead of looking
  like a replay), added the missing Phase 4.3 live component label
  (glyph + romaji name + meaning + position under the hero, aria-live), and
  ticked FUTURE_PLANS.md.
