/** JLPT level of a kanji, or null when not in any official list. */
export type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";

/**
 * Canonical structural position of a component inside a kanji (English romaji
 * forms of the Japanese positional terms).
 */
export type PositionType =
  | "hen" // left
  | "tsukuri" // right
  | "kanmuri" // top
  | "ashi" // bottom
  | "tare" // hanging from top
  | "nyou" // wrapping from lower left
  | "kamae" // enclosure
  | null;

/** Role the component plays in the kanji's construction. */
export type ComponentRole = "radical" | "semantic" | "phonetic" | "other";

export interface ComponentRef {
  /** The component character exactly as it appears (may be a variant like 亻). */
  character: string;
  /** Canonical (Kangxi) character this variant stands for, e.g. 亻 → 人. */
  canonical: string;
  /** Japanese radical/component name in romaji, e.g. "ninben". */
  name: string;
  /** English meaning, e.g. "person". */
  meaning: string;
  /** Position inside this particular kanji (derived from KanjiVG). */
  position: PositionType;
  role: ComponentRole;
}

export interface RadicalData {
  /** Canonical (Kangxi) character, e.g. 人. */
  character: string;
  /** Graphical variant used inside kanji, e.g. 亻 (same string as character when none). */
  variant: string;
  /** Kangxi radical number (1–214). */
  number: number;
  strokeCount: number;
  /** Primary romaji name, e.g. "hito". */
  name: string;
  /** All Japanese names (romaji) for this radical including position-bearing ones. */
  names: string[];
  meaning: string;
  /** Most typical position of this radical. */
  position: PositionType;
  /** All kanji (jōyō-focused app set) containing this radical/variant. */
  kanji: string[];
}

export interface WordRef {
  kanji: string;
  kana: string;
  meaning: string;
}

export interface SentenceRef {
  jp: string;
  en: string;
}

export interface KanjiData {
  kanji: string;
  meanings: string[];
  jlpt: JlptLevel | null;
  grade: number | null;
  /** Newspaper frequency rank (1 = most common), null when unknown. */
  freq: number | null;
  strokeCount: number;
  onyomi: string[];
  kunyomi: string[];
  radical: {
    character: string;
    canonical: string;
    name: string;
    meaning: string;
    position: PositionType;
  };
  components: ComponentRef[];
  words: WordRef[];
  sentences: SentenceRef[];
}

/** Shape stored in src/data/kanji.json */
export interface KanjiFile {
  version: number;
  generatedAt: string;
  kanji: KanjiData[];
}

/** Shape stored in src/data/radicals.json */
export interface RadicalFile {
  version: number;
  generatedAt: string;
  radicals: RadicalData[];
}

export type NodeKind = "kanji" | "radical" | "component";

export interface SearchResult {
  kind: "kanji" | "radical";
  character: string;
  meaningPatch: string;
  score: number;
}

export const POSITION_DEFS: Record<
  Exclude<PositionType, null>,
  { ja: string; en: string }
> = {
  hen: { ja: "へん", en: "left" },
  tsukuri: { ja: "つくり", en: "right" },
  kanmuri: { ja: "かんむり", en: "top" },
  ashi: { ja: "あし", en: "bottom" },
  tare: { ja: "たれ", en: "hanging from top" },
  nyou: { ja: "にょう", en: "wrapping lower-left" },
  kamae: { ja: "かまえ", en: "enclosure" },
};
