/** Hepburn-style reading aid for the kana stored in KANJIDIC2.
 * Keep KANJIDIC's dots and hyphens, which mark okurigana and affixes. */
const BASE: Record<string, string> = {
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
  ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
  だ: "da", ぢ: "ji", づ: "zu", で: "de", ど: "do",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
  ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
  や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
  わ: "wa", ゐ: "wi", ゑ: "we", を: "o", ん: "n",
  ゔ: "vu", ぁ: "a", ぃ: "i", ぅ: "u", ぇ: "e", ぉ: "o",
};

const DIGRAPHS: Record<string, string> = {
  きゃ: "kya", きゅ: "kyu", きょ: "kyo",
  ぎゃ: "gya", ぎゅ: "gyu", ぎょ: "gyo",
  しゃ: "sha", しゅ: "shu", しょ: "sho",
  じゃ: "ja", じゅ: "ju", じょ: "jo",
  ちゃ: "cha", ちゅ: "chu", ちょ: "cho",
  ぢゃ: "ja", ぢゅ: "ju", ぢょ: "jo",
  にゃ: "nya", にゅ: "nyu", にょ: "nyo",
  ひゃ: "hya", ひゅ: "hyu", ひょ: "hyo",
  びゃ: "bya", びゅ: "byu", びょ: "byo",
  ぴゃ: "pya", ぴゅ: "pyu", ぴょ: "pyo",
  みゃ: "mya", みゅ: "myu", みょ: "myo",
  りゃ: "rya", りゅ: "ryu", りょ: "ryo",
  ふぁ: "fa", ふぃ: "fi", ふぇ: "fe", ふぉ: "fo",
};

function hiragana(char: string): string {
  const cp = char.charCodeAt(0);
  return cp >= 0x30a1 && cp <= 0x30f6 ? String.fromCharCode(cp - 0x60) : char;
}

export function kanaToRomaji(reading: string): string {
  const chars = [...reading].map(hiragana);
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === "っ") {
      const next = DIGRAPHS[(chars[i + 1] ?? "") + (chars[i + 2] ?? "")] ??
        BASE[chars[i + 1] ?? ""] ?? "";
      out += next.startsWith("ch") ? "t" : next[0]?.match(/[a-z]/) ? next[0] : "";
      continue;
    }
    if (ch === "ー") {
      const vowel = out.match(/[aeiou]$/)?.[0];
      if (vowel) out += vowel;
      continue;
    }
    if (ch === "ん") {
      const next = DIGRAPHS[(chars[i + 1] ?? "") + (chars[i + 2] ?? "")] ?? BASE[chars[i + 1] ?? ""] ?? "";
      out += /^[aeiouy]/.test(next) ? "n'" : "n";
      continue;
    }
    const pair = DIGRAPHS[ch + (chars[i + 1] ?? "")];
    if (pair) {
      out += pair;
      i++;
    } else {
      out += BASE[ch] ?? ch;
    }
  }
  return out;
}
