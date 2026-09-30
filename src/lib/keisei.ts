import { allKanji, getKanji } from "./data";
import type { JlptLevel } from "./types";

/**
 * Phonetic series (形声, keisei): all kanji that use a given component as
 * their sound-carrier (role "phonetic"), scored against how often the
 * component actually predicts the on'yomi. Derived purely from data.ts.
 */

export interface PhoneticMember {
  kanji: string;
  onyomi: string[];
  jlpt: JlptLevel | null;
  /** exact expected onyomi, or a systematic voicing (dakuten/handakuten) of it. */
  matches: boolean;
}

export interface PhoneticSeries {
  /** canonical component key. */
  key: string;
  /** readings this component's family "should" produce. */
  expectedOnyomi: string[];
  members: PhoneticMember[];
  /** members whose onyomi matches expected (incl. voicing variants). */
  matchCount: number;
  /** members with at least one onyomi — the stat's denominator. */
  scoredCount: number;
}

/** known limitation of the v1 rule (documented in the panel): reader-row
 *  alternations (皮→破/波 ハ vs ヒ) count as outliers; only exact or
 * voiced readings count. */
const VOICING: Record<string, string[]> = {
  カ: ["ガ"], キ: ["ギ"], ク: ["グ"], ケ: ["ゲ"], コ: ["ゴ"],
  サ: ["ザ"], シ: ["ジ"], ス: ["ズ"], セ: ["ゼ"], ソ: ["ゾ"],
  タ: ["ダ"], チ: ["ヂ"], ツ: ["ヅ"], テ: ["デ"], ト: ["ド"],
  ハ: ["バ", "パ"], ヒ: ["ビ", "ピ"], フ: ["ブ", "プ"], ヘ: ["ベ", "ペ"],
  ホ: ["ボ", "ポ"],
};

function voicingVariants(reading: string): string[] {
  const v = VOICING[reading[0]];
  return v ? v.map((x) => x + reading.slice(1)) : [];
}

function matchesExpected(expected: string[], member: string): boolean {
  if (!member) return false;
  return expected.some(
    (e) =>
      member === e ||
      voicingVariants(e).includes(member) ||
      voicingVariants(member).includes(e),
  );
}

function dominantOnyomi(members: Array<{ onyomi: string[] }>): string[] {
  const counts = new Map<string, number>();
  for (const m of members) {
    const r = m.onyomi[0];
    if (r) counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  let best = "";
  let n = 0;
  for (const [r, c] of counts) {
    if (c > n) {
      best = r;
      n = c;
    }
  }
  return n ? [best] : [];
}

const JLPT_RANK: Record<JlptLevel, number> = { N5: 5, N4: 4, N3: 3, N2: 2, N1: 1 };

const cache = new Map<string, PhoneticSeries | null>();

/** Series for a canonical component key; null when nothing uses it as phonetic. */
export function phoneticSeriesFor(canonicalKey: string): PhoneticSeries | null {
  const cached = cache.get(canonicalKey);
  if (cached !== undefined) return cached;

  const scored: Array<{ kanji: string; onyomi: string[]; jlpt: JlptLevel | null; freq: number | null }> = [];
  for (const k of allKanji()) {
    if (k.components.some((c) => c.role === "phonetic" && c.canonical === canonicalKey)) {
      scored.push({ kanji: k.kanji, onyomi: k.onyomi, jlpt: k.jlpt, freq: k.freq });
    }
  }
  if (!scored.length) {
    cache.set(canonicalKey, null);
    return null;
  }

  const comp = getKanji(canonicalKey);
  const expectedOnyomi = comp ? [...comp.onyomi] : dominantOnyomi(scored);

  scored.sort(
    (a, b) =>
      (JLPT_RANK[b.jlpt as JlptLevel] ?? 0) - (JLPT_RANK[a.jlpt as JlptLevel] ?? 0) ||
      (a.freq ?? 9999) - (b.freq ?? 9999) ||
      a.kanji.localeCompare(b.kanji, "ja"),
  );

  const members: PhoneticMember[] = scored.map((m) => ({
    kanji: m.kanji,
    onyomi: m.onyomi,
    jlpt: m.jlpt,
    matches: m.onyomi.length > 0 && matchesExpected(expectedOnyomi, m.onyomi[0]),
  }));

  const scoredOnly = members.filter((m) => m.onyomi.length > 0);
  const out: PhoneticSeries = {
    key: canonicalKey,
    expectedOnyomi,
    members,
    matchCount: scoredOnly.filter((m) => m.matches).length,
    scoredCount: scoredOnly.length,
  };
  cache.set(canonicalKey, out);
  return out;
}
