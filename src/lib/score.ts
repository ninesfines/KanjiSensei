import type { StrokeRef } from "./types";

/**
 * Offline heuristic scoring for practice drawing (Frechet-lite):
 * the user's ink is compared stroke-by-stroke, in drawing order, against
 * the ideal KanjiVG stroke geometry. No ML — deterministic and explainable.
 *
 * The user's points arrive normalized 0..1 (canvas coords); everything is
 * evaluated in the 109-unit glyph box, so shapes align without any fitting.
 */

export const IDEAL_GRID = 109;
const SAMPLE_POINTS = 32;
/** mean point-to-point distance tolerance (≈10% of the glyph box). */
export const MEAN_TOL = 11;

export interface Pt {
  x: number;
  y: number;
}

export interface StrokeScore {
  matching: boolean;
  /** geometry right but drawn in reverse order — its own verdict label. */
  reversed: boolean;
  meanDist: number;
}

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** resample a polyline to n points evenly spaced by arc length. */
export function resample(pts: Pt[], n = SAMPLE_POINTS): Pt[] {
  if (pts.length === 0) return [];
  if (pts.length === 1) return Array(n).fill(pts[0]);
  const cum: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + dist(pts[i], pts[i - 1]));
  }
  const total = cum[cum.length - 1];
  if (total === 0) return Array(n).fill(pts[0]);
  const out: Pt[] = [];
  let seg = 0;
  for (let i = 0; i < n; i++) {
    const t = (total * i) / (n - 1);
    while (seg < cum.length - 2 && cum[seg + 1] < t) seg++;
    const segLen = cum[seg + 1] - cum[seg] || 1e-9;
    const frac = (t - cum[seg]) / segLen;
    out.push({
      x: pts[seg].x + (pts[seg + 1].x - pts[seg].x) * frac,
      y: pts[seg].y + (pts[seg + 1].y - pts[seg].y) * frac,
    });
  }
  return out;
}

/** sample an SVG path `d` into a polyline via a (transient) hidden DOM path. */
export function sampleIdealPath(d: string, n = SAMPLE_POINTS): Pt[] {
  if (typeof document === "undefined") return [];
  const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
  el.setAttribute("d", d);
  try {
    const len = el.getTotalLength();
    const pts: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const at = el.getPointAtLength((len * i) / (n - 1));
      pts.push({ x: at.x, y: at.y });
    }
    return pts;
  } catch {
    return [];
  } finally {
    el.remove();
  }
}

/** verdict of one stroke against one ideal polyline. */
export function scorePolyline(user: Pt[], ideal: Pt[]): StrokeScore {
  const a = resample(user);
  const b = resample(ideal);
  const dSam = dist(a[0], b[0]) + dist(a[a.length - 1], b[b.length - 1]);
  const dRev = dist(a[0], b[b.length - 1]) + dist(a[a.length - 1], b[0]);
  const reversed = dRev < dSam;
  const c = reversed ? [...b].reverse() : b;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += dist(a[i], c[i]);
  const meanDist = sum / a.length;
  return { matching: meanDist <= MEAN_TOL, reversed, meanDist };
}

/** score the user's normalized ink stroke against the ideal stroke. */
export function scoreStroke(userNorm: Pt[], stroke: StrokeRef): StrokeScore {
  const ideal = sampleIdealPath(stroke.d);
  if (!ideal.length) return { matching: false, reversed: false, meanDist: 99 };
  return scorePolyline(
    userNorm.map((p) => ({ x: p.x * IDEAL_GRID, y: p.y * IDEAL_GRID })),
    ideal,
  );
}

export type StrokeVerdict = "ok" | "reversed" | "off";

export function verdictOf(s?: StrokeScore | null): StrokeVerdict {
  if (!s || !s.matching) return "off";
  // right shape, wrong direction — its own verdict (direction is writing!)
  return s.reversed ? "reversed" : "ok";
}

/** every drawn stroke genuinely ok (exact shape + direction) — enables the
 *  knew-it suggestion pulse. Reversed strokes block it, by design. */
export function allScoresOk(scores: Array<StrokeScore | undefined>, expectedTotal: number): boolean {
  if (expectedTotal === 0 || scores.length < expectedTotal) return false;
  return scores.slice(0, expectedTotal).every((s) => verdictOf(s) === "ok");
}
