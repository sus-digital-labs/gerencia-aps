import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const checkout = resolve(import.meta.dirname, "..");
const frontend = resolve(checkout, "apps/frontend");

export default defineConfig({
  root: frontend,
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "local-analytics-html",
      transformIndexHtml: {
        order: "pre",
        handler(html) {
          return html.replace(/<script\b[^>]*%VITE_ANALYTICS_ENDPOINT%[^>]*><\/script>/i, "");
        },
      },
    },
  ],
  resolve: {
    alias: {
      "@/lib/trpc": resolve(frontend, "src/local/trpc.ts"),
      "@": resolve(frontend, "src"),
      "@shared": resolve(checkout, "shared"),
      "@assets": resolve(checkout, "attached_assets"),
    },
  },
  define: {
    "import.meta.env.VITE_SUS_ANALYTICS_PEC": JSON.stringify("true"),
  },
  build: {
    outDir: resolve(checkout, "dist/public"),
    emptyOutDir: true,
  },
});
