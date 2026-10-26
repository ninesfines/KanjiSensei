import { Link, Outlet } from "react-router-dom";
import SearchBar from "./SearchBar";
import { useI18n, useLanguage } from "@/lib/i18n";

export default function Layout() {
  const { t } = useI18n();
  const { language, setLanguage } = useLanguage();
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <Link to="/" className="brand">
            <span className="brand-kanji">漢</span>
            <span className="brand-name">KanjiSensei</span>
          </Link>
          <SearchBar />
          <nav className="app-nav">
            <Link to="/browse">{t("nav.browse")}</Link>
            <Link to="/graph?kind=radical&char=%E5%AE%B8">{t("nav.graph")}</Link>
            <Link to="/practice">{t("nav.practice")}</Link>
          </nav>
          <label className="language-select">
            <span className="sr-only">{t("language.label")}</span>
            <select aria-label={t("language.label")} value={language} onChange={(e) => setLanguage(e.target.value as "en" | "es")}>
              <option value="en">{t("language.english")}</option>
              <option value="es">{t("language.spanish")}</option>
            </select>
          </label>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>{t("footer.data")}</span>
      </footer>
    </div>
  );
}
