import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getKanji, radicalFor } from "@/lib/data";
import { getStrokes, roleMapFor, strokeGroups } from "@/lib/strokes";
import { phoneticSeriesFor } from "@/lib/keisei";
import { POSITION_DEFS, type ComponentRef } from "@/lib/types";
import type { ComponentRole, StrokesData } from "@/lib/types";
import StrokeSvg from "@/components/StrokeSvg";

type KanjiRecord = NonNullable<ReturnType<typeof getKanji>>;

export default function KanjiPage() {
  const { char } = useParams();
  const data = char ? getKanji(char) : undefined;
  if (!data) {
    return <NotFoundKanji char={char ?? ""} />;
  }
  return <KanjiPageLoaded data={data} />;
}

/**
 * Shared highlight + build-up orchestration for the hero SVG and the
 * component chips. Keys are canonical component characters (variantToKey
 * space, e.g. ⺅ → 人) so strokes and chips always agree.
 */
function KanjiPageLoaded({ data }: { data: KanjiRecord }) {
  const [strokes, setStrokes] = useState<StrokesData | null | undefined>(undefined);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [buildUp, setBuildUp] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const roles = useMemo(() => roleMapFor(data), [data]);

  useEffect(() => {
    let live = true;
    setStrokes(undefined);
    setHighlight(null);
    setActiveGroup(null);
    getStrokes(data.kanji).then((s) => {
      if (live) setStrokes(s);
    });
    return () => {
      live = false;
    };
  }, [data.kanji]);

  return (
    <article className="kanji-page page">
      {/* hover wins over the running group; derived value, no extra state */}
      <KanjiHero
        data={data}
        strokes={strokes}
        roles={roles}
        highlight={highlight ?? (buildUp ? activeGroup : null)}
        activeGroup={buildUp ? activeGroup : null}
        buildUp={buildUp}
        onBuildUpChange={setBuildUp}
        onGroupChange={setActiveGroup}
        onHoverKey={setHighlight}
      />
      <ComponentBreakdown
        data={data}
        highlightKey={highlight ?? (buildUp ? activeGroup : null)}
        onHoverKey={setHighlight}
      />
      <WordsPanel data={data} />
      <RelatedPanel data={data} />
    </article>
  );
}

function KanjiHero({
  data,
  strokes,
  roles,
  highlight,
  activeGroup,
  buildUp,
  onBuildUpChange,
  onGroupChange,
  onHoverKey,
}: {
  data: KanjiRecord;
  strokes: StrokesData | null | undefined;
  roles: Map<string, ComponentRole>;
  /** effective highlight: user hover (wins) or the running build-up group. */
  highlight: string | null;
  /** raw build-up progress key (null = idle/done), for the step strip. */
  activeGroup: string | null;
  buildUp: boolean;
  onBuildUpChange: (v: boolean) => void;
  onGroupChange: (key: string | null) => void;
  onHoverKey: (key: string | null) => void;
}) {
  return (
    <>
      <section className="kanji-hero">
        <div className="kanji-hero-char" lang="ja">
          {strokes ? (
            <StrokeSvg
              key={data.kanji}
              data={strokes}
              roles={roles}
              highlight={highlight}
              buildUp={buildUp}
              onBuildUpChange={onBuildUpChange}
              onGroupChange={onGroupChange}
            />
          ) : (
            <span>{data.kanji}</span>
          )}
        </div>
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
      {buildUp && strokes ? (
        <BuildUpSteps
          data={data}
          strokes={strokes}
          roles={roles}
          activeGroup={activeGroup}
          onHoverKey={onHoverKey}
        />
      ) : null}
    </>
  );
}

/** persistent build-up step strip: recipe preview, active accent, placed recap. */
function BuildUpSteps({
  data,
  strokes,
  roles,
  activeGroup,
  onHoverKey,
}: {
  data: KanjiRecord;
  strokes: StrokesData;
  roles: Map<string, ComponentRole>;
  activeGroup: string | null;
  onHoverKey: (key: string | null) => void;
}) {
  const groups = strokeGroups(strokes.strokes);
  const activeIdx = activeGroup ? groups.findIndex((g) => g.key === activeGroup) : -1;
  return (
    <div className="buildup-steps" aria-label="Component assembly steps" aria-live="polite">
      {groups.map((g, i) => {
        const c = data.components.find((k) => k.canonical === g.key);
        const pos = c?.position ? POSITION_DEFS[c.position] : null;
        // derived, no extra state: active step accent (.on); before it = placed
        // (inked); after it = upcoming (muted); no active group = full recipe.
        const state = activeIdx === -1 ? "" : i === activeIdx ? " on" : i < activeIdx ? "" : " muted";
        return (
          <span
            key={`${g.key}-${g.startNn}`}
            className={`step${state}`}
            title={`${c?.character ?? g.key}${c?.name ? ` · ${c.name}` : ""}${c?.meaning ? ` — ${c.meaning}` : ""}${pos ? ` · ${pos.ja} (${pos.en})` : ""} · strokes ${g.startNn}–${g.endNn}`}
            onMouseEnter={() => onHoverKey(g.key)}
            onMouseLeave={() => onHoverKey(null)}
          >
            <span className="step-n">{i + 1}</span>
            <span className={`step-char s-${roles.get(g.key) ?? "other"}`} lang="ja">
              {c?.character ?? g.key}
            </span>
            {c?.name ? <span className="step-name">{c.name}</span> : null}
            {i === activeIdx ? (
              <span className="step-range">strokes {g.startNn}–{g.endNn}</span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

function ComponentBreakdown({
  data,
  highlightKey,
  onHoverKey,
}: {
  data: KanjiRecord;
  highlightKey: string | null;
  onHoverKey: (key: string | null) => void;
}) {
  // discovery hook for the phonetic series: only for components that exist as
  // radicals.json entries (13 keisei canonicals have no radical page).
  const phon = data.components.find((c) => c.role === "phonetic");
  const series = phon ? phoneticSeriesFor(phon.canonical) : null;
  const hint = phon && series && radicalFor(phon.canonical);
  return (
    <section className="panel">
      <h2 className="panel-title">Component breakdown</h2>
      <div className="comp-chips">
        {data.components.map((c) => (
          <ComponentChip
            key={`${c.character}${c.canonical}`}
            c={c}
            lit={highlightKey === c.canonical}
            onHoverKey={onHoverKey}
          />
        ))}
      </div>
      {hint ? (
        <p className="phonetic-hint">
          Reading hint: <span lang="ja">{phon!.character}</span> is the phonetic
          here —{" "}
          <Link to={`/radical/${phon!.canonical}`}>
            the {phon!.character} series ({series!.members.length} kanji
            {series!.scoredCount
              ? `, ${series!.matchCount}/${series!.scoredCount} predictable`
              : ""}
            )
          </Link>
        </p>
      ) : null}
    </section>
  );
}

function ComponentChip({
  c,
  lit = false,
  onHoverKey,
}: {
  c: ComponentRef;
  lit?: boolean;
  onHoverKey?: (key: string | null) => void;
}) {
  return (
    <Link
      to={`/radical/${c.canonical}`}
      className={`comp-chip role-${c.role}${lit ? " lit" : ""}`}
      title={`${c.name || c.canonical} — ${c.meaning}${c.position ? ` · ${POSITION_DEFS[c.position].ja}` : ""}`}
      onMouseEnter={() => onHoverKey?.(c.canonical)}
      onMouseLeave={() => onHoverKey?.(null)}
      onFocus={() => onHoverKey?.(c.canonical)}
      onBlur={() => onHoverKey?.(null)}
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
