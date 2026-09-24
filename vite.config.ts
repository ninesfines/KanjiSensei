import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
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
