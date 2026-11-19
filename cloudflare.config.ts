import { defineConfig } from "cf/config";

// Assets-only Worker: the app is fully client-side, built by Vite into ./dist
// and deployed with `cf deploy dist`.
export default defineConfig({
  worker: {
    name: "bangkok-buildable",
    compatibilityDate: "2026-11-01",
  },
});
