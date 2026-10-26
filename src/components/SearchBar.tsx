import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { search, type SearchHit } from "@/lib/search";
import { useI18n } from "@/lib/i18n";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const { language, t } = useI18n();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setHits([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(() => {
      const res = search(q, 12, language);
      setHits(res.hits);
      setOpen(res.hits.length > 0);
      setActive(0);
    }, 120);
    return () => clearTimeout(t);
  }, [query, language]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="searchbar" ref={boxRef}>
      <input
        className="search-input"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? "kanji-search-results" : undefined}
        aria-activedescendant={open && hits.length ? `kanji-search-result-${active}` : undefined}
        placeholder={t("search.placeholder")}
        aria-label={t("search.placeholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={(e) => setOpen(e.currentTarget.value.trim().length > 0)}
        onKeyDown={(e) => {
          if (open && hits.length) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => (a + 1) % hits.length);
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (a - 1 + hits.length) % hits.length);
              return;
            }
            if (e.key === "Enter") {
              const hit = hits[active] ?? hits[0];
              if (hit) {
                setOpen(false);
                setQuery("");
                navigate(hit.kind === "kanji" ? `/kanji/${hit.character}` : `/radical/${hit.key}`);
              }
              return;
            }
          }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && (
        <ul id="kanji-search-results" className="search-results" role="listbox" aria-label={t("search.results")}>
          {hits.map((hit, i) => (
            <li
              id={`kanji-search-result-${i}`}
              role="option"
              aria-selected={i === active}
              key={`${hit.kind}:${hit.key}:${i}`}
              className={i === active ? "result active" : "result"}
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                setOpen(false);
                setQuery("");
                navigate(hit.kind === "kanji" ? `/kanji/${hit.character}` : `/radical/${hit.key}`);
              }}
            >
              <span className={`result-char kind-${hit.kind}`} lang="ja">{hit.character}</span>
              {hit.sub ? <span className="result-kind">{hit.sub}</span> : null}
              {hit.meaning ? <span className="result-meaning" title={hit.meaning}>{hit.meaning}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
