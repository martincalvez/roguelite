import { defineConfig } from 'vitest/config';

// base './' : le build fonctionne aussi sur GitHub Pages (sous-dossier)
export default defineConfig({
  base: './',
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 2000 },
  // Tests : uniquement la logique pure (src/systems, src/data), sans Phaser ni navigateur.
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
