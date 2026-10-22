import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative Pfade: läuft auf GitHub Pages (/mausi-blast/) genauso wie auf jedem anderen Host.
  base: "./",
  test: { include: ["tests/**/*.test.ts"] },
});
