import { useNavigate } from "react-router-dom";
import { allKanji, dbStats, getRadical } from "@/lib/data";

const QUICK_RADICALS = ["宀", "人", "氵", "女", "木", "口"];

export default function Home() {
  const navigate = useNavigate();
  const stats = dbStats();
  const featured = allKanji()
    .filter((k) => k.jlpt === "N5" || k.jlpt === "N4")
    .slice(0, 24);
  const radicalCards = QUICK_RADICALS.map((display) => {
    const r = getRadical(display === "氵" ? "水" : display);
    return r ? { char: r.character, name: r.name, count: r.kanji.length } : null;
  }).filter(Boolean) as Array<{ char: string; name: string; count: number }>;

  return (
    <div className="home">
      <section className="hero">
        <h1 className="hero-title">
          <span className="hero-kanji">漢字</span>
          <span className="hero-sub">Kanji construction explorer</span>
        </h1>
        <p className="hero-lead">
          Start from a kanji. Discover its radicals and components, then discover every kanji that
          shares them — an interactive map of how kanji are built.
        </p>
        <div className="hero-stats">
          <span>{stats.kanjiCount.toLocaleString()} kanji</span>
          <span className="dot">·</span>
          <span>{stats.radicalCount.toLocaleString()} radicals and components</span>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Browse by radical</h2>
        <div className="radical-strip">
          {radicalCards.map((c) => (
            <button key={c.char} className="radical-card" onClick={() => navigate(`/radical/${c.char}`)}>
              <span className="radical-card-char">{c.char}</span>
              <span className="radical-card-name">{c.name}</span>
              <span className="radical-card-count">{c.count} kanji</span>
            </button>
          ))}
        </div>
        <button className="link-btn" onClick={() => navigate("/browse")}>
          See every radical and component family →
        </button>
      </section>

      <section className="section">
        <h2 className="section-title">Get started</h2>
        <div className="kanji-grid">
          {featured.map((k) => (
            <button key={k.kanji} className="kanji-tile" onClick={() => navigate(`/kanji/${k.kanji}`)}>
              <span className="tile-char">{k.kanji}</span>
              <span className="tile-meaning">{k.meanings[0] ?? ""}</span>
              <span className="tile-badges">
                {k.jlpt ? <em>{k.jlpt}</em> : null}
                <em>{k.strokeCount} strokes</em>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
