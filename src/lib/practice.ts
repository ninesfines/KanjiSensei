import { kanaList, getKana } from "./kana";
import { allKanji, getKanji, radicalFor } from "./data";
import { getStrokes } from "./strokes";
import { phoneticSeriesFor } from "./keisei";
import type { JlptLevel, PracticeItem } from "./types";

/** marks are final-state per glyph: try again keeps "retry" until knew it
 *  overwrites to "good"; recaps are computed from the final map. */
export type PracticeMark = "good" | "retry";

/** in-memory practice session (no persistence in v1). */
export interface PracticeSession {
  queue: PracticeItem[];
  index: number;
  results: Map<string, PracticeMark>;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildSession(items: PracticeItem[], doShuffle = true): PracticeSession {
  const seen = new Set<string>();
  const uniq = items.filter((it) => it.strokes.length && !seen.has(it.char) && seen.add(it.char));
  return { queue: doShuffle ? shuffle(uniq) : uniq, index: 0, results: new Map() };
}

/* ---- queue builders (consumed only via sessionFromParams / recap) -------- */

export async function fromChars(chars: string[]): Promise<PracticeSession> {
  const items: PracticeItem[] = [];
  for (const ch of chars) {
    const kana = getKana(ch);
    if (kana) {
      items.push({ char: ch, kind: "kana", strokes: kana.strokes });
      continue;
    }
    const data = await getStrokes(ch);
    if (data?.strokes.length) items.push({ char: ch, kind: "kanji", strokes: data.strokes });
  }
  return buildSession(items);
}

export function fromKana(kind: "hiragana" | "katakana"): PracticeSession {
  return buildSession(
    kanaList
      .filter((k) => k.kind === kind && k.char.length === 1)
      .map((k) => ({ char: k.char, kind: "kana" as const, strokes: k.strokes })),
  );
}

export async function fromJlpt(level: JlptLevel): Promise<PracticeSession> {
  const chars = allKanji().filter((k) => k.jlpt === level).map((k) => k.kanji);
  return buildSession(await strokesOf(chars));
}

export async function fromRadicalFamily(key: string, cap = 40): Promise<PracticeSession> {
  const family = radicalFor(key)?.kanji ?? [];
  const chars = family.filter((k) => getKanji(k)).slice(0, cap);
  return buildSession(await strokesOf(chars));
}

export async function fromPhoneticSeries(key: string): Promise<PracticeSession> {
  const chars = (phoneticSeriesFor(key)?.members ?? []).map((m) => m.kanji);
  return buildSession(await strokesOf(chars));
}

async function strokesOf(chars: string[]): Promise<PracticeItem[]> {
  const items: PracticeItem[] = [];
  for (const ch of chars) {
    const data = await getStrokes(ch);
    if (data?.strokes.length) items.push({ char: ch, kind: "kanji", strokes: data.strokes });
  }
  return items;
}

/** dispatch on practice URL params; null = no (or picker-only) target. */
export async function sessionFromParams(
  params: URLSearchParams,
): Promise<PracticeSession | null> {
  const ch = params.get("char");
  if (ch) return fromChars([ch]);
  const series = params.get("series");
  if (series) return fromPhoneticSeries(series);
  const family = params.get("family");
  if (family) return fromRadicalFamily(family);
  const jlpt = params.get("jlpt");
  if (jlpt === "N5" || jlpt === "N4" || jlpt === "N3" || jlpt === "N2" || jlpt === "N1") {
    return fromJlpt(jlpt);
  }
  const kana = params.get("kana");
  if ((kana === "hiragana" || kana === "katakana") && params.get("all")) {
    return fromKana(kana);
  }
  return null;
}

/* ---- session helpers ------------------------------------------------------ */

/** does the current URL target a studio session (not the landing/picker)? */
export function paramsTargetSession(params: URLSearchParams): boolean {
  const kana = params.get("kana");
  return Boolean(
    params.get("char") ||
      params.get("series") ||
      params.get("family") ||
      params.get("jlpt") ||
      (kana && params.get("all")),
  );
}

export function advance(s: PracticeSession): PracticeSession {
  return { ...s, index: s.index + 1 };
}

export function markGood(s: PracticeSession, char: string): PracticeSession {
  const results = new Map(s.results);
  results.set(char, "good");
  return advance({ ...s, results });
}

export function markRetry(s: PracticeSession, char: string): PracticeSession {
  const results = new Map(s.results);
  results.set(char, "retry");
  return { ...s, results }; // stays on this glyph for a fresh attempt
}

export function sessionStats(s: PracticeSession) {
  const good = s.queue.filter((q) => s.results.get(q.char) === "good").length;
  const retry = s.queue.filter((q) => s.results.get(q.char) === "retry").length;
  return { good, retry, skipped: s.queue.length - good - retry };
}

export function retryChars(s: PracticeSession): string[] {
  return s.queue.filter((q) => s.results.get(q.char) === "retry").map((q) => q.char);
}
