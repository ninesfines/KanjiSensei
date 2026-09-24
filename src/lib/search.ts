import type { JlptLevel, KanjiData } from "./types";
import { allKanji, radicals, getKanji, radicalFor, variantToKey } from "./data";

export interface SearchHit {
  kind: "kanji" | "radical";
  character: string;
  sub: string;
  key: string;
  score?: number;
}

const DIGRAPHS: Array<[string, string]> = [
  ["kya", "きゃ"], ["kyu", "きゅ"], ["kyo", "きょ"],
  ["gya", "ぎゃ"], ["gyu", "ぎゅ"], ["gyo", "ぎょ"],
  ["sha", "しゃ"], ["shu", "しゅ"], ["sho", "しょ"],
  ["sya", "しゃ"], ["syu", "しゅ"], ["syo", "しょ"],
  ["ja", "じゃ"], ["ju", "じゅ"], ["jo", "じょ"],
  ["cha", "ちゃ"], ["chu", "ちゅ"], ["cho", "ちょ"],
  ["tya", "ちゃ"], ["tyu", "ちゅ"], ["tyo", "ちょ"],
  ["nya", "にゃ"], ["nyu", "にゅ"], ["nyo", "にょ"],
  ["hya", "ひゃ"], ["hyu", "ひゅ"], ["hyo", "ひょ"],
  ["bya", "びゃ"], ["byu", "びゅ"], ["byo", "びょ"],
  ["pya", "ぴゃ"], ["pyu", "ぴゅ"], ["pyo", "ぴょ"],
  ["mya", "みゃ"], ["myu", "みゅ"], ["myo", "みょ"],
  ["rya", "りゃ"], ["ryu", "りゅ"], ["ryo", "りょ"],
  ["fa", "ふぁ"], ["fi", "ふぃ"], ["fe", "ふぇ"], ["fo", "ふぉ"],
];

const BASE: Array<[string, string]> = [
  ["shi", "し"], ["chi", "ち"], ["tsu", "つ"], ["ji", "じ"], ["di", "ぢ"], ["fu", "ふ"], ["hu", "ふ"],
  ["ka", "か"], ["ki", "き"], ["ku", "く"], ["ke", "け"], ["ko", "こ"],
  ["ga", "が"], ["gi", "ぎ"], ["gu", "ぐ"], ["ge", "げ"], ["go", "ご"],
  ["za", "ざ"], ["zi", "じ"], ["zu", "ず"], ["ze", "ぜ"], ["zo", "ぞ"],
  ["sa", "さ"], ["su", "す"], ["se", "せ"], ["so", "そ"],
  ["da", "だ"], ["du", "づ"], ["de", "で"], ["do", "ど"],
  ["ta", "た"], ["te", "て"], ["to", "と"],
  ["na", "な"], ["ni", "に"], ["nu", "ぬ"], ["ne", "ね"], ["no", "の"],
  ["ha", "は"], ["hi", "ひ"], ["he", "へ"], ["ho", "ほ"],
  ["ba", "ば"], ["bi", "び"], ["bu", "ぶ"], ["be", "べ"], ["bo", "ぼ"],
  ["pa", "ぱ"], ["pi", "ぴ"], ["pu", "ぷ"], ["pe", "ぺ"], ["po", "ぽ"],
  ["ma", "ま"], ["mi", "み"], ["mu", "む"], ["me", "め"], ["mo", "も"],
  ["ya", "や"], ["yu", "ゆ"], ["yo", "よ"],
  ["ra", "ら"], ["ri", "り"], ["ru", "る"], ["re", "れ"], ["ro", "ろ"],
  ["wa", "わ"], ["wo", "を"], ["wi", "ゐ"], ["we", "ゑ"],
  ["a", "あ"], ["i", "い"], ["u", "う"], ["e", "え"], ["o", "お"],
];

const R2K = [...DIGRAPHS, ...BASE].sort((a, b) => b[0].length - a[0].length);

function kata(hira: string): string {
  return [...hira]
    .map((c) => (c >= "ぁ" && c <= "ゖ" ? String.fromCharCode(c.charCodeAt(0) + 0x60) : c))
    .join("");
}

export function romajiToKana(input: string): { hira: string; kata: string } {
  const src = input.toLowerCase().replace(/ō/g, "o").replace(/ou/g, "u").replace(/oo/g, "u");
  let hira = "";
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "-") {
      i += 1;
      continue;
    }
    if (!/[a-z]/.test(ch)) {
      i += 1;
      continue;
    }
    if (src[i + 1] === ch && !"aeiou".includes(ch)) {
      hira += "っ";
      i += 1;
      continue;
    }
    let matched = false;
    for (const [rom, kana] of R2K) {
      if (src.startsWith(rom, i)) {
        hira += kana;
        i += rom.length;
        matched = true;
        break;
      }
    }
    if (!matched) i += 1;
  }
  return { hira, kata: kata(hira) };
}

const JLPT_W: Record<JlptLevel, number> = { N5: 5, N4: 4, N3: 3, N2: 2, N1: 1 };

function weight(k: KanjiData): number {
  const lvl = k.jlpt ? JLPT_W[k.jlpt] : 0;
  return lvl * 1_000_000 - Math.min(999_999, k.freq ?? 999_999);
}

function meaningWeight(meanings: string[], q: string): number {
  let best = 0;
  for (const m of meanings) {
    const mm = m.toLowerCase();
    let s = 0;
    if (mm === q) s = 100;
    else if (mm.startsWith(q + ",") || mm.startsWith(q + " ")) s = 75;
    else if (mm.startsWith(q)) s = 65;
    else if (mm.includes(q)) s = 40;
    if (s > best) best = s;
  }
  return best;
}

function push(items: SearchHit[], hit: SearchHit): void {
  items.push(hit);
}

export function search(input: string, limit = 40): {
  hits: SearchHit[];
  jlpt: JlptLevel | null;
  strokes: number | null;
} {
  const raw = input.trim();
  if (!raw) return { hits: [], jlpt: null, strokes: null };

  const jlptMatch = raw.match(/jlpt\s*n?([1-5])/i) ?? raw.match(/^n([1-5])$/i);
  if (jlptMatch) {
    const level = `N${parseInt(jlptMatch[1], 10)}` as JlptLevel;
    const hits: SearchHit[] = allKanji()
      .filter((k) => k.jlpt === level)
      .sort((a, b) => weight(b) - weight(a))
      .map((k) => ({ kind: "kanji", character: k.kanji, sub: level, key: k.kanji }));
    return { hits: hits.slice(0, limit), jlpt: level, strokes: null };
  }

  const strokeMatch = raw.match(/(\d+)\s*strokes?/i);
  if (strokeMatch) {
    const n = parseInt(strokeMatch[1], 10);
    const hits: SearchHit[] = allKanji()
      .filter((k) => k.strokeCount === n)
      .sort((a, b) => weight(b) - weight(a))
      .map((k) => ({ kind: "kanji", character: k.kanji, sub: k.jlpt ?? "", key: k.kanji }));
    return { hits: hits.slice(0, limit), jlpt: null, strokes: n };
  }

  const singleRegex = /^([\u3005\u3006\u3007\u3040-\u30ff\u2e80-\u2ef3\u3400-\u9fff]|[\ud800-\udbff][\udc00-\udfff])$/;
  if (singleRegex.test(raw)) {
    const key = variantToKey.get(raw) ?? raw;
    const hits: SearchHit[] = [];
    const kanji = getKanji(raw) ?? getKanji(key);
    if (kanji) {
      push(hits, { kind: "kanji", character: kanji.kanji, sub: kanji.jlpt ?? "", key: kanji.kanji });
    }
    const radical = radicalFor(raw) ?? radicalFor(key);
    if (radical) {
      push(hits, { kind: "radical", character: radical.character, sub: radical.name, key: radical.character });
    }
    return { hits, jlpt: null, strokes: null };
  }

  const q = raw.toLowerCase();
  const { hira, kata } = romajiToKana(raw);
  const items: SearchHit[] = [];

  for (const k of allKanji()) {
    let best = meaningWeight(k.meanings, q);
    for (const r of k.onyomi) {
      if (r === kata) best = Math.max(best, 95);
      else if (kata && r.startsWith(kata)) best = Math.max(best, 78);
    }
    for (const r of k.kunyomi) {
      if (r === hira || r.split(".")[0] === hira) best = Math.max(best, 90);
      else if (hira && r.startsWith(hira)) best = Math.max(best, 70);
    }
    if (best > 0) {
      push(items, { kind: "kanji", character: k.kanji, sub: k.jlpt ?? "", key: k.kanji });
    }
  }

  for (const r of radicals) {
    let best = 0;
    const rm = r.meaning.toLowerCase();
    if (rm === q) best = 96;
    else if (rm.includes(q)) best = Math.max(best, 45);
    for (const nm of r.names) {
      if (nm === q) best = Math.max(best, 92);
      else if (nm.startsWith(q)) best = Math.max(best, 60);
      if (hira && (nm === hira || nm.startsWith(hira))) best = Math.max(best, 85);
    }
    if (best > 0) {
      push(items, { kind: "radical", character: r.character, sub: r.name, key: r.character });
    }
  }

  items.sort((a, b) => {
    if ((a.score ?? 0) !== (b.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
    const ka = a.kind === "kanji" ? getKanji(a.character) : undefined;
    const kb = b.kind === "kanji" ? getKanji(b.character) : undefined;
    return (ka ? -weight(ka) : 0) - (kb ? -weight(kb) : 0);
  });

  return { hits: items.slice(0, limit), jlpt: null, strokes: null };
}
