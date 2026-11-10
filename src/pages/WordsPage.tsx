import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { allWords, wordDisplayMeaning, wordSpanishMeaning, wordUrl } from "@/lib/data";
import { kanaToRomaji } from "@/lib/romaji";
import { useI18n } from "@/lib/i18n";

const WORDS = allWords();
const PAGE_SIZE = 80;

function normalized(text: string): string {
  return text.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function WordsPage() {
  const { language, t } = useI18n();
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const q = normalized(query.trim());
  const matches = useMemo(() => q ? WORDS.filter((w) =>
    w.kanji.includes(query.trim()) || w.kana.includes(query.trim()) ||
    normalized(kanaToRomaji(w.kana)).includes(q) || normalized(w.meaning).includes(q) ||
    normalized(wordSpanishMeaning(w.kanji, w.kana) ?? "").includes(q)
  ) : WORDS, [q, query]);
  const shown = matches.slice(0, limit);

  return (
    <article className="page words-page">
      <header className="page-head">
        <h1>{t("words.title")}</h1>
        <p className="muted">{t("words.intro")}</p>
        {language === "es" ? <p className="muted">{t("word.translationNotice")}</p> : null}
        <input
          className="browse-filter"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setLimit(PAGE_SIZE); }}
          placeholder={t("words.filter")}
          aria-label={t("words.filter")}
        />
      </header>
      {matches.length ? (
        <>
          <p className="muted">{t("words.showing", { shown: shown.length, total: matches.length })}</p>
          <div className="words-grid">
            {shown.map((word) => (
              <Link key={`${word.kanji}\u0000${word.kana}`} className="word-card" to={wordUrl(word.kanji, word.kana)}>
                <span className="word-card-form" lang="ja">{word.kanji}</span>
                <span className="word-card-reading" lang="ja">{word.kana}</span>
                <span className="word-card-meaning">{wordDisplayMeaning(word, language)}</span>
              </Link>
            ))}
          </div>
          {shown.length < matches.length ? (
            <button className="link-btn" type="button" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
              {t("radical.showMore", { count: Math.min(PAGE_SIZE, matches.length - shown.length), total: matches.length })}
            </button>
          ) : null}
        </>
      ) : <p className="muted">{t("words.noMatches")}</p>}
    </article>
  );
}
