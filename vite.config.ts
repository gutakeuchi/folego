import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    cssMinify: false,
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
  },
});
