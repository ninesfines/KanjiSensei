import type { JlptLevel, KanjiData, RadicalData } from "./types";
import kanjiFile from "@/data/kanji.json";
import radicalsFile from "@/data/radicals.json";

export const kanjiList = kanjiFile.kanji as unknown as KanjiData[];
export const radicals = radicalsFile.radicals as unknown as RadicalData[];

const kanjiByChar = new Map(kanjiList.map((k) => [k.kanji, k]));

const radicalByKey = new Map<string, RadicalData>();
const radicalByVariant = new Map<string, RadicalData>();
for (const r of radicals) {
  radicalByKey.set(r.character, r);
  radicalByVariant.set(r.variant, r);
}

/** printed component glyph -> canonical radical key (e.g. ⺅ -> 人) */
export const variantToKey = new Map<string, string>();
for (const r of radicals) {
  variantToKey.set(r.character, r.character);
  if (r.variant) variantToKey.set(r.variant, r.character);
}

/** KRADFILE replacement glyphs that have no radicals.json entry of their own */
const KRAD_RUNTIME_ALIASES: Record<string, string> = {
  "⺾": "艸", "丷": "八", "⺡": "水", "⺣": "火", "⺅": "人", "𠆢": "人",
  "⺖": "心", "⺉": "刀", "⺌": "小", "⽧": "疒", "⻏": "邑", "⻖": "阜",
  "⻂": "衣", "⺨": "犬", "⺹": "爪", "⺭": "示", "⽱": "耒", "扌": "手",
  "⻌": "辵",
};
for (const [alias, key] of Object.entries(KRAD_RUNTIME_ALIASES)) {
  variantToKey.set(alias, key);
}

export function getKanji(kanji: string): KanjiData | undefined {
  return kanjiByChar.get(kanji);
}

export function allKanji(): KanjiData[] {
  return kanjiList;
}

export function getRadical(key: string): RadicalData | undefined {
  return radicalByKey.get(key);
}

export function radicalFor(character: string): RadicalData | undefined {
  return radicalByKey.get(character) ?? radicalByVariant.get(character);
}

/** unique set of every radical involved in a kanji (canonical keys). */
export function kanjiRadicalKeys(k: KanjiData): string[] {
  const out: string[] = [];
  if (k.radical?.character && !out.includes(k.radical.character)) out.push(k.radical.character);
  for (const c of k.components) {
    const key = variantToKey.get(c.character) ?? c.canonical;
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

export function radicalsGroupedByStroke(): Array<[number, RadicalData[]]> {
  const m = new Map<number, RadicalData[]>();
  for (const r of radicals) {
    const arr = m.get(r.strokeCount) ?? [];
    arr.push(r);
    m.set(r.strokeCount, arr);
  }
  return [...m.entries()].sort((a, b) => a[0] - b[0]);
}

/** db counts shown on home */
export function dbStats(): { kanjiCount: number; radicalCount: number } {
  return { kanjiCount: kanjiList.length, radicalCount: radicals.length };
}

export type { JlptLevel, KanjiData, RadicalData };
