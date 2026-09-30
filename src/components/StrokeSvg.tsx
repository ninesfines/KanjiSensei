import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentRole, StrokesData } from "@/lib/types";
import { ROOT_GROUP_KEY, strokeCanonical, strokeGroups } from "@/lib/strokes";

interface Props {
  data: StrokesData;
  /** role by canonical component key (from roleMapFor). */
  roles: Map<string, ComponentRole>;
  /** canonical component key to keep lit while dimming the rest. */
  highlight?: string | null;
  /** build-up mode: animate component group by component group. */
  buildUp?: boolean;
  onBuildUpChange?: (v: boolean) => void;
  /** fires per build-up group start; null when the run (or mode) ends. */
  onGroupChange?: (key: string | null) => void;
}

/** sequential gap between strokes (ms) and target total ink time at 1×. */
const GAP_MS = 40;
const TOTAL_MS = 1400;
const MIN_STROKE_MS = 110;
const MAX_STROKE_MS = 650;
const GROUP_GAP_MS = 260;

const SPEEDS = [0.5, 1, 2] as const;

interface TimedStroke {
  durMs: number;
  delayMs: number;
}

interface GroupStart {
  key: string;
  atMs: number;
}

export default function StrokeSvg({
  data,
  roles,
  highlight = null,
  buildUp = false,
  onBuildUpChange,
  onGroupChange,
}: Props) {
  const [speed, setSpeed] = useState(1);
  const [runId, setRunId] = useState(0);
  const [lens, setLens] = useState<number[] | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const pathRefs = useRef<Array<SVGPathElement | null>>([]);
  const timersRef = useRef<number[]>([]);
  const reduceMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  // measure stroke lengths after paths are in the DOM
  useEffect(() => {
    setLens(
      data.strokes.map((_, i) => {
        try {
          return pathRefs.current[i]?.getTotalLength() ?? 0;
        } catch {
          return 0;
        }
      }),
    );
  }, [data]);

  const timing = useMemo(() => {
    if (!lens || lens.length !== data.strokes.length) return null;
    const gap = GAP_MS / speed;
    const budget = Math.max(400, TOTAL_MS / speed - Math.max(0, lens.length - 1) * gap);
    const total = lens.reduce((a, b) => a + b, 0);
    const scale = total > 0 ? budget / total : 1;
    const durOf = (i: number) => clamp(lens[i] * scale, MIN_STROKE_MS, MAX_STROKE_MS);
    const timed: TimedStroke[] = [];
    const groupStarts: GroupStart[] = [];
    let t = 0;
    if (buildUp) {
      // groups come from the shared helper (same on-disk run logic as the label)
      const groups = strokeGroups(data.strokes);
      let idx = 0;
      let groupEnd = 0;
      for (let gi = 0; gi < groups.length; gi++) {
        const atMs = gi === 0 ? 0 : groupEnd + GROUP_GAP_MS;
        groupStarts.push({ key: groups[gi].key, atMs });
        t = atMs;
        while (
          idx < data.strokes.length &&
          strokeCanonical(data.strokes[idx].element || ROOT_GROUP_KEY) === groups[gi].key
        ) {
          const durMs = durOf(idx);
          timed.push({ durMs, delayMs: t });
          t += durMs + gap;
          idx++;
        }
        const last = timed[timed.length - 1];
        groupEnd = last.delayMs + last.durMs;
      }
    } else {
      for (let i = 0; i < data.strokes.length; i++) {
        timed.push({ durMs: durOf(i), delayMs: t });
        t += durOf(i) + gap;
      }
    }
    return { timed, groupStarts };
  }, [data, lens, speed, buildUp]);

  // run: reset offsets, then transition them to 0; schedule group callbacks
  useEffect(() => {
    if (!timing) return;
    clearTimers(timersRef);
    if (reduceMotion) {
      setRunning(false);
      setDone(false);
      onGroupChange?.(null);
      return;
    }
    setRunning(false);
    setDone(false);
    for (const g of timing.groupStarts) {
      if (g.atMs === 0) {
        onGroupChange?.(g.key);
      } else {
        timersRef.current.push(window.setTimeout(() => onGroupChange?.(g.key), g.atMs));
      }
    }
    const end = Math.max(...timing.timed.map((x) => x.delayMs + x.durMs)) + 80;
    timersRef.current.push(
      window.setTimeout(() => {
        setDone(true);
        onGroupChange?.(null);
      }, end),
    );
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setRunning(true)));
    return () => {
      cancelAnimationFrame(raf);
      clearTimers(timersRef);
    };
  }, [timing, runId, reduceMotion]);

  useEffect(() => () => clearTimers(timersRef), [data.kanji]);

  return (
    <div className="stroke-wrap">
      <svg
        className={`stroke-svg${done ? " done" : ""}`}
        viewBox="0 0 109 109"
        role="img"
        aria-label={`Stroke order for ${data.kanji}`}
      >
        {data.strokes.map((s, i) => {
          const key = strokeCanonical(s.element || ROOT_GROUP_KEY);
          // dim follows explicit hover in BOTH modes now; activeGroup never
          // touches the SVG (progression accents live on the strip/chips)
          const dim = highlight !== null && key !== highlight;
          const tm = timing?.timed[i];
          return (
            <path
              key={s.nn}
              d={s.d}
              ref={(el) => {
                pathRefs.current[i] = el;
              }}
              className={`stroke s-${roles.get(key) ?? "other"}${dim ? " dim" : ""}`}
              style={pathStyle(
                lens?.[i] ?? 0,
                tm?.durMs ?? 0,
                tm?.delayMs ?? 0,
                running,
                reduceMotion,
              )}
              visibility={lens ? undefined : "hidden"}
            />
          );
        })}
      </svg>
      {!reduceMotion && (
        <div className="stroke-ctl">
          {onBuildUpChange && (
            <span className="stroke-mode" role="group" aria-label="Animation mode">
              <button
                className={`stroke-btn${!buildUp ? " on" : ""}`}
                aria-pressed={!buildUp}
                onClick={() => onBuildUpChange(false)}
              >
                strokes
              </button>
              <button
                className={`stroke-btn${buildUp ? " on" : ""}`}
                aria-pressed={buildUp}
                onClick={() => onBuildUpChange(true)}
              >
                components
              </button>
            </span>
          )}
          <span className="ctl-sep" aria-hidden />
          <button className="stroke-btn" onClick={() => setRunId((v) => v + 1)}>
            ↻ replay
          </button>
          <span className="ctl-sep" aria-hidden />
          {SPEEDS.map((sp) => (
            <button
              key={sp}
              className={`stroke-btn${speed === sp ? " on" : ""}`}
              onClick={() => {
                if (sp !== speed) {
                  setSpeed(sp);
                  setRunId((v) => v + 1);
                }
              }}
            >
              {sp}×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function pathStyle(
  pathLen: number,
  durMs: number,
  delayMs: number,
  running: boolean,
  reduceMotion: boolean,
): React.CSSProperties {
  if (reduceMotion || !pathLen) return {};
  if (!running) {
    // full offset, no transition — reset pose
    return { strokeDasharray: pathLen, strokeDashoffset: pathLen, transition: "none" };
  }
  return {
    strokeDasharray: pathLen,
    strokeDashoffset: 0,
    transition: `stroke-dashoffset ${durMs}ms linear ${delayMs}ms`,
  };
}

function clearTimers(ref: { current: number[] }) {
  for (const id of ref.current) window.clearTimeout(id);
  ref.current = [];
}

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}
