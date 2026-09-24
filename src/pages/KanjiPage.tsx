import { Link, useParams } from "react-router-dom";
import { getKanji } from "@/lib/data";
import { POSITION_DEFS, type ComponentRef } from "@/lib/types";

type KanjiRecord = NonNullable<ReturnType<typeof getKanji>>;

export default function KanjiPage() {
  const { char } = useParams();
  const data = char ? getKanji(char) : undefined;
  if (!data) {
    return <NotFoundKanji char={char ?? ""} />;
  }
  return (
    <article className="kanji-page page">
      <KanjiHero data={data} />
      <ComponentBreakdown data={data} />
      <WordsPanel data={data} />
      <RelatedPanel data={data} />
    </article>
  );
}

function KanjiHero({ data }: { data: KanjiRecord }) {
  return (
    <section className="kanji-hero">
      <div className="kanji-hero-char" lang="ja">{data.kanji}</div>
      <div className="kanji-hero-side">
        <h1 className="kanji-meaning">{data.meanings[0] ?? "—"}</h1>
        <div className="kanji-badges">
          {data.jlpt ? <span className="badge jlpt">{data.jlpt}</span> : null}
          {data.grade ? <span className="badge">grade {data.grade}</span> : null}
          {data.freq ? <span className="badge"># {data.freq}</span> : null}
          <span className="badge">{data.strokeCount} strokes</span>
        </div>
        <div className="reading-group">
          <span className="reading-label">On’yomi</span>
          <div className="reading-chips">
            {data.onyomi.length ? (
              data.onyomi.map((r) => <span key={r} className="chip on">{r}</span>)
            ) : <span className="muted">—</span>}
          </div>
        </div>
        <div className="reading-group">
          <span className="reading-label">Kun’yomi</span>
          <div className="reading-chips">
            {data.kunyomi.length ? (
              data.kunyomi.map((r) => <span key={r} className="chip kun">{r}</span>)
            ) : <span className="muted">—</span>}
          </div>
        </div>
        {data.meanings.length > 1 ? (
          <p className="extra-meanings">{data.meanings.slice(1).join(", ")}</p>
        ) : null}
      </div>
    </section>
  );
}

function ComponentBreakdown({ data }: { data: KanjiRecord }) {
  return (
    <section className="panel">
      <h2 className="panel-title">Component breakdown</h2>
      <div className="comp-chips">
        {data.components.map((c) => (
          <ComponentChip key={`${c.character}${c.canonical}`} c={c} />
        ))}
      </div>
    </section>
  );
}

function ComponentChip({ c }: { c: ComponentRef }) {
  return (
    <Link
      to={`/radical/${c.canonical}`}
      className={`comp-chip role-${c.role}`}
      title={`${c.name || c.canonical} — ${c.meaning}${c.position ? ` · ${POSITION_DEFS[c.position].ja}` : ""}`}
    >
      <span className="comp-char" lang="ja">{c.character}</span>
      <span className="comp-name">{c.name || c.canonical}</span>
      <span className="comp-mean">{c.meaning || "—"}</span>
      <span className="comp-pos">
        {c.position ? `${POSITION_DEFS[c.position].ja} (${POSITION_DEFS[c.position].en})` : "component"}
      </span>
    </Link>
  );
}

function WordsPanel({ data }: { data: KanjiRecord }) {
  return (
    <section className="panel">
      <h2 className="panel-title">Common words & examples</h2>
      <ul className="word-list">
        {data.words.map((w) => (
          <li key={`${w.kanji}|${w.kana}`} className="word-item">
            <span className="word-kanji" lang="ja">{w.kanji}</span>
            <span className="word-kana">{w.kana}</span>
            <span className="word-meaning">{w.meaning}</span>
          </li>
        ))}
      </ul>
      <ul className="sent-list">
        {data.sentences.map((s, i) => (
          <li key={`sent-${i}`} className="sent-item">
            <span className="sent-jp" lang="ja">{s.jp}</span>
            <span className="sent-en">{s.en}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RelatedPanel({ data }: { data: KanjiRecord }) {
  return (
    <section className="panel">
      <h2 className="panel-title">Explore related</h2>
      <div className="btn-row">
        <Link className="btn" to={`/graph?kind=kanji&kanji=${encodeURIComponent(data.kanji)}`}>
          Relationship graph
        </Link>
        {data.radical?.character ? (
          <Link className="btn" to={`/radical/${data.radical.character}`}>
            Radical family: {data.radical.character}（{data.radical.name}）
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function NotFoundKanji({ char }: { char: string }) {
  return (
    <div className="notfound page">
      <div className="notfound-char" lang="ja">{char || "？"}</div>
      <p>{char ? "This kanji is not in the dataset." : "No kanji specified."}</p>
      <Link className="btn" to="/">Back home</Link>
    </div>
  );
}
