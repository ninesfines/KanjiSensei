import { Link, useSearchParams } from "react-router-dom";
import { getKanji, getWord, kanjiPrimaryMeaning, wordDisplayMeaning, wordKey, wordUrl, wordsForKanji } from "@/lib/data";
import { kanaToRomaji } from "@/lib/romaji";
import { useI18n } from "@/lib/i18n";

export default function WordPage() {
  const { language, t } = useI18n();
  const [params] = useSearchParams();
  const word = getWord(params.get("form") ?? "", params.get("reading") ?? "");
  if (!word) {
    return <div className="notfound page"><p>{t("word.missing")}</p><Link className="btn" to="/words">{t("nav.words")}</Link></div>;
  }

  const currentKey = wordKey(word.kanji, word.kana);
  const seen = new Set([currentKey]);
  const related = word.characters.flatMap(wordsForKanji).filter((candidate) => {
    const key = wordKey(candidate.kanji, candidate.kana);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 18);

  const seenSentences = new Set<string>();
  const examples = word.characters.flatMap((char) => getKanji(char)?.sentences ?? []).filter((sentence) => {
    if (!sentence.jp.includes(word.kanji) || seenSentences.has(sentence.jp)) return false;
    seenSentences.add(sentence.jp);
    return true;
  }).slice(0, 4);

  return (
    <article className="word-page page">
      <section className="word-hero">
        <h1 lang="ja">{word.kanji}</h1>
        <p className="word-reading"><span lang="ja">{word.kana}</span> <span>{kanaToRomaji(word.kana)}</span></p>
        <p className="word-hero-meaning">{wordDisplayMeaning(word, language)}</p>
        {language === "es" ? <p className="muted">{t("word.translationNotice")}</p> : null}
        <Link className="btn" to={`/graph?kind=word&form=${encodeURIComponent(word.kanji)}&reading=${encodeURIComponent(word.kana)}`}>
          {t("word.graph")}
        </Link>
      </section>

      <section className="panel">
        <h2 className="panel-title">{t("word.kanji")}</h2>
        <div className="word-kanji-links">
          {word.characters.map((char) => {
            const kanji = getKanji(char);
            return <Link key={char} className="word-kanji-link" to={`/kanji/${char}`}>
              <span lang="ja">{char}</span><span>{kanjiPrimaryMeaning(kanji, language)}</span>
            </Link>;
          })}
        </div>
      </section>

      {examples.length ? <section className="panel">
        <h2 className="panel-title">{t("word.examples")}</h2>
        <ul className="sent-list">{examples.map((s) => <li key={s.jp} className="sent-item"><span lang="ja">{s.jp}</span><span lang="en">{s.en}</span></li>)}</ul>
      </section> : null}

      {related.length ? <section className="panel">
        <h2 className="panel-title">{t("word.related")}</h2>
        <div className="word-related-list">{related.map((other) => (
          <Link key={wordKey(other.kanji, other.kana)} to={wordUrl(other.kanji, other.kana)}>
            <span lang="ja">{other.kanji}</span><small lang="ja">{other.kana}</small><span>{wordDisplayMeaning(other, language)}</span>
          </Link>
        ))}</div>
      </section> : null}
    </article>
  );
}
