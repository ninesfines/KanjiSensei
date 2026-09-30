import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import cytoscape from "cytoscape";
import { buildGraph, graphToCytoscapeElements } from "@/lib/graph";

const COLORS: Record<string, { bg: string; border: string; size: number }> = {
  radical: { bg: "#f43f5e", border: "#fda4af", size: 30 },
  component: { bg: "#38bdf8", border: "#7dd3fc", size: 24 },
  kanji: { bg: "#1e293b", border: "#7db2f9", size: 36 },
};

const EDGE_COLOR: Record<string, string> = {
  contains: "#475569",
  uses: "#b45309",
};

export default function GraphPage() {
  const [params] = useSearchParams();
  const kind = (params.get("kind") === "radical" ? "radical" : "kanji") as "kanji" | "radical";
  const char = params.get("kanji") ?? params.get("char") ?? "家";
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [tooBig, setTooBig] = useState(false);
  const [tip, setTip] = useState<null | {
    id: string;
    kind: string;
    name?: string;
    meaning?: string;
    x: number;
    y: number;
    below: boolean;
  }>(null);
  const reduceMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    const graph = buildGraph({ kind, character: char }, { limitPerRadical: 16 });
    if (!containerRef.current) return;
    const cy = cytoscape({
      container: containerRef.current,
      elements: graphToCytoscapeElements(graph),
      layout: { name: "cose", animate: false, padding: 40 },
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            width: 44,
            height: 44,
            "font-size": 22,
            color: "#e2e8f0",
            "text-valign": "center",
            "text-halign": "center",
            "background-color": "#1e293b",
            "border-width": 2,
            "border-color": "#7db2f9",
            "transition-property": "width height border-width font-size",
            "transition-duration": reduceMotion ? 0 : 120,
          },
        },
        {
          selector: 'node[kind = "radical"]',
          style: {
            "background-color": COLORS.radical.bg,
            "border-color": COLORS.radical.border,
            width: 48,
            height: 48,
          },
        },
        {
          selector: 'node[kind = "component"]',
          style: {
            "background-color": COLORS.component.bg,
            "border-color": COLORS.component.border,
          },
        },
        {
          // hovered node grows + thickens (class toggled from mouseover JS;
          // Cytoscape has no :hover selector state)
          selector: "node.hover",
          style: {
            width: 56,
            height: 56,
            "font-size": 26,
            "border-width": 3,
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.6,
            "line-color": EDGE_COLOR.contains,
            "curve-style": "haystack",
            "haystack-radius": 0.4,
          },
        },
        {
          selector: 'edge[kind = "uses"]',
          style: { "line-color": EDGE_COLOR.uses, width: 2.2 },
        },
      ],
    }) as cytoscape.Core;

    cy.on("tap", "node", (evt) => {
      setTip(null);
      const id = evt.target.id() as string;
      const nodeKind = evt.target.data("kind");
      navigate(
        nodeKindRoute(nodeKind, id)
      );
    });

    cy.on("mouseover", "node", (evt) => {
      const node = evt.target;
      node.addClass("hover");
      const pos = evt.renderedPosition ?? node.renderedPosition();
      const width = containerRef.current?.getBoundingClientRect().width ?? 500;
      const maxX = Math.max(160, width - 160);
      setTip({
        id: node.id() as string,
        kind: node.data("kind") as string,
        name: node.data("name") || undefined,
        meaning: node.data("meaning") || undefined,
        x: Math.min(Math.max(pos.x, 160), maxX),
        y: pos.y,
        below: pos.y < 100,
      });
    });
    cy.on("mouseout", "node", (evt) => {
      evt.target.removeClass("hover");
      setTip(null);
    });

    if (graph.nodes.length > 400) setTooBig(true);
    cyRef.current = cy;
    return () => {
      setTip(null);
      void cy.destroy();
    };
  }, [kind, char, navigate, reduceMotion]);

  return (
    <article className="graph-page page">
      <header className="page-head">
        <h1>Relationship graph</h1>
        <p className="muted">
          {kind === "kanji" ? `centered on ${char}` : `centered on ${char}`} — zoom with scroll, pan by dragging, click a node to open it.
        </p>
      </header>
      <div className="graph-wrap">
        <div ref={containerRef} className={tooBig ? "graph-canvas warn" : "graph-canvas"} />
        {tip && (
          <div
            className={`graph-tip${tip.below ? " below" : ""}`}
            style={{ left: tip.x, top: tip.y }}
            aria-hidden="true"
          >
            <span className="tip-char" lang="ja">{tip.id}</span>
            <span className={`tip-kind kind-${tip.kind}`}>{tip.kind}</span>
            {tip.name ? <span className="tip-name">{tip.name}</span> : null}
            {tip.meaning ? <span className="tip-meaning">{tip.meaning}</span> : null}
          </div>
        )}
      </div>
      <div className="legend">
        <span className="legend-item"><i className="dot radical" />radical</span>
        <span className="legend-item"><i className="dot component" />component</span>
        <span className="legend-item"><i className="dot kanji" />kanji</span>
      </div>
    </article>
  );
}

function nodeKindRoute(nodeKind: string, id: string): string {
  if (nodeKind === "kanji") return `/kanji/${id}`;
  if (nodeKind === "radical") return `/radical/${id}`;
  return `/radical/${encodeURIComponent(id)}`;
}
