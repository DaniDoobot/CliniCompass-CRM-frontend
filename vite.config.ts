import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // ⚠️  Proxies de desarrollo — NO disponibles en producción.
    // En producción configurar Nginx o Edge Functions (ver Fase 4 del plan).
    proxy: {
      "/api/doobot": {
        target: "https://demo.doobot.ai",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/doobot/, ""),
        cookieDomainRewrite: "localhost",
        secure: false,
      },
      "/api/meta": {
        target: "https://graph.facebook.com",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/meta/, ""),
        secure: false,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
