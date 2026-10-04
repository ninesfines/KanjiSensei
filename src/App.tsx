import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import KanjiPage from "./pages/KanjiPage";
import RadicalPage from "./pages/RadicalPage";
import BrowsePage from "./pages/BrowsePage";
import NotFound from "./pages/NotFound";

const GraphPage = lazy(() => import("./pages/GraphPage"));
const PracticePage = lazy(() => import("./pages/PracticePage"));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/kanji/:char" element={<KanjiPage />} />
        <Route path="/radical/:char" element={<RadicalPage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route
          path="/graph"
          element={
            <Suspense fallback={<div className="page muted">Loading graph…</div>}>
              <GraphPage />
            </Suspense>
          }
        />
        <Route
          path="/practice"
          element={
            <Suspense fallback={<div className="page muted">Loading practice…</div>}>
              <PracticePage />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
