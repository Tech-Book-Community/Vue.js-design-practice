// vite.config.ts
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/slidev-frontend-demo/",
  plugins: [UnoCSS()],
});
