import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { kanjiPrimaryMeaning, wordsForKanji, wordDisplayMeaning, variantToKey, getKanji } from "@/lib/data";
import { kanaToRomaji } from "@/lib/romaji";
import FamilyGlyph from "./FamilyGlyph";
import "./comparator.css";

interface Props { characters: string[]; onRemove: (char: string) => void; highlightComponent?: string }
const copy = {
  en: { title: "Compare kanji", empty: "Choose a kanji to start comparing.", one: "Add another kanji to compare.", shared: "Shared components", different: "Different", sharedReadings: "Shared readings", differentReadings: "Different readings", readings: "Readings", on: "On’yomi", kun: "Kun’yomi", strokes: "strokes", words: "Word examples", more: "Open full card", details: "Readings and examples", remove: "Remove", none: "None" },
  es: { title: "Comparar kanji", empty: "Elige un kanji para empezar la comparación.", one: "Añade otro kanji para compararlos.", shared: "Componentes compartidos", different: "Diferentes", sharedReadings: "Lecturas compartidas", differentReadings: "Lecturas diferentes", readings: "Lecturas", on: "On’yomi", kun: "Kun’yomi", strokes: "trazos", words: "Ejemplos de palabras", more: "Abrir ficha", details: "Lecturas y ejemplos", remove: "Quitar", none: "Ninguno" },
};
const canonical = (s: string) => variantToKey.get(s) ?? s;
const unique = (items: string[]) => [...new Set(items)];

export default function KanjiComparator({ characters, onRemove, highlightComponent }: Props) {
  const { language } = useI18n();
  const text = copy[language];
  const selected = unique(characters).slice(0, 2).map((character) => ({ character, data: getKanji(character) })).filter((x) => x.data);
  const componentSets = selected.map(({ data }) => new Set(data!.components.map((c) => canonical(c.canonical || c.character))));
  const allComponents = unique(selected.flatMap(({ data }) => data!.components.map((c) => canonical(c.canonical || c.character))));
  const sharedComponents = selected.length === 2 ? allComponents.filter((c) => componentSets.every((set) => set.has(c))) : [];
  const differentComponents = selected.length === 2 ? allComponents.filter((c) => !sharedComponents.includes(c)) : [];
  const readingEntries = selected.flatMap(({ data }) => [...data!.onyomi, ...data!.kunyomi]);
  const sharedReadings = selected.length === 2 ? unique(readingEntries).filter((reading) => selected.every(({ data }) => data!.onyomi.includes(reading) || data!.kunyomi.includes(reading))) : [];
  const differentReadings = unique(readingEntries).filter((reading) => !sharedReadings.includes(reading));
  const reading = (kana: string) => `${kana} (${kanaToRomaji(kana)})`;
  const requestedComponent = highlightComponent ? canonical(highlightComponent) : undefined;

  return <section className="comparison-panel" aria-label={text.title}>
    {selected.length === 0 && <p className="comparison-empty">{text.empty}</p>}
    {selected.length === 1 && <p className="comparison-empty">{text.one}</p>}
    <div className="comparison-columns">
      {selected.map(({ character, data }) => {
        const components = unique(data!.components.map((c) => canonical(c.canonical || c.character)));
        const sharedForGlyph = requestedComponent && components.includes(requestedComponent) && sharedComponents.includes(requestedComponent)
          ? requestedComponent : components.find((c) => sharedComponents.includes(c));
        const differentForGlyph = components.filter((c) => differentComponents.includes(c));
        const examples = wordsForKanji(character).slice(0, 2);
        return <article className="comparison-card" key={character}>
          <header className="comparison-card-head"><FamilyGlyph character={character} highlightComponent={sharedForGlyph} differenceComponents={differentForGlyph} /><div><h3 lang="ja">{character}</h3><p>{kanjiPrimaryMeaning(data!, language) ?? "—"}</p><small>{data!.jlpt ?? "—"} · {data!.strokeCount} {text.strokes}</small></div><button type="button" aria-label={`${text.remove} ${character}`} onClick={() => onRemove(character)}>×</button></header>
          <Link className="comparison-link" to={`/kanji/${character}`}>{text.more} →</Link>
          <details className="comparison-details"><summary>{text.details}</summary>
            <div className="comparison-readings"><h4>{text.readings}</h4><p><b>{text.on}:</b> {data!.onyomi.length ? data!.onyomi.map(reading).join("、") : "—"}</p><p><b>{text.kun}:</b> {data!.kunyomi.length ? data!.kunyomi.map(reading).join("、") : "—"}</p></div>
            <div className="comparison-card-components"><span className="comparison-label">{text.shared}:</span> {components.filter((c) => sharedComponents.includes(c)).map((c) => <span key={c} className="comparison-chip is-shared" lang="ja">{c}</span>)}{!components.some((c) => sharedComponents.includes(c)) && <span>—</span>}<br/><span className="comparison-label">{text.different}:</span> {components.filter((c) => differentComponents.includes(c)).map((c) => <span key={c} className="comparison-chip is-different" lang="ja">{c}</span>)}{!components.some((c) => differentComponents.includes(c)) && <span>—</span>}</div>
            <div className="comparison-words"><h4>{text.words}</h4>{examples.length ? <ul>{examples.map((word) => <li key={`${word.kanji}-${word.kana}`}><Link to={`/word?form=${encodeURIComponent(word.kanji)}&reading=${encodeURIComponent(word.kana)}`}><span lang="ja">{word.kanji}・{word.kana}</span></Link> <span>{wordDisplayMeaning(word, language)}</span></li>)}</ul> : <p>—</p>}</div>
          </details>
        </article>;
      })}
    </div>
    {selected.length === 2 && <div className="comparison-summary">
      <section><h3>{text.shared}</h3><div className="comparison-chips">{sharedComponents.length ? sharedComponents.map((component) => <span key={component} className="comparison-chip is-shared" lang="ja">{component}</span>) : <span>{text.none}</span>}</div></section>
      <section><h3>{text.different}</h3><div className="comparison-chips">{differentComponents.length ? differentComponents.map((component) => <span key={component} className="comparison-chip is-different" lang="ja">{component}</span>) : <span>{text.none}</span>}</div></section>
      {sharedReadings.length > 0 && <section className="comparison-shared-readings"><h3>{text.sharedReadings}</h3><div className="comparison-chips">{sharedReadings.slice(0, 4).map((item) => <span key={item} className="comparison-chip is-shared" lang="ja">{reading(item)}</span>)}{sharedReadings.length > 4 && <span>+{sharedReadings.length - 4}</span>}</div></section>}
      {highlightComponent && <p className="comparison-highlight">{language === "es" ? "Componente seleccionado:" : "Selected component:"} <span lang="ja">{requestedComponent}</span></p>}
      {differentReadings.length > 0 && <details className="comparison-all-readings"><summary>{text.differentReadings}</summary><div className="comparison-chips">{differentReadings.map((item) => <span key={item} className="comparison-chip is-different" lang="ja">{reading(item)}</span>)}</div></details>}
    </div>}
  </section>;
}
