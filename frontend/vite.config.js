import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendTarget = "http://localhost:10000";

export default defineConfig({
  plugins: [react()],
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
