import type { KanjiData, RadicalData } from "./types";
import { kanjiList, radicalFor, variantToKey, getKanji } from "./data";

export interface GraphNode {
  id: string;
  kind: "kanji" | "radical" | "component";
  /** romaji name (radicals/components), for the hover tooltip. */
  name?: string;
  /** primary meaning of this node's character, when known. */
  meaning?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: "contains" | "uses";
}

/**
 * Build a scoped subgraph: a radical plus its kanji family, or the full
 * component universe of a single kanji.
 */
export function buildGraph(
  root: { kind: "kanji" | "radical"; character: string },
  opts: { limitPerRadical?: number } = {}
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const limit = opts.limitPerRadical ?? 24;
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const seenEdge = new Set<string>();

  const addNode = (id: string, kind: GraphNode["kind"], extra?: Partial<GraphNode>) => {
    if (!nodes.has(id)) nodes.set(id, { id, kind, ...extra });
  };

  const addEdge = (from: string, to: string, kind: GraphEdge["kind"]) => {
    const key = `${from}\n${to}\n${kind}`;
    if (seenEdge.has(key)) return;
    seenEdge.add(key);
    edges.push({ from, to, kind });
  };

  if (root.kind === "kanji") {
    const kanji = kanjiList.find((k) => k.kanji === root.character);
    if (!kanji) return { nodes: [], edges: [] };
    addNode(kanji.kanji, "kanji", { meaning: kanji.meanings[0] });
    for (const c of kanji.components) {
      const key = variantToKey.get(c.character) ?? c.canonical;
      const label = c.character;
      addNode(label, c.role === "radical" ? "radical" : "component", {
        name: c.name || undefined,
        meaning: c.meaning || undefined,
      });
      addEdge(label, kanji.kanji, "contains");
      // connect sibling kanji that share this component
      const famList = radicalFor(key)?.kanji ?? [];
      let added = 0;
      for (const other of famList) {
        if (added >= limit) break;
        if (other === kanji.kanji) continue;
        addNode(other, "kanji", { meaning: getKanji(other)?.meanings[0] });
        addEdge(label, other, "contains");
        added++;
      }
    }
    return { nodes: [...nodes.values()], edges };
  }

  // radical root
  const radical = radicalFor(root.character);
  if (!radical) return { nodes: [], edges: [] };
  addNode(radical.character, "radical", {
    name: radical.name || undefined,
    meaning: radical.meaning || undefined,
  });
  let added = 0;
  for (const k of radical.kanji) {
    if (added >= limit) break;
    const kd = getKanji(k);
    if (!kd) continue; // Map lookup — also replaces the old kanjiList.some() scan
    addNode(k, "kanji", { meaning: kd.meanings[0] });
    addEdge(radical.character, k, "contains");
    added++;
  }
  // show each kanji's own radical as a secondary node ("related through radical")
  for (const id of [...nodes.keys()]) {
    if (id === radical.character) continue;
    const kdata = kanjiList.find((x) => x.kanji === id);
    if (!kdata?.radical?.character) continue;
    const rkey = kdata.radical.character;
    if (rkey === radical.character) continue;
    const rad = radicalFor(rkey);
    addNode(rkey, "radical", {
      name: rad?.name || undefined,
      meaning: rad?.meaning || undefined,
    });
    addEdge(rkey, id, "uses");
  }
  return { nodes: [...nodes.values()], edges };
}

export function graphToCytoscapeElements(graph: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const elements: any[] = graph.nodes.map((n) => ({
    data: { id: n.id, kind: n.kind, label: n.id, name: n.name, meaning: n.meaning },
  }));
  for (const e of graph.edges) {
    elements.push({
      data: {
        id: `${e.from}->${e.to}`,
        source: e.from,
        target: e.to,
        kind: e.kind,
      },
    });
  }
  return elements;
}

export type { RadicalData, KanjiData };
