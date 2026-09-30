import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages project-site base (repo name) for CI builds only; local dev
  // and preview stay at "/" so deep-link testing hits the dev server root.
  base: process.env.CI ? "/KanjiSensei/" : "/",
  plugins: [react()],
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          data: ["./src/data/kanji.json"],
          graph: ["cytoscape"],
        },
      },
    },
  },
  resolve: {
    alias: { "@": "/src" },
  },
});
