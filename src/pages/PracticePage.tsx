import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import StrokeSvg from "@/components/StrokeSvg";
import GlyphSvg from "@/components/GlyphSvg";
import PracticeCanvas from "@/components/PracticeCanvas";
import { getKana, kanaGrid, kanaList } from "@/lib/kana";
import { getKanji } from "@/lib/data";
import { roleMapFor } from "@/lib/strokes";
import type { PracticeItem } from "@/lib/types";
import type { KanjiData, KanaData } from "@/lib/types";
import {
  type PracticeSession,
  sessionFromParams,
  paramsTargetSession,
  markGood,
  markRetry,
  buildSession,
  fromChars,
  sessionStats,
  retryChars,
} from "@/lib/practice";

export default function PracticePage() {
  const [params] = useSearchParams();
  const [session, setSession] = useState<PracticeSession | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    setSession(undefined); // undefined = building (only when params target a session)
    sessionFromParams(params).then((s) => {
      if (live) setSession(s);
    });
    return () => {
      live = false;
    };
  }, [params]);

  if (session === undefined && paramsTargetSession(params)) {
    return <div className="page muted">Loading practice…</div>;
  }
  if (session === null || session === undefined) {
    return <Landing />;
  }
  if (session.index >= session.queue.length) {
    return <Recap session={session} setSession={setSession} />;
  }
  return <Studio session={session} setSession={setSession} />;
}

/* ------------------------------- landing --------------------------------- */

const KANA_DECKS = [
  { id: "hiragana", sample: "あ", title: "Hiragana deck", note: "all hiragana incl. voiced forms" },
  { id: "katakana", sample: "ア", title: "Katakana deck", note: "all katakana incl. voiced forms" },
] as const;

function Landing() {
  const navigate = useNavigate();
  const [jump, setJump] = useState("");
  return (
    <article className="practice-page page">
      <header className="page-head">
        <h1>Practice</h1>
        <p className="muted">
          Draw the strokes you see the model write. Finger on the phone, mouse on the desk both work.
        </p>
      </header>
      <form
        className="practice-jump"
        onSubmit={(e) => {
          e.preventDefault();
          const v = jump.trim();
          if (v) navigate(`/practice?char=${encodeURIComponent(v)}`);
        }}
      >
        <input
          value={jump}
          onChange={(e) => setJump(e.target.value)}
          placeholder="Jump to a glyph: マ, ma, 家…"
          aria-label="Jump to a glyph"
        />
        <button type="submit">practice →</button>
      </form>

      <div className="practice-cards">
        {KANA_DECKS.map((d) => (
          <Link key={d.id} className="practice-card" to={`/practice?kana=${d.id}&all=1`}>
            <span className="practice-card-char" lang="ja">{d.sample}</span>
            <span className="practice-card-label">{d.title}</span>
            <span className="practice-card-note">{kanaDeckCount(d.id as "hiragana" | "katakana")} glyphs</span>
          </Link>
        ))}
      </div>

      <div className="practice-jlpt">
        {(["N5", "N4", "N3", "N2", "N1"] as const).map((lvl) => (
          <Link key={lvl} className="btn" to={`/practice?jlpt=${lvl}`}>
            {lvl}
          </Link>
        ))}
      </div>

      <details className="practice-details">
        <summary>Hiragana grid — tap a glyph to practice just that one</summary>
        <KanaPicker kind="hiragana" />
      </details>
      <details className="practice-details">
        <summary>Katakana grid — tap a glyph to practice just that one</summary>
        <KanaPicker kind="katakana" />
      </details>
    </article>
  );
}

function KanaPicker({ kind }: { kind: "hiragana" | "katakana" }) {
  const grid = kanaGrid(kind);
  const rows = [
    { glyphs: grid.base, cls: "" },
    { glyphs: grid.daku, cls: " daku" },
    { glyphs: grid.small, cls: " smallish" },
  ];
  return (
    <div className="practice-grid">
      {rows.map((r) =>
        r.glyphs.map((k: KanaData) => (
          <Link
            key={k.char}
            className={`practice-cell${r.cls}${k.romaji ? "" : " no-rom"}`}
            to={`/practice?char=${encodeURIComponent(k.char)}`}
          >
            <span className="g" lang="ja">{k.char}</span>
            <span className="rom">{k.romaji}</span>
          </Link>
        )),
      )}
    </div>
  );
}

/* ------------------------------- studio ---------------------------------- */

function Studio({
  session,
  setSession,
}: {
  session: PracticeSession;
  setSession: React.Dispatch<React.SetStateAction<PracticeSession | null | undefined>>;
}) {
  const item = session.queue[session.index];
  const [clearNonce, setClearNonce] = useState(0);
  const [undoNonce, setUndoNonce] = useState(0);
  const [ghost, setGhost] = useState(false);
  const [hint, setHint] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [drawn, setDrawn] = useState(0);
  const overdrawn = drawn > item.strokes.length;

  const knewIt = () => setSession(markGood(session, item.char));
  const retry = () => {
    setSession(markRetry(session, item.char));
    setClearNonce((n) => n + 1); // fresh attempt, same glyph
  };
  const skip = () =>
    setSession((s) => (s ? { ...s, index: s.index + 1 } : s));

  const record: KanjiData | undefined = item.kind === "kanji" ? getKanji(item.char) : undefined;
  const roles = record ? roleMapFor(record) : new Map();
  const hintLimit = Math.min(drawn + 1, item.strokes.length);

  return (
    <article className="practice-page page">
      <header className="page-head">
        <h1>Practice</h1>
        <p className="muted">
          Glyph {session.index + 1} of {session.queue.length} — draw stroke by stroke, then reveal.
        </p>
      </header>
      <section className="panel practice-panel">
        <div className="practice-info">
          <span className="practice-char" lang="ja">{item.char}</span>
          <span className="practice-meta">
            {item.kind === "kana" ? (getKana(item.char)?.romaji || "") : (record?.meanings[0] || "")}
            {" · "}
            {item.strokes.length} strokes
          </span>
        </div>
        <div className="practice-model">
          <StrokeSvg key={item.char} data={{ kanji: item.char, strokes: item.strokes }} roles={roles} />
        </div>
        <div className="practice-stage">
          {ghost ? <GlyphSvg strokes={item.strokes} opacity={0.14} /> : null}
          <PracticeCanvas
            model={item.strokes}
            clearNonce={clearNonce}
            undoNonce={undoNonce}
            onStrokeCountChange={setDrawn}
          />
          {hint ? <GlyphSvg strokes={item.strokes} limit={hintLimit} opacity={0.4} /> : null}
          {reveal ? <GlyphSvg strokes={item.strokes} opacity={0.85} /> : null}
        </div>
        <div className="practice-ctl">
          <button type="button" onClick={() => setUndoNonce((n) => n + 1)}>↶ undo</button>
          <button type="button" onClick={() => setClearNonce((n) => n + 1)}>clear</button>
          <span className={`practice-count${overdrawn ? " over" : ""}`}>
            {drawn} of {item.strokes.length} strokes
          </span>
          <span className="ctl-sep" aria-hidden />
          <button type="button" className={ghost ? "on" : ""} onClick={() => setGhost((v) => !v)}>ghost</button>
          <button type="button" className={hint ? "on" : ""} onClick={() => setHint((v) => !v)}>hint</button>
          <button type="button" className={reveal ? "on" : ""} onClick={() => setReveal((v) => !v)}>reveal</button>
          <span className="ctl-sep" aria-hidden />
          <button type="button" className="good" onClick={knewIt}>✓ knew it</button>
          <button type="button" className="bad" onClick={retry}>↻ try again</button>
          <button type="button" onClick={skip}>skip →</button>
        </div>
      </section>
      <p className="practice-back">
        <Link to="/practice">← back to decks</Link>
      </p>
    </article>
  );
}

/* -------------------------------- recap ---------------------------------- */

function Recap({
  session,
  setSession,
}: {
  session: PracticeSession;
  setSession: React.Dispatch<React.SetStateAction<PracticeSession | null | undefined>>;
}) {
  const [retrying, setRetrying] = useState(false);
  const { good, retry, skipped } = sessionStats(session);
  const retries = retryChars(session);
  const repractice = async () => {
    setRetrying(true);
    const next = await fromChars(retries);
    setRetrying(false);
    if (next.queue.length) setSession(next);
  };
  return (
    <article className="practice-page page">
      <header className="page-head">
        <h1>Session complete</h1>
        <p className="muted">
          {session.queue.length} glyphs — ✓ {good} knew it · ↻ {retry} retried · {skipped} skipped
        </p>
      </header>
      <div className="practice-grid recap">
        {session.queue.map((q: PracticeItem, i: number) => {
          const mark = session.results.get(q.char);
          const body = (
            <>
              <span className="g" lang="ja">{q.char}</span>
              <span className="rom">{mark === "good" ? "✓ knew" : mark === "retry" ? "↻ retry" : "skipped"}</span>
            </>
          );
          return q.kind === "kanji" ? (
            <Link key={`${q.char}-${i}`} className={`practice-cell ${mark ?? ""}`} to={`/kanji/${q.char}`}>
              {body}
            </Link>
          ) : (
            <span key={`${q.char}-${i}`} className={`practice-cell ${mark ?? ""}`}>
              {body}
            </span>
          );
        })}
      </div>
      <div className="practice-ctl">
        <button type="button" onClick={() => setSession({ ...session, index: 0, results: new Map() })}>
          ↻ restart same order
        </button>
        <button type="button" onClick={() => setSession(buildSession(session.queue))}>
          ⤨ reshuffle new session
        </button>
        {retries.length ? (
          <button type="button" className="bad" onClick={repractice} disabled={retrying}>
            {retrying ? "loading…" : `↻ re-practice the ${retries.length} retries`}
          </button>
        ) : null}
      </div>
      <p className="practice-back">
        <Link to="/practice">← back to decks</Link>
      </p>
    </article>
  );
}

/* count in kana.json of a kana kind's glyphs (grid-note display) */
function kanaDeckCount(kind: "hiragana" | "katakana"): string {
  return String(
    kanaList.filter((k) => k.kind === kind && k.char.length === 1).length,
  );
}
