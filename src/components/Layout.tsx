import { Link, Outlet } from "react-router-dom";
import SearchBar from "./SearchBar";

export default function Layout() {
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
            <Link to="/browse">Browse</Link>
            <Link to="/graph?kind=radical&char=%E5%AE%B8">Graph</Link>
            <Link to="/practice">Practice</Link>
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
