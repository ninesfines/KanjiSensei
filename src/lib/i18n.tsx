import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Language = "en" | "es";

const translations = {
  en: {
    "nav.browse": "Browse", "nav.graph": "Graph", "nav.practice": "Practice",
    "search.placeholder": "Search kanji, meaning, reading, radical…", "search.results": "Search results",
    "language.label": "Language", "language.english": "English", "language.spanish": "Español",
    "footer.data": "Data: EDRDG Kanjidic2/JMdict/Radkfile · KanjiVG · Kanjium",
    "home.subtitle": "Kanji construction explorer",
    "home.lead": "Start from a kanji. Discover its radicals and components, then discover every kanji that shares them — an interactive map of how kanji are built.",
    "home.radicals": "Browse by radical", "home.everyFamily": "See every radical and component family →",
    "home.getStarted": "Get started", "unit.kanji": "kanji", "unit.radicalsComponents": "radicals and components",
    "unit.strokes": "strokes", "browse.description": "{count} kanji organized under radical and component families.",
    "browse.filter": "Filter radicals (name, meaning, character)…", "browse.stroke": "stroke", "browse.strokes": "strokes",
    "browse.familyCount": "kanji", "browse.noMatches": "No radical matches “{query}”.",
    "graph.loading": "Loading graph…", "graph.title": "Kanji construction graph",
    "graph.help": "centered on {char} — zoom with scroll, pan by dragging, click a node to open it.",
    "graph.radical": "radical", "graph.component": "component", "graph.kanji": "kanji",
    "kanji.grade": "grade {grade}", "kanji.strokeCount": "{count} strokes", "kanji.on": "On’yomi", "kanji.kun": "Kun’yomi",
    "kanji.assembly": "Component assembly steps", "kanji.strokeRange": "strokes {start}–{end}",
    "kanji.breakdown": "Component breakdown", "kanji.englishFallback": "English meaning", "kanji.readingHint": "Reading hint:",
    "kanji.phoneticIs": "is the phonetic here —", "kanji.seriesLink": "the {char} series ({count} kanji{predictable})", "kanji.predictable": ", {matches}/{scored} predictable",
    "kanji.words": "Common words & examples", "kanji.englishNotice": "Vocabulary meanings and sentence translations are currently shown in English.",
    "kanji.related": "Explore related", "kanji.graph": "Explore construction graph", "kanji.radicalPage": "Open radical family",
    "kanji.missing": "This kanji is not in the dataset.", "kanji.none": "No kanji specified.",
    "notFound.nothing": "Nothing here.", "common.backHome": "Back home",
    "radical.component": "component", "radical.strokeCount": "{count} strokes", "radical.kangxi": "Kangxi #{number}", "radical.treeTitle": "Reverse component tree", "radical.graphView": "Graph view", "radical.practiceFamily": "Practice family", "radical.practiceSeries": "Practice series", "radical.showMore": "Show {count} more of {total}", "radical.phoneticSeries": "Phonetic series", "radical.soundCarrier": "{key} is the sound-carrier in {count} kanji", "radical.matchRule": "Match rule: exact onyomi or voiced readings (dakuten/handakuten)",
    "radical.allKanji": "every kanji that contains {char}", "radical.datasetOnly": "dataset kanji only", "radical.all": "all kanji",
    "radical.openGraph": "Explore relationship graph", "radical.more": "Show more",
    "radical.noOn": "— no on'yomi readings to score", "radical.predicts": " — predicts onyomi in {matches}/{scored}",
    "radical.kanjiCount": "{count} kanji", "radical.missing": "This radical is not in the dataset.",
    "radical.none": "No radical specified.", "radical.browse": "Browse radicals",
    "practice.loading": "Loading practice…", "practice.title": "Stroke practice", "practice.intro": "Choose a kana deck or a JLPT kanji level, or jump directly to a character.",
    "practice.hiragana": "Hiragana deck", "practice.hiraganaNote": "all hiragana incl. voiced forms",
    "practice.katakana": "Katakana deck", "practice.katakanaNote": "all katakana incl. voiced forms",
    "practice.glyphs": "glyphs", "practice.jumpPlaceholder": "Jump to a glyph: マ, ma, 家…", "practice.jumpLabel": "Jump to a glyph", "practice.start": "practice →",
    "practice.deck": "{kind} deck", "practice.progress": "Glyph {current} of {total} — draw stroke by stroke, then reveal.", "practice.itemDescription": "Draw the character in the correct stroke order. Use the controls to reveal hints or retry.",
    "practice.undo": "↶ undo", "practice.clear": "clear", "practice.verdicts": "per-stroke verdicts",
    "practice.ghost": "ghost", "practice.hint": "hint", "practice.reveal": "reveal", "practice.knew": "✓ knew it", "practice.retry": "↻ try again", "practice.skip": "skip →",
    "practice.backDecks": "← back to decks", "practice.knewShort": "✓ knew", "practice.retryShort": "↻ retry", "practice.skipped": "skipped",
    "practice.recap": "Practice recap", "practice.summary": "{total} glyphs — ✓ {good} knew it · ↻ {retry} retried · {skipped} skipped", "practice.again": "Practice again", "practice.newSession": "Start a new session",
    "practice.loadingShort": "loading…", "practice.repractice": "↻ re-practice the {count} retries",
    "stroke.order": "Stroke order for {char}", "stroke.animationMode": "Animation mode", "stroke.strokes": "strokes", "stroke.components": "components", "stroke.replay": "↻ replay",
    "strokes": "strokes", "content.englishLabel": "English",
  },
  es: {
    "nav.browse": "Explorar", "nav.graph": "Grafo", "nav.practice": "Práctica",
    "search.placeholder": "Buscar kanji, significado, lectura, radical…", "search.results": "Resultados de búsqueda",
    "language.label": "Idioma", "language.english": "English", "language.spanish": "Español",
    "footer.data": "Datos: EDRDG Kanjidic2/JMdict/Radkfile · KanjiVG · Kanjium",
    "home.subtitle": "Explorador de la construcción de kanji",
    "home.lead": "Empieza por un kanji. Descubre sus radicales y componentes, y luego todos los kanji que los comparten: un mapa interactivo de cómo se construyen los kanji.",
    "home.radicals": "Explorar por radical", "home.everyFamily": "Ver todas las familias de radicales y componentes →",
    "home.getStarted": "Para empezar", "unit.kanji": "kanji", "unit.radicalsComponents": "radicales y componentes",
    "unit.strokes": "trazos", "browse.description": "{count} kanji organizados en familias de radicales y componentes.",
    "browse.filter": "Filtrar radicales (nombre, significado, carácter)…", "browse.stroke": "trazo", "browse.strokes": "trazos",
    "browse.familyCount": "kanji", "browse.noMatches": "Ningún radical coincide con «{query}». ",
    "graph.loading": "Cargando grafo…", "graph.title": "Grafo de construcción de kanji",
    "graph.help": "centrado en {char}: acerca o aleja con la rueda, arrastra para desplazarte y pulsa un nodo para abrirlo.",
    "graph.radical": "radical", "graph.component": "componente", "graph.kanji": "kanji",
    "kanji.grade": "nivel {grade}", "kanji.strokeCount": "{count} trazos", "kanji.on": "Lectura on’yomi", "kanji.kun": "Lectura kun’yomi",
    "kanji.assembly": "Pasos de ensamblaje de componentes", "kanji.strokeRange": "trazos {start}–{end}",
    "kanji.breakdown": "Desglose de componentes", "kanji.englishFallback": "Significado en inglés; traducción pendiente", "kanji.readingHint": "Pista de lectura:",
    "kanji.phoneticIs": "es el componente fonético aquí:", "kanji.seriesLink": "la serie de {char} ({count} kanji{predictable})", "kanji.predictable": ", {matches}/{scored} predecibles",
    "kanji.words": "Palabras y ejemplos frecuentes", "kanji.englishNotice": "Los significados del vocabulario y las traducciones de las oraciones se muestran actualmente en inglés.",
    "kanji.related": "Explorar contenido relacionado", "kanji.graph": "Ver grafo de construcción", "kanji.radicalPage": "Abrir familia del radical",
    "kanji.missing": "Este kanji no está en el conjunto de datos.", "kanji.none": "No se especificó ningún kanji.",
    "notFound.nothing": "No hay nada aquí.", "common.backHome": "Volver al inicio",
    "radical.component": "componente", "radical.strokeCount": "{count} trazos", "radical.kangxi": "Kangxi n.º {number}", "radical.treeTitle": "Árbol inverso de componentes", "radical.graphView": "Ver grafo", "radical.practiceFamily": "Practicar familia", "radical.practiceSeries": "Practicar serie", "radical.showMore": "Mostrar {count} más de {total}", "radical.phoneticSeries": "Serie fonética", "radical.soundCarrier": "{key} aporta el sonido en {count} kanji", "radical.matchRule": "Criterio: lectura on’yomi exacta o con sonorización (dakuten/handakuten)",
    "radical.allKanji": "todos los kanji que contienen {char}", "radical.datasetOnly": "solo kanji del conjunto de datos", "radical.all": "todos los kanji",
    "radical.openGraph": "Explorar grafo de relaciones", "radical.more": "Mostrar más",
    "radical.noOn": "— no hay lecturas on’yomi para evaluar", "radical.predicts": " — predice la lectura on’yomi en {matches}/{scored}",
    "radical.kanjiCount": "{count} kanji", "radical.missing": "Este radical no está en el conjunto de datos.",
    "radical.none": "No se especificó ningún radical.", "radical.browse": "Explorar radicales",
    "practice.loading": "Cargando práctica…", "practice.title": "Práctica de trazos", "practice.intro": "Elige un mazo de kana o un nivel JLPT de kanji, o ve directamente a un carácter.",
    "practice.hiragana": "Mazo de hiragana", "practice.hiraganaNote": "todos los hiragana, incluidas las formas sonoras",
    "practice.katakana": "Mazo de katakana", "practice.katakanaNote": "todos los katakana, incluidas las formas sonoras",
    "practice.glyphs": "caracteres", "practice.jumpPlaceholder": "Ir a un carácter: マ, ma, 家…", "practice.jumpLabel": "Ir a un carácter", "practice.start": "practicar →",
    "practice.deck": "Mazo de {kind}", "practice.progress": "Carácter {current} de {total}: dibuja trazo a trazo y luego muestra la solución.", "practice.itemDescription": "Dibuja el carácter siguiendo el orden correcto de los trazos. Usa los controles para ver pistas o volver a intentarlo.",
    "practice.undo": "↶ deshacer", "practice.clear": "borrar", "practice.verdicts": "resultado por trazo",
    "practice.ghost": "guía", "practice.hint": "pista", "practice.reveal": "mostrar", "practice.knew": "✓ lo sabía", "practice.retry": "↻ intentar de nuevo", "practice.skip": "saltar →",
    "practice.backDecks": "← volver a los mazos", "practice.knewShort": "✓ sabía", "practice.retryShort": "↻ repetir", "practice.skipped": "omitido",
    "practice.recap": "Resumen de práctica", "practice.summary": "{total} caracteres — ✓ {good} sabidos · ↻ {retry} repetidos · {skipped} omitidos", "practice.again": "Practicar de nuevo", "practice.newSession": "Empezar una sesión nueva",
    "practice.loadingShort": "cargando…", "practice.repractice": "↻ repetir los {count} fallidos",
    "stroke.order": "Orden de trazos de {char}", "stroke.animationMode": "Modo de animación", "stroke.strokes": "trazos", "stroke.components": "componentes", "stroke.replay": "↻ reproducir",
    "strokes": "trazos", "content.englishLabel": "Contenido en inglés",
  },
} as const;

export type I18nKey = keyof typeof translations.en;

const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void } | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      return window.localStorage.getItem("kanjisensei-language") === "es" ? "es" : "en";
    } catch {
      return "en";
    }
  });

  const setLanguage = (next: Language) => setLanguageState(next);
  useEffect(() => {
    try { window.localStorage.setItem("kanjisensei-language", language); } catch { /* storage can be disabled */ }
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside I18nProvider");
  return value;
}

export function useI18n() {
  const { language } = useLanguage();
  const t = (key: I18nKey, params?: Record<string, string | number>) => {
    let result: string = translations[language][key] ?? translations.en[key];
    for (const [name, value] of Object.entries(params ?? {})) result = result.replaceAll(`{${name}}`, String(value));
    return result;
  };
  return { language, t };
}
