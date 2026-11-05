import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// Politique de sécurité du contenu (CSP), ajoutée seulement au build de production (pas en développement,
// où le rechargement à chaud de Vite a besoin de scripts et de connexions supplémentaires).
//  - rien n'est chargé depuis un autre site, sauf les appels à Supabase (connect-src) ;
//  - aucun script en ligne ni eval (script-src 'self') ;
//  - pas de plugin, pas de formulaire vers l'extérieur.
// Note : `frame-ancestors` ne peut pas être posé par une balise meta (GitHub Pages ne permet pas d'en-têtes).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // les champs de saisie du jeu utilisent des styles en ligne
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://*.supabase.co",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'roguelite-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`);
    },
  };
}

// base './' : le build fonctionne aussi sur GitHub Pages (sous-dossier)
export default defineConfig({
  base: './',
  plugins: [cspPlugin()],
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 2000 },
  // Tests : uniquement la logique pure (src/systems, src/data), sans Phaser ni navigateur.
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
