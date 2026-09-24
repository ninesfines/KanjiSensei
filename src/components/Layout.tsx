import { Outlet } from "react-router-dom";
import SearchBar from "./SearchBar";

export default function Layout() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <a href="/" className="brand">
            <span className="brand-kanji">漢</span>
            <span className="brand-name">KanjiSensei</span>
          </a>
          <SearchBar />
          <nav className="app-nav">
            <a href="/browse">Browse</a>
            <a href="/graph?kind=radical&char=%E5%AE%B8">Graph</a>
          </nav>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>Data: EDRDG Kanjidic2/JMdict/Radkfile · KanjiVG · Kanjium</span>
      </footer>
    </div>
  );
}
