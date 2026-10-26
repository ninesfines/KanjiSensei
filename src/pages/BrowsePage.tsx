import { useState } from "react";
import { Link } from "react-router-dom";
import { radicalsGroupedByStroke, kanjiList, radicalMeaning } from "@/lib/data";
import { appFamilyCount } from "@/lib/family";
import { useI18n } from "@/lib/i18n";

export default function BrowsePage() {
  const { language, t } = useI18n();
  const groups = radicalsGroupedByStroke();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const shown = groups
    .map(([strokes, list]) => [strokes, list] as [number, typeof list])
    .filter(([, list]) => {
      if (!q) return true;
      return list.some((r) =>
        r.name.toLowerCase().includes(q) ||
        radicalMeaning(r, language).toLowerCase().includes(q) ||
        r.character.includes(q) ||
        r.names.some((n) => n.startsWith(q))
      );
    });

  return (
    <article className="browse-page page">
      <header className="page-head">
        <h1>{t("home.radicals")}</h1>
        <p className="muted">
          {t("browse.description", { count: kanjiList.length.toLocaleString() })}
        </p>
        <input
          className="browse-filter"
          placeholder={t("browse.filter")}
          aria-label={t("browse.filter")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </header>

      {shown.map(([strokes, list]) => (
        <section key={strokes} className="panel">
          <h2 className="panel-title">{strokes} {strokes === 1 ? t("browse.stroke") : t("browse.strokes")}</h2>
          <div className="family-grid">
            {list.map((r) => (
              <Link
                key={`${r.character}-${r.kanji.length}`}
                to={`/radical/${r.character}`}
                className="family-card"
              >
                <span className="family-char" lang="ja">{r.variant !== r.character ? r.variant : r.character}</span>
                <span className="family-meta">
                  <span className="family-name">{r.name}</span>
                  <span className="family-count">{appFamilyCount(r.character)} {t("unit.kanji")}</span>
                </span>
                <span className="family-preview">
                  {r.kanji.slice(0, 5).map((k) => (
                    <span key={k} lang="ja">{k}</span>
                  ))}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {shown.length === 0 ? <p className="muted">{t("browse.noMatches", { query })}</p> : null}
    </article>
  );
}
