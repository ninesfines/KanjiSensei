import { allKanji, allWords, componentMeaning, kanjiMeanings, variantToKey, wordsForKanji, type WordData } from "./data";
import { curatedFamilies } from "@/data/family-curation";
import type { ComponentRef, KanjiData } from "./types";

export type FamilyMode = "component" | "phonetic" | "reading" | "visual" | "theme" | "words";
export interface FamilyOption { id: string; label: string; description: string; count: number }
export interface FamilyMember { kanji: KanjiData; reason: string; sharedComponent?: string; words: WordData[] }
export interface FamilyQuery { mode: FamilyMode; family: string; language: "en" | "es"; jlpt?: string; position?: string; radicalOnly?: boolean; sort?: "jlpt" | "strokes" | "frequency" }

const kanji = allKanji();
const byChar = new Map(kanji.map(k => [k.kanji, k]));
const radicalRole = (c: ComponentRef) => c.role === "radical";
const componentKey = (c: ComponentRef) => variantToKey.get(c.character) ?? variantToKey.get(c.canonical) ?? c.canonical;
const componentsByKey = new Map<string, Array<{ kanji: KanjiData; component: ComponentRef }>>();
const readingsById = new Map<string, Set<string>>();
for (const k of kanji) {
  for (const c of k.components) {
    const key = componentKey(c);
    (componentsByKey.get(key) ?? componentsByKey.set(key, []).get(key)!).push({ kanji: k, component: c });
  }
  for (const reading of k.onyomi) {
    const id = `on:${reading}`;
    (readingsById.get(id) ?? readingsById.set(id, new Set()).get(id)!).add(k.kanji);
  }
  for (const reading of k.kunyomi) {
    const id = `kun:${reading}`;
    (readingsById.get(id) ?? readingsById.set(id, new Set()).get(id)!).add(k.kanji);
  }
}
const jlptOrder: Record<string, number> = { N5: 5, N4: 4, N3: 3, N2: 2, N1: 1 };
const positionName: Record<string, { en: string; es: string }> = {
  hen: { en: "left", es: "izquierda" }, tsukuri: { en: "right", es: "derecha" },
  kanmuri: { en: "top", es: "superior" }, ashi: { en: "bottom", es: "inferior" },
  tare: { en: "hanging from the top", es: "colgante superior" }, nyou: { en: "wrapping from lower left", es: "envolvente inferior izquierda" }, kamae: { en: "enclosing", es: "envolvente" },
};
function localized(text: { en: string; es: string }, lang: "en" | "es"): string { return text[lang]; }
function phoneticReason(k: KanjiData, key: string, lang: "en" | "es"): string {
  const expected = byChar.get(key)?.onyomi ?? [];
  const shared = k.onyomi.filter(r => expected.includes(r));
  const prefix = lang === "es" ? `Usa ${key} como componente fonético.` : `Uses ${key} as a phonetic component.`;
  if (!expected.length) return prefix;
  return `${prefix} ${shared.length
    ? (lang === "es" ? `Lecturas on compartidas con ${key}: ${shared.join("・")}.` : `On readings shared with ${key}: ${shared.join("・")}.`)
    : (lang === "es" ? `Sin coincidencia exacta con las lecturas on de ${key} en estos datos.` : `No exact match with the on readings of ${key} in this data.`)}`;
}
function componentOptions(mode: "component" | "phonetic", language: "en" | "es"): FamilyOption[] {
  return [...componentsByKey.keys()].flatMap(id => {
    const uses = componentsByKey.get(id)!.filter(({ component: c }) => mode !== "phonetic" || c.role === "phonetic");
    if (!uses.length) return [];
    const comp = uses[0].component;
    const meaning = componentMeaning(comp, language);
    const desc = mode === "component"
      ? (language === "es" ? `Kanji que incluyen el componente ${id}${meaning ? ` (${meaning})` : ""}.` : `Kanji containing component ${id}${meaning ? ` (${meaning})` : ""}.`)
      : (language === "es" ? `Kanji que usan ${id} como componente fonético; la relación con las lecturas puede variar.` : `Kanji using ${id} as a phonetic component; reading relationships can vary.`);
    return [{ id, label: meaning ? `${id} · ${meaning}` : id, description: desc, count: new Set(uses.map(x => x.kanji.kanji)).size }];
  }).sort((a,b) => b.count-a.count || a.id.localeCompare(b.id, "ja"));
}
function readingOptions(language: "en" | "es"): FamilyOption[] {
  return [...readingsById].map(([id, chars]) => {
    const [kind, reading] = id.split(":", 2);
    const kindLabel = kind === "on" ? (language === "es" ? "lectura on" : "on’yomi") : (language === "es" ? "lectura kun" : "kun’yomi");
    return { id, label: `${kindLabel}: ${reading}`, description: language === "es" ? `Kanji con la lectura ${kindLabel} ${reading}.` : `Kanji sharing the ${kindLabel} reading ${reading}.`, count: chars.size };
  }).sort((a,b) => b.count-a.count || a.id.localeCompare(b.id, "ja"));
}
function wordOptions(language: "en" | "es"): FamilyOption[] {
  const pairs = new Map<string, Set<string>>();
  for (const w of allWords()) for (const start of w.characters) {
    const others = pairs.get(start) ?? new Set<string>();
    for (const ch of w.characters) if (ch !== start) others.add(ch);
    pairs.set(start, others);
  }
  return [...pairs].filter(([, members]) => members.size).map(([id, members]) => {
    const k = byChar.get(id)!;
    return { id, label: `${id} · ${kanjiMeanings(k, language)[0] ?? ""}`, description: language === "es" ? `Otros kanji que aparecen con ${id} en palabras del diccionario.` : `Other kanji occurring with ${id} in dictionary words.`, count: members.size };
  }).sort((a,b) => b.count-a.count || a.id.localeCompare(b.id, "ja"));
}
export function listFamilies(mode: FamilyMode, language: "en" | "es"): FamilyOption[] {
  if (mode === "component" || mode === "phonetic") return componentOptions(mode, language);
  if (mode === "reading") return readingOptions(language);
  if (mode === "words") return wordOptions(language);
  return curatedFamilies(mode).map(f => ({ id: f.id, label: localized(f.label, language), description: localized(f.description, language), count: f.members.filter(ch => byChar.has(ch)).length }));
}
export function familyDescription(mode: FamilyMode, family: string, language: "en" | "es"): string {
  const option = listFamilies(mode, language).find(f => f.id === family);
  return option?.description ?? "";
}

function jlptMatches(k: KanjiData, filter?: string): boolean {
  if (!filter) return true;
  if (filter.toLowerCase() === "none" || filter.toLowerCase() === "unlisted") return k.jlpt === null;
  return k.jlpt === filter.toUpperCase();
}
function sortMembers(items: FamilyMember[], sort: FamilyQuery["sort"]): FamilyMember[] {
  return items.sort((a,b) => {
    if (sort === "jlpt") return (jlptOrder[b.kanji.jlpt ?? ""] ?? 0) - (jlptOrder[a.kanji.jlpt ?? ""] ?? 0) || (a.kanji.freq ?? 99999)-(b.kanji.freq ?? 99999) || a.kanji.kanji.localeCompare(b.kanji.kanji,"ja");
    if (sort === "strokes") return a.kanji.strokeCount-b.kanji.strokeCount || a.kanji.kanji.localeCompare(b.kanji.kanji,"ja");
    if (sort === "frequency") return (a.kanji.freq ?? 99999)-(b.kanji.freq ?? 99999) || a.kanji.kanji.localeCompare(b.kanji.kanji,"ja");
    return a.kanji.kanji.localeCompare(b.kanji.kanji,"ja");
  });
}
export function queryFamily(q: FamilyQuery): FamilyMember[] {
  const lang = q.language;
  let result: FamilyMember[] = [];
  if (q.mode === "component") {
    const key = variantToKey.get(q.family) ?? q.family;
    result = kanji.flatMap(k => k.components.filter(c => componentKey(c) === key && (!q.radicalOnly || radicalRole(c)) && (!q.position || c.position === q.position)).map(c => ({ kanji: k, sharedComponent: key, reason: lang === "es" ? `Incluye ${c.character} ${componentMeaning(c, lang) ? `(${componentMeaning(c, lang)})` : ""}${c.position ? ` en posición ${positionName[c.position]?.es ?? c.position}` : ""}.` : `Contains ${c.character} ${componentMeaning(c, lang) ? `(${componentMeaning(c, lang)})` : ""}${c.position ? ` in ${positionName[c.position]?.en ?? c.position} position` : ""}.`, words: wordsForKanji(k.kanji) })));
  } else if (q.mode === "phonetic") {
    result = kanji.flatMap(k => k.components.filter(c => c.role === "phonetic" && componentKey(c) === q.family).map(() => ({ kanji: k, sharedComponent: q.family, reason: phoneticReason(k, q.family, lang), words: wordsForKanji(k.kanji) })));
  } else if (q.mode === "reading") {
    const [kind, reading] = q.family.split(":",2);
    result = kanji.filter(k => kind === "on" ? k.onyomi.includes(reading) : kind === "kun" ? k.kunyomi.includes(reading) : false).map(k => ({ kanji: k, reason: lang === "es" ? `Comparte la lectura ${kind === "on" ? "on’yomi" : "kun’yomi"} ${reading}.` : `Shares the ${kind === "on" ? "on’yomi" : "kun’yomi"} reading ${reading}.`, words: wordsForKanji(k.kanji) }));
  } else if (q.mode === "visual" || q.mode === "theme") {
    const family = curatedFamilies(q.mode).find(f => f.id === q.family);
    if (family) result = family.members.flatMap(ch => { const k = byChar.get(ch); return k ? [{ kanji: k, reason: localized(family.description, lang), words: wordsForKanji(ch) }] : []; });
  } else {
    const starting = byChar.get(q.family);
    if (starting) {
      const evidence = new Map<string, WordData[]>();
      for (const w of wordsForKanji(q.family)) for (const ch of w.characters) if (ch !== q.family && byChar.has(ch)) (evidence.get(ch) ?? evidence.set(ch, []).get(ch)!).push(w);
      result = [...evidence].map(([ch, words]) => ({ kanji: byChar.get(ch)!, reason: lang === "es" ? `Comparte ${words.length} palabra(s) del conjunto de datos con ${q.family}; por ejemplo ${words[0].kanji} (${words[0].kana}).` : `Shares ${words.length} dataset word(s) with ${q.family}, for example ${words[0].kanji} (${words[0].kana}).`, words: [...new Map(words.map(w => [`${w.kanji}\0${w.kana}`,w])).values()] }));
    }
  }
  return sortMembers([...new Map(result.filter(m => jlptMatches(m.kanji,q.jlpt)).map(m => [m.kanji.kanji, m])).values()], q.sort);
}
