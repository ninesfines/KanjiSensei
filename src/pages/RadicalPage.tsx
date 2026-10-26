import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getKanji, radicalFor, radicalMeaning, kanjiPrimaryMeaning, hasSpanishKanjiMeaning } from "@/lib/data";
import { phoneticSeriesFor } from "@/lib/keisei";
import { POSITION_DEFS } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

const PAGE_SIZE = 60;

export default function RadicalPage() {
  const { language, t } = useI18n();
  const { char } = useParams();
  const data = char ? radicalFor(char) : undefined;
  const [jōyōOnly, setJōyōOnly] = useState(true);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const familyFiltered = useMemo(() => {
    if (!data) return [];
    if (!jōyōOnly) return data.kanji;
    return data.kanji.filter((k) => Boolean(getKanji(k)));
  }, [data, jōyōOnly]);

  const series = useMemo(() => (data ? phoneticSeriesFor(data.character) : null), [data]);

  if (!data) {
    return <NotFoundRadical char={char ?? ""} />;
  }

  return (
    <article className="radical-page page">
      <section className="radical-hero">
        <div className="radical-hero-char" lang="ja">{data.variant || data.character}</div>
        <div className="radical-hero-side">
          <h1 className="radical-name">{data.name || t("radical.component")}</h1>
          {data.meaning ? <p className="radical-meaning">{radicalMeaning(data, language)}</p> : null}
          <div className="kanji-badges">
            {data.number > 0 ? <span className="badge">{t("radical.kangxi", { number: data.number })}</span> : null}
            <span className="badge">{t("radical.strokeCount", { count: data.strokeCount })}</span>
            {data.position ? (
              <span className="badge pos">
                {POSITION_DEFS[data.position].ja} · {POSITION_DEFS[data.position].en}
              </span>
            ) : null}
          </div>
          {data.names.length > 1 ? (
            <p className="radical-alt-names">{data.names.filter((n) => n !== data.name).join(", ")}</p>
          ) : null}
        </div>
      </section>

      <section className="panel reverse-tree-panel">
        <h2 className="panel-title">
          {t("radical.treeTitle")}
          <span className="panel-sub">{t("radical.allKanji", { char: data.character })}</span>
        </h2>
        <div className="tree-controls">
          <button
            className={jōyōOnly ? "toggle on" : "toggle"}
            onClick={() => { setJōyōOnly((v) => !v); setLimit(PAGE_SIZE); }}
          >
            {jōyōOnly ? t("radical.datasetOnly") : t("radical.all")}
          </button>
          <Link className="btn" to={`/graph?kind=radical&kanji=${encodeURIComponent(data.character)}`}>
            {t("radical.graphView")}
          </Link>
          <Link className="btn" to={`/practice?family=${encodeURIComponent(data.character)}`}>
            {t("radical.practiceFamily")}
          </Link>
        </div>
        <ul className="reverse-tree">
          {familyFiltered.slice(0, limit).map((k) => {
            const kd = getKanji(k);
            return (
              <li key={k} className="tree-item">
                <span className="tree-dash" aria-hidden>{"\u2514\u2500"}</span>
                <Link className="tree-kanji" to={`/kanji/${k}`} lang="ja">{k}</Link>
                {kd ? <span className="tree-sub">
                  <span lang={language === "es" && !hasSpanishKanjiMeaning(kd) ? "en" : language}>
                    {kanjiPrimaryMeaning(kd, language)}
                  </span>
                  {language === "es" && !hasSpanishKanjiMeaning(kd) ? ` · ${t("content.englishLabel")}` : ""}
                  {kd.jlpt ? ` · ${kd.jlpt}` : ""}
                </span> : null}
              </li>
            );
          })}
        </ul>
        {limit < familyFiltered.length ? (
          <button className="link-btn" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
            {t("radical.showMore", { count: Math.min(PAGE_SIZE, familyFiltered.length - limit), total: familyFiltered.length })}
          </button>
        ) : (
          <p className="tree-count">{t("radical.kanjiCount", { count: familyFiltered.length })}</p>
        )}
      </section>

      {series ? (
        <section className="panel reverse-tree-panel">
          <h2 className="panel-title">
            {t("radical.phoneticSeries")}
            <span className="panel-sub">
              {t("radical.soundCarrier", { key: series.key, count: series.members.length })}
              {series.scoredCount
                ? t("radical.predicts", { matches: series.matchCount, scored: series.scoredCount })
                : t("radical.noOn")}
            </span>
          </h2>
          <div className="tree-controls">
            <Link
              className="btn"
              to={`/graph?kind=radical&kanji=${encodeURIComponent(series.key)}`}
            >
              {t("radical.graphView")}
            </Link>
            <Link className="btn" to={`/practice?series=${encodeURIComponent(series.key)}`}>
              {t("radical.practiceSeries")}
            </Link>
          </div>
          <ul className="reverse-tree">
            {series.members.map((m) => (
              <li key={m.kanji} className="tree-item">
                <span className="tree-dash" aria-hidden>{"\u2514\u2500"}</span>
                <Link className="tree-kanji" to={`/kanji/${m.kanji}`} lang="ja">{m.kanji}</Link>
                <span className="tree-sub">
                  {m.onyomi.length ? (
                    <span className={`tree-onyomi${m.matches ? " match" : " outlier"}`}>
                      {m.onyomi.join(" / ")}
                      {m.matches ? "" : " ≠"}
                    </span>
                  ) : (
                    <span className="tree-onyomi">—</span>
                  )}
                  {m.jlpt ? ` · ${m.jlpt}` : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="tree-count">{t("radical.matchRule")}</p>
        </section>
      ) : null}
    </article>
  );
}

function NotFoundRadical({ char }: { char: string }) {
  const { t } = useI18n();
  return (
    <div className="notfound page">
      <div className="notfound-char" lang="ja">{char || "？"}</div>
      <p>{char ? t("radical.missing") : t("radical.none")}</p>
      <Link className="btn" to="/browse">{t("radical.browse")}</Link>
    </div>
  );
}
