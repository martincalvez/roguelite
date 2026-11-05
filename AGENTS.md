# AGENTS.md — Roguelite Fantasy

Ce fichier est lu par les agents de code (Codex, etc.). **La source de vérité des règles est `CLAUDE.md`** (même dossier) : lis-le en entier avant toute tâche, puis `docs/ETAT-DU-PROJET.md` (où on en est, décisions prises, pièges connus) et `docs/TACHES.md` (la feuille de route, une tâche à la fois).

Rappels essentiels (détails dans CLAUDE.md) :

- Réponds en **français**, tutoiement, ton direct, **sans emoji**. Contredis quand un point est faux ou incertain.
- Le **dépôt GitHub est public** : jamais de clé, de mot de passe, de `.env`, ni de donnée personnelle dans un fichier ou un commit. La clé `service_role`/`secret` de Supabase ne doit jamais entrer dans ce dépôt.
- Une tâche à la fois. Après chaque modification : `npm run build` et `npm test` doivent passer. Ne coche une tâche dans `docs/TACHES.md` que quand Martin a confirmé qu'elle marche.
- Aucun chiffre d'équilibrage en dur dans le code (JSON dans `src/data/`), logique pure dans `src/systems/` avec tests, pas de nouvelle dépendance sans accord explicite de Martin.
- Phaser : `scene.children.removeAll(true)` ne détruit rien. Utilise `clearScene(this)` (`src/ui/clearScene.ts`) pour reconstruire un écran.
- Images générées avec damier : le damier d’un JPG est imprimé dans l’image. Utilise `scripts/remove_checkerboard.py` et traite les planches par cellules ; garde les textures de sol/eau opaques.

Commandes : `npm run dev` (jeu sur http://localhost:5173), `npm run build`, `npm test`.
