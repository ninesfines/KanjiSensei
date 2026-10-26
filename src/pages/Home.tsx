import { useNavigate } from "react-router-dom";
import { allKanji, dbStats, getRadical, kanjiPrimaryMeaning } from "@/lib/data";
import { useI18n } from "@/lib/i18n";

const QUICK_RADICALS = ["宀", "人", "氵", "女", "木", "口"];

export default function Home() {
  const navigate = useNavigate();
  const { language, t } = useI18n();
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
          <span className="hero-sub">{t("home.subtitle")}</span>
        </h1>
        <p className="hero-lead">
          {t("home.lead")}
        </p>
        <div className="hero-stats">
          <span>{stats.kanjiCount.toLocaleString()} {t("unit.kanji")}</span>
          <span className="dot">·</span>
          <span>{stats.radicalCount.toLocaleString()} {t("unit.radicalsComponents")}</span>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">{t("home.radicals")}</h2>
        <div className="radical-strip">
          {radicalCards.map((c) => (
            <button key={c.char} className="radical-card" onClick={() => navigate(`/radical/${c.char}`)}>
              <span className="radical-card-char">{c.char}</span>
              <span className="radical-card-name">{c.name}</span>
              <span className="radical-card-count">{c.count} {t("unit.kanji")}</span>
            </button>
          ))}
        </div>
        <button className="link-btn" onClick={() => navigate("/browse")}>
          {t("home.everyFamily")}
        </button>
      </section>

      <section className="section">
        <h2 className="section-title">{t("home.getStarted")}</h2>
        <div className="kanji-grid">
          {featured.map((k) => (
            <button key={k.kanji} className="kanji-tile" onClick={() => navigate(`/kanji/${k.kanji}`)}>
              <span className="tile-char">{k.kanji}</span>
              <span className="tile-meaning">{kanjiPrimaryMeaning(k, language) ?? ""}</span>
              <span className="tile-badges">
                {k.jlpt ? <em>{k.jlpt}</em> : null}
                <em>{k.strokeCount} {t("unit.strokes")}</em>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
