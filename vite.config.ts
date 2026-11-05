import { defineConfig } from 'vite';

// base './' : le build fonctionne aussi sur GitHub Pages (sous-dossier)
export default defineConfig({
  base: './',
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 2000 },
});
