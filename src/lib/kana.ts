import kanaFile from "@/data/kana.json";
import type { KanaData, KanaKind } from "./types";

export const kanaList = kanaFile.kana as unknown as KanaData[];

const byChar = new Map(kanaList.map((k) => [k.char, k]));

/** kana drawing data by character; strokes reuse the StrokeRef shape. */
export function getKana(k: string): KanaData | undefined {
  return byChar.get(k);
}

/* gojūon ordering constants drive the grids; kana.json drives the content. */
const HIRA_BASE =
  "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
const HIRA_DAKU = "がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ";
const HIRA_SMALL = "ぁぃぅぇぉっゃゅょゎ";
const KATA_BASE =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
const KATA_DAKU = "ガギグゲゴザジズゼゾダヂヅデドバビブベボヴパピプペポ";
const KATA_SMALL = "ァィゥェォッャュョヮヵヶ";

export interface KanaGrid {
  base: KanaData[];
  daku: KanaData[];
  small: KanaData[];
}

/** gojūon grid for a kana kind; small forms as a muted extra row. */
export function kanaGrid(kind: KanaKind): KanaGrid {
  const [baseStr, dakuStr, smallStr] =
    kind === "hiragana"
      ? [HIRA_BASE, HIRA_DAKU, HIRA_SMALL]
      : [KATA_BASE, KATA_DAKU, KATA_SMALL];
  const take = (s: string) =>
    [...s].map((ch) => byChar.get(ch)).filter((k) => k !== undefined) as KanaData[];
  return { base: take(baseStr), daku: take(dakuStr), small: take(smallStr) };
}
