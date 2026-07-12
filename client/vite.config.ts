import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/auth": "http://localhost:3000",
      "/notes": "http://localhost:3000",
      "/folders": "http://localhost:3000",
      "/tags": "http://localhost:3000",
      "/shared": "http://localhost:3000",
      "/health": "http://localhost:3000",
      "/me": "http://localhost:3000",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
