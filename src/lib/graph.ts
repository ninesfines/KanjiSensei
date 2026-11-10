import type { KanjiData, RadicalData } from "./types";
import { kanjiList, radicalFor, variantToKey, getKanji, getWord, wordsForKanji, wordKey, kanjiPrimaryMeaning, radicalMeaning, componentMeaning, wordDisplayMeaning } from "./data";

export interface GraphNode {
  id: string;
  kind: "kanji" | "radical" | "component" | "word";
  label?: string;
  reading?: string;
  /** romaji name (radicals/components), for the hover tooltip. */
  name?: string;
  /** primary meaning of this node's character, when known. */
  meaning?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: "contains" | "uses" | "forms";
}

/**
 * Build a scoped subgraph: a radical plus its kanji family, or the full
 * component universe of a single kanji.
 */
export function buildGraph(
  root: { kind: "kanji" | "radical" | "word"; character: string; reading?: string },
  opts: { limitPerRadical?: number; language?: "en" | "es" } = {}
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const limit = opts.limitPerRadical ?? 24;
  const language = opts.language ?? "en";
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

  const addWord = (form: string, reading: string) => {
    const word = getWord(form, reading);
    if (!word) return;
    const id = `word:${encodeURIComponent(form)}:${encodeURIComponent(reading)}`;
    addNode(id, "word", { label: form, reading, meaning: wordDisplayMeaning(word, language) });
    for (const char of word.characters) {
      addNode(char, "kanji", { meaning: kanjiPrimaryMeaning(getKanji(char), language) });
      addEdge(char, id, "forms");
    }
  };

  if (root.kind === "word") {
    const word = getWord(root.character, root.reading ?? "");
    if (!word) return { nodes: [], edges: [] };
    addWord(word.kanji, word.kana);
    const related = new Set<string>();
    for (const char of word.characters) {
      for (const other of wordsForKanji(char)) {
        if (related.size >= 18) break;
        const key = wordKey(other.kanji, other.kana);
        if (key !== wordKey(word.kanji, word.kana)) related.add(key);
      }
    }
    for (const key of related) {
      const [form, reading] = key.split("\u0000");
      addWord(form, reading);
    }
    return { nodes: [...nodes.values()], edges };
  }

  if (root.kind === "kanji") {
    const kanji = kanjiList.find((k) => k.kanji === root.character);
    if (!kanji) return { nodes: [], edges: [] };
    addNode(kanji.kanji, "kanji", { meaning: kanjiPrimaryMeaning(kanji, language) });
    for (const c of kanji.components) {
      const key = variantToKey.get(c.character) ?? c.canonical;
      const label = c.character;
      addNode(label, c.role === "radical" ? "radical" : "component", {
        name: c.name || undefined,
        meaning: componentMeaning(c, language) || undefined,
      });
      addEdge(label, kanji.kanji, "contains");
      // connect sibling kanji that share this component
      const famList = radicalFor(key)?.kanji ?? [];
      let added = 0;
      for (const other of famList) {
        if (added >= limit) break;
        if (other === kanji.kanji) continue;
        addNode(other, "kanji", { meaning: kanjiPrimaryMeaning(getKanji(other), language) });
        addEdge(label, other, "contains");
        added++;
      }
    }
    for (const word of wordsForKanji(kanji.kanji).slice(0, 12)) addWord(word.kanji, word.kana);
    return { nodes: [...nodes.values()], edges };
  }

  // radical root
  const radical = radicalFor(root.character);
  if (!radical) return { nodes: [], edges: [] };
  addNode(radical.character, "radical", {
    name: radical.name || undefined,
    meaning: radicalMeaning(radical, language) || undefined,
  });
  let added = 0;
  for (const k of radical.kanji) {
    if (added >= limit) break;
    const kd = getKanji(k);
    if (!kd) continue; // Map lookup — also replaces the old kanjiList.some() scan
    addNode(k, "kanji", { meaning: kanjiPrimaryMeaning(kd, language) });
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
      meaning: rad ? radicalMeaning(rad, language) : undefined,
    });
    addEdge(rkey, id, "uses");
  }
  return { nodes: [...nodes.values()], edges };
}

export function graphToCytoscapeElements(graph: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const elements: any[] = graph.nodes.map((n) => ({
    data: { id: n.id, kind: n.kind, label: n.label ?? n.id, reading: n.reading, name: n.name, meaning: n.meaning },
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
