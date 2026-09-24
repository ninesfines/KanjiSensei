import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { search, type SearchHit } from "@/lib/search";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setHits([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(() => {
      const res = search(q, 12);
      setHits(res.hits);
      setOpen(res.hits.length > 0);
      setActive(0);
    }, 120);
    return () => clearTimeout(t);
  }, [query]);

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
        placeholder="Search kanji, meaning, reading, radical…"
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
        <ul className="search-results" role="listbox" aria-label="search results">
          {hits.map((hit, i) => (
            <li
              key={`${hit.kind}:${hit.key}:${i}`}
              className={i === active ? "result active" : "result"}
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                setOpen(false);
                setQuery("");
                navigate(hit.kind === "kanji" ? `/kanji/${hit.character}` : `/radical/${hit.key}`);
              }}
            >
              <span className={`result-char kind-${hit.kind}`}>{hit.character}</span>
              <span className="result-text">{hit.sub}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
