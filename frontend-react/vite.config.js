import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // listen on all interfaces — required to be reachable
                // from outside the Docker container, harmless locally
    watch: {
      usePolling: true, // Docker bind mounts often don't emit native
                         // filesystem events, so hot-reload needs
                         // polling to detect file changes
    },
  },
});