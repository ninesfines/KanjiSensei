import { radicals, getKanji } from "@/lib/data";
import { variantToKey } from "@/lib/data";
import { allKanji } from "@/lib/data";
import type { RadicalData } from "@/lib/types";

/**
 * Number of kanji in the app dataset that contain the given canonical
 * radical/component. Alias glyphs (⺅ -> 人) resolve to their canonical key.
 */
export function appFamilyCount(character: string): number {
  const key = variantToKey.get(character) ?? character;
  const rad = getRadicalFor(key);
  return rad ? rad.kanji.length : 0;
}

function getRadicalFor(key: string): RadicalData | undefined {
  return radicals.find((r) => r.character === key);
}

export function familyPreview(character: string, count: number): string[] {
  const rad = getRadicalFor(character);
  if (!rad) return [];
  return rad.kanji.slice(0, count);
}

export function countKanjiWithComponent(character: string): number {
  const key = variantToKey.get(character) ?? character;
  const rad = getRadicalFor(key);
  return rad ? rad.kanji.length : 0;
}

export { getRadicalFor as lookupRadicalKey };

export function allRadicalKeys(): string[] {
  return radicals.map((r) => r.character);
}

export function kanjiListingFor(kanji: string) {
  return getKanji(kanji) ?? allKanji().find((k) => k.kanji === kanji);
}
