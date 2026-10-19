import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
);

// Куда проксировать /api в dev-режиме. В docker/dev/compose.yml = http://backend:3000.
// Благодаря прокси браузер видит frontend и API как один origin:
// cookie сессии и CSRF работают без CORS.
const apiTarget = process.env.VITE_PROXY_TARGET || "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: false },
    },
    watch: {
      // Нативные события ФС ненадёжны через bind-mount Docker Desktop
      // (Windows/macOS) — polling гарантирует подхват изменений.
      usePolling: true,
      interval: 300,
    },
  },
  resolve: {
    alias: {
      "@app": path.resolve(__dirname, "src/app"),
      "@shared": path.resolve(__dirname, "src/shared"),
      "@entities": path.resolve(__dirname, "src/entities"),
      "@features": path.resolve(__dirname, "src/features"),
      "@pages": path.resolve(__dirname, "src/pages"),
      "@widgets": path.resolve(__dirname, "src/widgets"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx}"],
  },
});
