import { useEffect, useRef, useState } from "react";
import { getStrokes } from "@/lib/strokes";
import { useI18n } from "@/lib/i18n";
import { variantToKey } from "@/lib/data";
import type { StrokeRef } from "@/lib/types";

interface Props {
  character: string;
  highlightComponent?: string;
  differenceComponents?: string[];
  className?: string;
}
type ComponentStrokeMap = Record<string, Record<string, number[]>>;

/** Lazy KanjiVG preview with component fills limited to verified KanjiVG group membership. */
export default function FamilyGlyph({ character, highlightComponent, differenceComponents = [], className = "" }: Props) {
  const host = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [result, setResult] = useState<{ character: string; strokes: StrokeRef[] | null; components: Record<string, number[]> } | null>(null);
  const { language } = useI18n();
  useEffect(() => {
    const node = host.current;
    if (!node || visible) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "120px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);
  useEffect(() => {
    let active = true;
    setResult(null);
    if (visible) {
      Promise.all([getStrokes(character), import("@/data/component-strokes.json")]).then(([data, module]) => {
        if (!active) return;
        const mapping = (module.default as { components: ComponentStrokeMap }).components[character] ?? {};
        setResult({ character, strokes: data?.strokes ?? null, components: mapping });
      }).catch(() => { if (active) setResult({ character, strokes: null, components: {} }); });
    }
    return () => { active = false; };
  }, [character, visible]);
  const current = result?.character === character ? result : null;
  const canonical = (value: string) => variantToKey.get(value) ?? value;
  const sharedKey = highlightComponent ? canonical(highlightComponent) : undefined;
  const differentKeys = differenceComponents.map(canonical);
  const sharedStrokes = new Set(sharedKey ? current?.components[sharedKey] ?? [] : []);
  const differentStrokes = new Set(differentKeys.flatMap((key) => current?.components[key] ?? []));
  const classes = ["family-glyph", className].filter(Boolean).join(" ");
  const label = [
    sharedKey && (language === "es" ? `Componente compartido: ${sharedKey}` : `Shared component: ${sharedKey}`),
    ...differentKeys.map((c) => language === "es" ? `Componente diferente: ${c}` : `Different component: ${c}`),
  ].filter(Boolean).join("; ");
  return <span ref={host} className={classes} aria-label={label || character} lang="ja">
    {current?.strokes?.length ? <svg viewBox="0 0 109 109" aria-hidden="true" focusable="false">{current.strokes.map((s) => <path key={s.nn} d={s.d} className={sharedStrokes.has(s.nn) ? "is-shared" : differentStrokes.has(s.nn) ? "is-different" : undefined} />)}</svg> : <span className="family-glyph-fallback">{character}</span>}
  </span>;
}
