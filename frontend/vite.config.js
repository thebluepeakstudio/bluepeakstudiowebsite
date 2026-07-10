import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const backendTarget = "http://localhost:10000";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        crm: resolve(__dirname, "crm.html"),
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true,
      },
      "/sitemap.xml": {
        target: backendTarget,
        changeOrigin: true,
      },
      "/robots.txt": {
        target: backendTarget,
        changeOrigin: true,
      },
      "/rss.xml": {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
});
