import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { familyDescription, listFamilies, queryFamily, type FamilyMode, type FamilyOption, type FamilyQuery } from "@/lib/families";
import { kanjiPrimaryMeaning, wordDisplayMeaning, type WordData } from "@/lib/data";
import type { KanjiData, PositionType } from "@/lib/types";
import { kanaToRomaji } from "@/lib/romaji";
import { useI18n } from "@/lib/i18n";
import FamilyGlyph from "@/components/families/FamilyGlyph";
import KanjiComparator from "@/components/families/KanjiComparator";
import "@/components/families/families.css";

const modes: FamilyMode[] = ["component", "phonetic", "reading", "visual", "theme", "words"];
const positions: Exclude<PositionType, null>[] = ["hen", "tsukuri", "kanmuri", "ashi", "tare", "nyou", "kamae"];
const copy = {
  en: { title:"Kanji families", subtitle:"Explore useful relationships between kanji.", search:"Search families", modes:["Component","Sound","Shape alike","Themes","Shared words"], sounds:["Phonetic series","Shared reading"], filters:"Filters", jlpt:"JLPT level", any:"Any", position:"Component position", radical:"Radical only", sort:"Sort by", frequency:"Frequency", strokes:"Stroke count", family:"Choose a family", choose:"Select a family to explore", compare:"Compare kanji", compareHelp:"Choose up to two characters to compare.", replaceHelp:"Choose a third character to replace the second selection.", jumpCompare:"Jump to comparison", empty:"No kanji match these filters.", more:"Show more", less:"Show fewer", select:"Add to comparison", remove:"Remove", selected:"Selected", words:"Example words", reason:"Why they are grouped", clear:"Clear filters", curated:"Curated learning groups; relationships are useful study guides, not exhaustive linguistic classifications.", browse:"Browse radicals" },
  es: { title:"Familias de kanji", subtitle:"Explora relaciones útiles entre kanji.", search:"Buscar familias", modes:["Componente","Sonido","Forma parecida","Temas","Palabras en común"], sounds:["Serie fonética","Lectura compartida"], filters:"Filtros", jlpt:"Nivel JLPT", any:"Cualquiera", position:"Posición del componente", radical:"Solo radical", sort:"Ordenar por", frequency:"Frecuencia", strokes:"Número de trazos", family:"Elige una familia", choose:"Selecciona una familia para explorar", compare:"Comparar kanji", compareHelp:"Elige hasta dos caracteres para comparar.", replaceHelp:"Elige un tercer carácter para reemplazar el segundo seleccionado.", jumpCompare:"Ir a comparación", empty:"Ningún kanji coincide con estos filtros.", more:"Mostrar más", less:"Mostrar menos", select:"Añadir a comparación", remove:"Quitar", selected:"Seleccionado", words:"Palabras de ejemplo", reason:"Motivo de la agrupación", clear:"Borrar filtros", curated:"Grupos seleccionados para estudiar; las relaciones son guías útiles y no clasificaciones lingüísticas exhaustivas.", browse:"Explorar radicales" },
} as const;
const labels = (language: "en" | "es") => copy[language];
const modeFrom = (s: string | null): FamilyMode => modes.includes(s as FamilyMode) ? s as FamilyMode : "component";

export default function FamiliesPage() {
  const { language } = useI18n();
  const c = labels(language);
  const [params, setParams] = useSearchParams();
  const mode = modeFrom(params.get("mode"));
  const familyId = params.get("family") ?? "青";
  const jlpt = params.get("jlpt") ?? "";
  const position = params.get("position") ?? "";
  const radicalOnly = params.get("radical") === "1";
  const sort = (params.get("sort") as FamilyQuery["sort"]) || "jlpt";
  const compare = [...new Set((params.get("compare") ?? "").split(",").filter(Boolean))].slice(0, 2);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(12);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const families = useMemo(() => listFamilies(mode, language), [mode, language]);
  const filteredFamilies = families.filter((f: FamilyOption) => `${f.label} ${f.description}`.toLowerCase().includes(search.toLowerCase()));
  const family = families.find((f: FamilyOption) => f.id === familyId) ?? families[0];
  const activeId = family?.id ?? familyId;
  const members = useMemo(() => family ? queryFamily({ mode, family: activeId, language, jlpt: jlpt || undefined, position: position || undefined, radicalOnly: mode === "component" && radicalOnly, sort }) : [], [mode, activeId, language, jlpt, position, radicalOnly, sort, family]);
  const currentDescription = family ? familyDescription(mode, activeId, language) : "";

  useEffect(() => { setLimit(12); }, [mode, activeId, jlpt, position, radicalOnly, sort]);
  useEffect(() => { setSearch(""); }, [mode]);
  useEffect(() => { if (family && params.get("family") !== family.id) setParams((old) => { const next = new URLSearchParams(old); next.set("family", family.id); return next; }, { replace: true }); }, [family, params, setParams]);

  function patch(values: Record<string, string | null>) {
    setParams(old => { const next = new URLSearchParams(old); for (const [key, value] of Object.entries(values)) value ? next.set(key, value) : next.delete(key); return next; });
  }
  function toggleCompare(char: string) {
    const next = compare.includes(char) ? compare.filter(x => x !== char) : compare.length < 2 ? [...compare, char] : [compare[0], char];
    patch({ compare: next.length ? next.join(",") : null });
  }

  return <article className="families-page page">
    <header className="families-head"><div><p className="families-eyebrow">{language === "es" ? "ESTUDIO DE KANJI" : "KANJI STUDY"}</p><h1>{c.title}</h1><p>{c.subtitle}</p><Link className="families-browse-link" to="/browse">{c.browse} →</Link></div><div className="families-head-actions"><p className="families-curated">{c.curated}</p><a className="families-jump-compare" href="#families-compare">{c.jumpCompare} ↓</a></div></header>
    <nav className="families-tabs" aria-label={c.title}>{modes.filter(m => m !== "reading").map((m) => <button key={m} className={mode === m || (m === "phonetic" && mode === "reading") ? "active" : ""} onClick={() => patch({ mode: m, family: null, position: null, radical: null })}>{c.modes[modes.filter(x=>x!=="reading").indexOf(m)]}</button>)}</nav>
    {mode === "phonetic" || mode === "reading" ? <div className="families-subtabs"><button className={mode === "phonetic" ? "active" : ""} onClick={() => patch({mode:"phonetic",family:null})}>{c.sounds[0]}</button><button className={mode === "reading" ? "active" : ""} onClick={() => patch({mode:"reading",family:null})}>{c.sounds[1]}</button></div> : null}
    <div className="families-layout">
      <aside className="families-sidebar">
        <div className="families-sidebar-title"><h2>{c.family}</h2><span>{families.length}</span></div>
        <input className="families-search" aria-label={c.search} placeholder={c.search} value={search} onChange={e=>setSearch(e.target.value)} />
        <button className="families-filter-toggle" aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(!filtersOpen)}>{c.filters} <span>{filtersOpen ? "−" : "+"}</span></button>
        <div className={`families-filters ${filtersOpen ? "open" : ""}`}>
          <label>{c.jlpt}<select value={jlpt} onChange={e=>patch({jlpt:e.target.value || null})}><option value="">{c.any}</option>{["N5","N4","N3","N2","N1"].map(x=><option key={x}>{x}</option>)}</select></label>
          {mode === "component" && <><label>{c.position}<select value={position} onChange={e=>patch({position:e.target.value || null})}><option value="">{c.any}</option>{positions.map(x=><option key={x} value={x}>{language === "es" ? ({hen:"izquierda",tsukuri:"derecha",kanmuri:"arriba",ashi:"abajo",tare:"colgante",nyou:"envolvente",kamae:"encerrado"}[x]) : x}</option>)}</select></label><label className="families-check"><input type="checkbox" checked={radicalOnly} onChange={e=>patch({radical:e.target.checked ? "1" : null})}/>{c.radical}</label></>}
          <label>{c.sort}<select value={sort} onChange={e=>patch({sort:e.target.value})}><option value="jlpt">JLPT</option><option value="strokes">{c.strokes}</option><option value="frequency">{c.frequency}</option></select></label>
        </div>
        <div className="families-option-list">{filteredFamilies.map(f=><button key={f.id} className={`families-option ${activeId === f.id ? "active" : ""}`} onClick={()=>patch({family:f.id})}><span className="families-option-glyph" lang="ja">{[...f.id].length < 4 ? f.id.replace(/^(on|kun):/, "") : "文"}</span><span className="families-option-copy"><strong>{f.label}</strong><small>{f.count} kanji</small></span></button>)}{filteredFamilies.length===0 && <p className="families-muted">{c.empty}</p>}</div>
      </aside>
      <section className="families-results" aria-live="polite">
        {!family ? <div className="families-empty"><h2>{c.choose}</h2></div> : <><div className="families-intro"><div className="families-intro-glyph" lang="ja">{mode === "component" || mode === "phonetic" ? activeId : mode === "reading" ? activeId.replace(/^(on|kun):/, "") : "文"}</div><div><p className="families-eyebrow">{c.family}</p><h2>{family.label}</h2><p>{currentDescription}</p></div></div><div className="families-results-bar"><span>{members.length} kanji</span><span>{compare.length === 2 ? c.replaceHelp : compare.length ? `${compare.join(" · ")} ${c.selected}` : c.compareHelp}</span></div>
        <div className="families-kanji-list">{members.slice(0,limit).map((member, i) => <KanjiCard key={member.kanji.kanji} kanji={member.kanji} reason={member.reason} words={member.words} language={language} selected={compare.includes(member.kanji.kanji)} onToggle={()=>toggleCompare(member.kanji.kanji)} showGlyph={i<6} highlight={member.sharedComponent}/>)}</div>
        {members.length===0 && <div className="families-empty"><h3>{c.empty}</h3><button onClick={()=>patch({jlpt:null,position:null,radical:null})}>{c.clear}</button></div>}
        {members.length>limit && <button className="families-more" onClick={()=>setLimit(limit+12)}>{c.more} ({members.length-limit})</button>}
        </>}
      </section>
      <aside className="families-compare" id="families-compare"><div><p className="families-eyebrow">{c.compare}</p><h2>{c.compare}</h2></div><p className="families-muted">{c.compareHelp}</p>{compare.length ? <KanjiComparator characters={compare} onRemove={char=>patch({compare:compare.filter(x=>x!==char).join(",")||null})} highlightComponent={mode === "component" || mode === "phonetic" ? activeId : undefined}/> : <div className="families-compare-placeholder"><span>漢</span><p>{c.select}</p></div>}</aside>
    </div>
  </article>;
}

function KanjiCard({kanji,reason,words,language,selected,onToggle,showGlyph,highlight}:{kanji:KanjiData;reason:string;words:WordData[];language:"en"|"es";selected:boolean;onToggle:()=>void;showGlyph:boolean;highlight?:string}) {
  const c=labels(language); const [expanded,setExpanded]=useState(false); const examples=words.slice(0,2);
  return <article className="families-kanji-card">
    <div className="families-card-main">{showGlyph ? <FamilyGlyph character={kanji.kanji} highlightComponent={highlight} className="families-card-glyph"/> : <span className="families-card-glyph-text" lang="ja">{kanji.kanji}</span>}<div className="families-card-info"><Link to={`/kanji/${encodeURIComponent(kanji.kanji)}`} className="families-card-title" lang="ja">{kanji.kanji}</Link><p>{kanjiPrimaryMeaning(kanji,language) ?? "—"}</p><div className="families-card-meta"><span>{kanji.jlpt ?? "—"}</span><span>{kanji.strokeCount}{language === "es" ? " trazos" : " strokes"}</span>{[...kanji.onyomi,...kanji.kunyomi].slice(0,2).map((reading,i)=><span key={`${reading}${i}`}>{reading} · {kanaToRomaji(reading)}</span>)}</div></div><button className={`families-select ${selected ? "selected" : ""}`} onClick={onToggle} aria-pressed={selected} aria-label={`${selected ? c.remove : c.select}: ${kanji.kanji}`}>{selected ? "✓" : "+"}</button></div>
    <p className="families-reason"><strong>{c.reason}:</strong> {reason}</p>
    {examples.length>0 && <div className="families-examples"><span>{c.words}</span>{examples.map((w,i)=><Link key={`${w.kanji}${w.kana}${i}`} to={`/word?form=${encodeURIComponent(w.kanji)}&reading=${encodeURIComponent(w.kana)}`}><b lang="ja">{w.kanji}</b> {w.kana} <small>{wordDisplayMeaning(w,language)}</small></Link>)}</div>}
    {expanded && <div className="families-extra"><span>JLPT {kanji.jlpt ?? "—"}</span><span>{kanji.strokeCount} strokes</span><span>{kanji.components.map(x=>x.character).join(" · ")}</span></div>}
    <button className="families-expand" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?c.less:c.more}</button>
  </article>;
}
