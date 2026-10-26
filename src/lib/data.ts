import type { ComponentRef, JlptLevel, KanjiData, RadicalData } from "./types";
import kanjiFile from "@/data/kanji.json";
import kanjiEsFile from "@/data/kanji-es.json";
import radicalsFile from "@/data/radicals.json";
import { RADICAL_ES } from "./radical-es";

export const kanjiList = kanjiFile.kanji as unknown as KanjiData[];
export const radicals = radicalsFile.radicals as unknown as RadicalData[];
const kanjiEs = kanjiEsFile.kanji as Record<string, string[]>;

export function hasSpanishKanjiMeaning(k: KanjiData): boolean {
  return Boolean(kanjiEs[k.kanji]?.length);
}

/** Localized kanji glosses; English is retained when Spanish is unavailable. */
export function kanjiMeanings(k: KanjiData, language: "en" | "es"): string[] {
  return language === "es" && kanjiEs[k.kanji]?.length ? kanjiEs[k.kanji] : k.meanings;
}

export function kanjiPrimaryMeaning(k: KanjiData | undefined, language: "en" | "es"): string | undefined {
  return k ? kanjiMeanings(k, language)[0] : undefined;
}

export function radicalMeaning(r: RadicalData, language: "en" | "es"): string {
  if (language !== "es") return r.meaning;
  return RADICAL_ES[r.character] ?? kanjiEs[r.character]?.[0] ?? r.meaning;
}

export function componentMeaning(c: ComponentRef, language: "en" | "es"): string {
  if (language !== "es") return c.meaning;
  return RADICAL_ES[c.canonical] ?? kanjiEs[c.canonical]?.[0] ?? c.meaning;
}

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
