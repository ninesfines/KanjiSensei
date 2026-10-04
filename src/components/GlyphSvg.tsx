import type { StrokeRef } from "@/lib/types";

interface Props {
  strokes: StrokeRef[];
  /** render only the first N strokes (the "show me the next stroke" hint). */
  limit?: number;
  /** layer opacity — dim ghost, hint, or strong reveal. */
  opacity?: number;
}

/** dumb static glyph layer for practice overlays (no animation logic). */
export default function GlyphSvg({ strokes, limit, opacity = 0.15 }: Props) {
  const shown = limit ? strokes.slice(0, limit) : strokes;
  return (
    <svg className="glyph-svg" viewBox="0 0 109 109" style={{ opacity }} aria-hidden="true">
      {shown.map((s) => (
        <path key={s.nn} d={s.d} />
      ))}
    </svg>
  );
}
