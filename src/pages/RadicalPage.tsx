import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getKanji, radicalFor } from "@/lib/data";
import { phoneticSeriesFor } from "@/lib/keisei";
import { POSITION_DEFS } from "@/lib/types";

const PAGE_SIZE = 60;

export default function RadicalPage() {
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
          <h1 className="radical-name">{data.name || "component"}</h1>
          {data.meaning ? <p className="radical-meaning">{data.meaning}</p> : null}
          <div className="kanji-badges">
            {data.number > 0 ? <span className="badge">Kangxi #{data.number}</span> : null}
            <span className="badge">{data.strokeCount} strokes</span>
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
          Reverse component tree
          <span className="panel-sub">every kanji that contains {data.character}</span>
        </h2>
        <div className="tree-controls">
          <button
            className={jōyōOnly ? "toggle on" : "toggle"}
            onClick={() => { setJōyōOnly((v) => !v); setLimit(PAGE_SIZE); }}
          >
            {jōyōOnly ? "dataset kanji only" : "all kanji"}
          </button>
          <Link className="btn" to={`/graph?kind=radical&kanji=${encodeURIComponent(data.character)}`}>
            Graph view
          </Link>
          <Link className="btn" to={`/practice?family=${encodeURIComponent(data.character)}`}>
            Practice family
          </Link>
        </div>
        <ul className="reverse-tree">
          {familyFiltered.slice(0, limit).map((k) => {
            const kd = getKanji(k);
            return (
              <li key={k} className="tree-item">
                <span className="tree-dash" aria-hidden>{"\u2514\u2500"}</span>
                <Link className="tree-kanji" to={`/kanji/${k}`} lang="ja">{k}</Link>
                {kd ? <span className="tree-sub">{kd.meanings[0]}{kd.jlpt ? ` · ${kd.jlpt}` : ""}</span> : null}
              </li>
            );
          })}
        </ul>
        {limit < familyFiltered.length ? (
          <button className="link-btn" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
            Show {Math.min(PAGE_SIZE, familyFiltered.length - limit)} more of {familyFiltered.length}
          </button>
        ) : (
          <p className="tree-count">{familyFiltered.length} kanji</p>
        )}
      </section>

      {series ? (
        <section className="panel reverse-tree-panel">
          <h2 className="panel-title">
            Phonetic series
            <span className="panel-sub">
              {series.key} is the sound-carrier in {series.members.length} kanji
              {series.scoredCount
                ? ` — predicts onyomi in ${series.matchCount}/${series.scoredCount}`
                : " — no on'yomi readings to score"}
            </span>
          </h2>
          <div className="tree-controls">
            <Link
              className="btn"
              to={`/graph?kind=radical&kanji=${encodeURIComponent(series.key)}`}
            >
              Graph view
            </Link>
            <Link className="btn" to={`/practice?series=${encodeURIComponent(series.key)}`}>
              Practice series
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
          <p className="tree-count">
            Match rule: exact onyomi or voiced readings (dakuten/handakuten)
          </p>
        </section>
      ) : null}
    </article>
  );
}

function NotFoundRadical({ char }: { char: string }) {
  return (
    <div className="notfound page">
      <div className="notfound-char" lang="ja">{char || "？"}</div>
      <p>{char ? "This radical is not in the dataset." : "No radical specified."}</p>
      <Link className="btn" to="/browse">Browse radicals</Link>
    </div>
  );
}
