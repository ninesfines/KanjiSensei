import { getKanji, variantToKey } from "./data";
import type {
  ComponentRole,
  KanjiData,
  StrokeChunkKey,
  StrokeRef,
  StrokesData,
} from "./types";

interface StrokesFile {
  version: number;
  generatedAt: string;
  strokes: StrokesData[];
}

/**
 * Stroke path data (KanjiVG), chunked by JLPT level. Explicit loader map so
 * each chunk bundles separately — a kanji view fetches exactly one chunk.
 */
const LOADERS: Record<StrokeChunkKey, () => Promise<unknown>> = {
  N5: () => import("@/data/strokes-n5.json"),
  N4: () => import("@/data/strokes-n4.json"),
  N3: () => import("@/data/strokes-n3.json"),
  N2: () => import("@/data/strokes-n2.json"),
  N1: () => import("@/data/strokes-n1.json"),
  none: () => import("@/data/strokes-none.json"),
};

const cache = new Map<StrokeChunkKey, Map<string, StrokesData>>();
const inflight = new Map<StrokeChunkKey, Promise<Map<string, StrokesData>>>();

async function chunkFor(key: StrokeChunkKey): Promise<Map<string, StrokesData>> {
  const cached = cache.get(key);
  if (cached) return cached;
  let pending = inflight.get(key);
  if (!pending) {
    pending = LOADERS[key]().then((mod) => {
      const file = (mod as { default: StrokesFile }).default;
      const map = new Map<string, StrokesData>();
      for (const row of file.strokes) map.set(row.kanji, row);
      cache.set(key, map);
      return map;
    });
    pending.catch(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  return pending;
}

/** Stroke path data for a kanji, or null when loading failed / not available. */
export async function getStrokes(char: string): Promise<StrokesData | null> {
  const k = getKanji(char);
  if (!k) return null;
  try {
    const map = await chunkFor(k.jlpt ?? "none");
    return map.get(char) ?? null;
  } catch {
    return null;
  }
}

/** Canonical key of a KanjiVG stroke element (variant glyphs like ⺅ → 人). */
export function strokeCanonical(element: string): string {
  return variantToKey.get(element) ?? element;
}

/** role lookup by canonical component key for a kanji's components. */
export function roleMapFor(k: KanjiData): Map<string, ComponentRole> {
  const m = new Map<string, ComponentRole>();
  for (const c of k.components) m.set(c.canonical, c.role);
  return m;
}

/** pseudo-key for strokes directly under the KanjiVG root group. */
export const ROOT_GROUP_KEY = "@root";

export interface StrokeGroup {
  /** canonical component key of the run. */
  key: string;
  /** first stroke nn (1-based, inclusive). */
  startNn: number;
  /** last stroke nn (inclusive). */
  endNn: number;
}

/**
 * Consecutive runs of strokes sharing one canonical component key — the
 * build-up grouping. Single source of truth for both the animation timing
 * and the live-label progress display.
 */
export function strokeGroups(strokes: StrokeRef[]): StrokeGroup[] {
  const out: StrokeGroup[] = [];
  for (const s of strokes) {
    const key = strokeCanonical(s.element || ROOT_GROUP_KEY);
    const last = out[out.length - 1];
    if (last && last.key === key) {
      last.endNn = s.nn;
    } else {
      out.push({ key, startNn: s.nn, endNn: s.nn });
    }
  }
  return out;
}
