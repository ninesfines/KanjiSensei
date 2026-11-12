import type { FamilyMode } from "@/lib/families";

/** Small, explicitly selected discovery groups. These are visual/theme prompts,
 * not claims about historical origin or exhaustive classification. */
export interface CuratedFamily {
  id: string;
  members: string[];
  label: { en: string; es: string };
  description: { en: string; es: string };
}

export const CURATED_FAMILIES: Partial<Record<"visual" | "theme", CuratedFamily[]>> = {
  visual: [
    { id: "日目白自", members: ["日", "目", "白", "自"], label: { en: "Similar shapes: 日・目・白・自", es: "Formas parecidas: 日・目・白・自" }, description: { en: "A visual comparison set. The characters share some box-and-line shapes; this is not an etymological family.", es: "Grupo para comparar formas. Comparten algunos trazos rectangulares; no es una familia etimológica." } },
    { id: "土士", members: ["土", "士"], label: { en: "Similar shapes: 土・士", es: "Formas parecidas: 土・士" }, description: { en: "In 土 the lower horizontal stroke is longer; in 士 the upper horizontal stroke is longer.", es: "En 土 el trazo horizontal inferior es más largo; en 士 es más largo el superior." } },
    { id: "未末", members: ["未", "末"], label: { en: "Similar shapes: 未・末", es: "Formas parecidas: 未・末" }, description: { en: "In 未 the upper horizontal stroke is shorter; in 末 the upper horizontal stroke is longer.", es: "En 未 el trazo horizontal superior es más corto; en 末 es más largo." } },
    { id: "人入", members: ["人", "入"], label: { en: "Similar shapes: 人・入", es: "Formas parecidas: 人・入" }, description: { en: "A visual comparison of two simple characters whose strokes meet at different angles.", es: "Comparación visual de dos caracteres simples cuyos trazos se encuentran de distinta manera." } },
    { id: "持待侍", members: ["持", "待", "侍"], label: { en: "Similar shapes: 持・待・侍", es: "Formas parecidas: 持・待・侍" }, description: { en: "All three have 寺 on the right. Compare the left components: 扌 in 持, 彳 in 待, and 亻 in 侍.", es: "Los tres tienen 寺 a la derecha. Compara la izquierda: 扌 en 持, 彳 en 待 y 亻 en 侍." } },
  ],
  theme: [
    { id: "water", members: ["水", "川", "海", "池", "湖", "洗", "泳", "液", "酒"], label: { en: "Water", es: "Agua" }, description: { en: "Selected kanji associated with water, rivers, bodies of water, or water-related actions. This starter set is not exhaustive.", es: "Selección de kanji relacionados con agua, ríos, masas de agua o acciones con agua. Esta lista inicial no es exhaustiva." } },
    { id: "time", members: ["日", "月", "年", "時", "分", "週", "朝", "夜", "今", "昔"], label: { en: "Time", es: "Tiempo" }, description: { en: "Selected kanji used for time, dates, or parts of the day. This is a learning theme, not a linguistic classification.", es: "Selección de kanji usados para tiempo, fechas o momentos del día. Es un tema de estudio, no una clasificación lingüística." } },
    { id: "movement", members: ["行", "来", "出", "入", "歩", "走", "通", "帰", "送", "運"], label: { en: "Movement", es: "Movimiento" }, description: { en: "Selected kanji with common movement or travel meanings and uses. This starter set is not exhaustive.", es: "Selección de kanji con usos o significados frecuentes de movimiento y desplazamiento. Esta lista inicial no es exhaustiva." } },
    { id: "person", members: ["人", "男", "女", "子", "友", "家", "父", "母", "私", "者"], label: { en: "People", es: "Personas" }, description: { en: "Selected kanji commonly referring to people, family, or social roles. This starter set is not exhaustive.", es: "Selección de kanji que suelen referirse a personas, familia o roles sociales. Esta lista inicial no es exhaustiva." } },
  ],
};

export function curatedFamilies(mode: FamilyMode): CuratedFamily[] {
  return mode === "visual" || mode === "theme" ? CURATED_FAMILIES[mode] ?? [] : [];
}
