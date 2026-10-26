import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import StrokeSvg from "@/components/StrokeSvg";
import GlyphSvg from "@/components/GlyphSvg";
import PracticeCanvas from "@/components/PracticeCanvas";
import { getKana, kanaGrid } from "@/lib/kana";
import { getKanji, kanjiPrimaryMeaning, hasSpanishKanjiMeaning } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { roleMapFor } from "@/lib/strokes";
import { scoreStroke, verdictOf, allScoresOk } from "@/lib/score";
import type { StrokeScore, Pt as InkPt } from "@/lib/score";
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
  const { t } = useI18n();
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
    return <div className="page muted">{t("practice.loading")}</div>;
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
  { id: "hiragana", sample: "あ" },
  { id: "katakana", sample: "ア" },
] as const;

function Landing() {
  const navigate = useNavigate();
  const [jump, setJump] = useState("");
  const { t } = useI18n();
  return (
    <article className="practice-page page">
      <header className="page-head">
        <h1>{t("practice.title")}</h1>
        <p className="muted">{t("practice.intro")}</p>
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
          placeholder={t("practice.jumpPlaceholder")}
          aria-label={t("practice.jumpLabel")}
        />
        <button type="submit">{t("practice.start")}</button>
      </form>

      <div className="practice-cards">
        {KANA_DECKS.map((d) => (
          <Link key={d.id} className="practice-card" to={`/practice?kana=${d.id}&all=1`}>
            <span className="practice-card-char" lang="ja">{d.sample}</span>
            <span className="practice-card-label">{t(d.id === "hiragana" ? "practice.hiragana" : "practice.katakana")}</span>
            <span className="practice-card-note">{t(d.id === "hiragana" ? "practice.hiraganaNote" : "practice.katakanaNote")}</span>
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
        <summary>{t("practice.hiragana")} — {t("practice.jumpLabel")}</summary>
        <KanaPicker kind="hiragana" />
      </details>
      <details className="practice-details">
        <summary>{t("practice.katakana")} — {t("practice.jumpLabel")}</summary>
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
  const { language, t } = useI18n();
  const item = session.queue[session.index];
  const [clearNonce, setClearNonce] = useState(0);
  const [undoNonce, setUndoNonce] = useState(0);
  const [ghost, setGhost] = useState(false);
  const [hint, setHint] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [drawn, setDrawn] = useState(0);
  const [strokeScores, setStrokeScores] = useState<Array<StrokeScore | undefined>>([]);
  const overdrawn = drawn > item.strokes.length;

  // per-glyph reset when the queue advances: scores clear; hint/reveal clear
  // (they'd spoil the next glyph); ghost persists (passive underlay)
  useEffect(() => {
    setStrokeScores([]);
    setHint(false);
    setReveal(false);
  }, [item.char, session.index]);

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
        <h1>{t("practice.title")}</h1>
        <p className="muted">
          {t("practice.progress", { current: session.index + 1, total: session.queue.length })}
        </p>
      </header>
      <section className="panel practice-panel">
        <div className="practice-info">
          <span className="practice-char" lang="ja">{item.char}</span>
          <span className="practice-meta">
            {item.kind === "kana" ? (getKana(item.char)?.romaji || "") : (
              <>
                <span lang={language === "es" && record && !hasSpanishKanjiMeaning(record) ? "en" : language}>
                  {kanjiPrimaryMeaning(record, language) || ""}
                </span>
                {language === "es" && record && !hasSpanishKanjiMeaning(record) ? ` · ${t("content.englishLabel")}` : ""}
              </>
            )}
            {" · "}
            {t("kanji.strokeCount", { count: item.strokes.length })}
          </span>
        </div>
        <div className="practice-model">
          <StrokeSvg key={item.char} data={{ kanji: item.char, strokes: item.strokes }} roles={roles} />
        </div>
        <div className="practice-stage">
          {ghost ? <GlyphSvg strokes={item.strokes} opacity={0.14} /> : null}
          <PracticeCanvas
            key={`${item.char}-${session.index}`}
            clearNonce={clearNonce}
            undoNonce={undoNonce}
            onStrokeCountChange={setDrawn}
            onStrokeEnd={(ink: InkPt[][]) => {
              const idx = ink.length - 1; // finalized stroke — pair with expected in order
              const score = scoreStroke(ink[idx] ?? [], item.strokes[idx]);
              if (!score) return;
              setStrokeScores((prev) => {
                const cp = [...prev];
                cp[idx] = score;
                return cp;
              });
            }}
          />
          {hint ? <GlyphSvg strokes={item.strokes} limit={hintLimit} opacity={0.4} /> : null}
          {reveal ? <GlyphSvg strokes={item.strokes} opacity={0.85} /> : null}
        </div>
        <div className="practice-ctl">
          <button type="button" onClick={() => setUndoNonce((n) => n + 1)}>{t("practice.undo")}</button>
          <button type="button" onClick={() => setClearNonce((n) => n + 1)}>{t("practice.clear")}</button>
          <span className={`practice-count${overdrawn ? " over" : ""}`}>
            {drawn} / {item.strokes.length} {t("unit.strokes")}
          </span>
          <span className="practice-verdicts" aria-label={t("practice.verdicts")}>
            {strokeScores.map((sc, i) =>
              i < drawn ? (
                <em key={i} className={`v-${verdictOf(sc)}`}>{i + 1}</em>
              ) : null,
            )}
          </span>
          <span className="ctl-sep" aria-hidden />
          <button type="button" className={ghost ? "on" : ""} onClick={() => setGhost((v) => !v)}>{t("practice.ghost")}</button>
          <button type="button" className={hint ? "on" : ""} onClick={() => setHint((v) => !v)}>{t("practice.hint")}</button>
          <button type="button" className={reveal ? "on" : ""} onClick={() => setReveal((v) => !v)}>{t("practice.reveal")}</button>
          <span className="ctl-sep" aria-hidden />
          <button type="button" className={`good${allScoresOk(strokeScores, item.strokes.length) ? " pulse" : ""}`} onClick={knewIt}>{t("practice.knew")}</button>
          <button type="button" className="bad" onClick={retry}>{t("practice.retry")}</button>
          <button type="button" onClick={skip}>{t("practice.skip")}</button>
        </div>
      </section>
      <p className="practice-back">
        <Link to="/practice">{t("practice.backDecks")}</Link>
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
  const { t } = useI18n();
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
        <h1>{t("practice.recap")}</h1>
        <p className="muted">
          {t("practice.summary", { total: session.queue.length, good, retry, skipped })}
        </p>
      </header>
      <div className="practice-grid recap">
        {session.queue.map((q: PracticeItem, i: number) => {
          const mark = session.results.get(q.char);
          const body = (
            <>
              <span className="g" lang="ja">{q.char}</span>
              <span className="rom">{mark === "good" ? t("practice.knewShort") : mark === "retry" ? t("practice.retryShort") : t("practice.skipped")}</span>
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
          {t("practice.again")}
        </button>
        <button type="button" onClick={() => setSession(buildSession(session.queue))}>
          {t("practice.newSession")}
        </button>
        {retries.length ? (
          <button type="button" className="bad" onClick={repractice} disabled={retrying}>
            {retrying ? t("practice.loadingShort") : t("practice.repractice", { count: retries.length })}
          </button>
        ) : null}
      </div>
      <p className="practice-back">
        <Link to="/practice">{t("practice.backDecks")}</Link>
      </p>
    </article>
  );
}
