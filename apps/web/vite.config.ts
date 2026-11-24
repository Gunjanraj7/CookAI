import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

/** The repo root holds the single .env shared with the API. */
const envDir = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig(({ mode }) => {
  // Load all keys (prefix "") so the dev server can read API_PORT / WEB_PORT.
  // Only VITE_-prefixed keys are ever exposed to browser code.
  const env = loadEnv(mode, envDir, "");
  const apiPort = Number(env.API_PORT || 5000);
  const webPort = Number(env.WEB_PORT || 5173);

  return {
    envDir,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      port: webPort,
      strictPort: true,
      // The browser calls /api on the web origin; Vite forwards it to the API.
      proxy: { "/api": { target: `http://localhost:${apiPort}`, changeOrigin: true } },
    },
    preview: {
      port: webPort,
      proxy: { "/api": { target: `http://localhost:${apiPort}`, changeOrigin: true } },
    },
  };
});
