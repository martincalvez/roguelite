# CLAUDE.md — Roguelite Fantasy

Lis ce fichier en entier avant chaque tâche. Il fait autorité sur tes habitudes.

## Le jeu

Roguelite d'action 2D vu de dessus, façon Archero, univers **fantasy classique**. Jeu personnel, joué par Martin et ses proches : pas de store, pas de pub, pas d'achat.

- Le héros se déplace pour esquiver ; **il tire automatiquement sur l'ennemi le plus proche quand il est immobile** (réglage `settings.alwaysShoot` = tir permanent).
- Un run = des salles enchaînées (chapitre de 20 salles : combat, ange, mini-boss salle 10, boss salle 20). Chaque niveau gagné → choix d'1 compétence parmi 3. À la mort ou à la victoire : écran de butin.
- Entre les runs : équipement par slots, rareté + fusion, talents, héros, familiers.
- Plus tard : mode Survie (vagues infinies dans une arène) et synchro PC ↔ téléphone.
- Plateformes : navigateur PC (clavier ZQSD / flèches) et téléphone (joystick virtuel flottant), écran **portrait**.

Plan complet et roadmap : `docs/TACHES.md` (une tâche = une demande).

## Direction artistique (décision de Martin, 2026-11-05)

Le style visé est celui d'**Archero** : cartoon, très coloré, vif, lisible, "dopamine" (couleurs saturées et lumineuses, gros retours visuels, récompenses qui claquent). **Pas** de fantasy sombre ni de palette terne. Conséquences :

- Palette : couleurs saturées et claires, sols colorés (pas de violet très sombre), ennemis aux teintes distinctes et vives, contours épais.
- Game feel prioritaire : flashs, particules, chiffres de dégâts, tremblements, orbes d'XP et pièces brillants (tâche 1.6).
- Les formes générées dans `BootScene` doivent déjà suivre ce style (couleurs vives, contour net).
- La palette actuelle de `config.ts` (`COLORS`) est sombre : à rafraîchir quand Martin le demande, pas avant.

## Stack

- Phaser 3 + TypeScript strict + Vite. Pas d'autre framework, pas de dépendance sans demande explicite.
- Physique : Arcade. Résolution logique 720 × 1280 (`src/config.ts`), mise à l'échelle FIT.
- Sauvegarde : `localStorage` via `SaveManager` (synchro Supabase en phase 4 seulement).

## Architecture

```
src/
  main.ts            config Phaser + liste des scènes
  config.ts          constantes (taille, couleurs, raretés, clés de scènes)
  types.ts           TOUTES les interfaces de données — à lire avant de coder
  data/*.json        chiffres du jeu (objets, compétences, ennemis, chapitres, héros, talents, passifs)
  data/index.ts      seul point d'accès aux données (ITEMS, getItem()…)
  scenes/            une scène Phaser par écran
  entities/          Player, Enemy, Projectile… (classes Phaser)
  systems/           logique pure sans Phaser : stats, compétences, butin, fusion
  state/GameState.ts état permanent du joueur (seul à modifier la sauvegarde)
  state/RunState.ts  état du run en cours (à créer en phase 2)
  ui/                joystick, HUD, boutons, panneaux
```

## Règles non négociables

1. **Aucun chiffre d'équilibrage en dur dans le code.** PV, dégâts, vitesses, coûts, taux : dans `src/data/*.json`, typés par `src/types.ts`. Un nouveau champ = l'ajouter d'abord dans `types.ts`.
2. **Stats en couches** : toujours passer par `computeStats()` (`src/systems/stats.ts`). Formule : `(base + flats) × (1 + percents)`. Ne jamais modifier une stat directement sur le joueur.
3. **Logique pure dans `systems/`** : pas d'import de Phaser dans `systems/`, pour pouvoir la tester et la réutiliser.
4. **Événements plutôt que dépendances** : un ennemi émet `enemy-died`, la scène compte ; pas de références croisées entre entités.
5. **Sauvegarde** : uniquement via `GameState` / `SaveManager`. Tout changement de format → `SAVE_VERSION + 1` et une étape dans `migrate()`. Ne jamais casser une ancienne sauvegarde.
6. **Mobile d'abord** : tout bouton fait au moins 88 px de haut, rien d'important dans les 60 px du bord bas, multitouch activé. Tester mentalement chaque écran au doigt.
7. **Performance** : pools d'objets (groupes Phaser) pour projectiles et ennemis, pas de `new` dans `update()`. Viser 60 fps sur un téléphone moyen.
8. **Graphismes** : formes générées dans `BootScene` tant que la phase 5 n'a pas commencé. Ne pas chercher d'assets.
9. Textes du jeu et commentaires en **français**. Noms de variables et fonctions en anglais.

## Méthode de travail

- **Une tâche à la fois**, celle demandée. Ne pas anticiper les tâches suivantes, ne pas refactorer hors sujet.
- Avant de coder : lis les fichiers concernés + `types.ts`. Annonce en 3 lignes max ce que tu vas faire.
- Après avoir codé : `npm run build` doit passer sans erreur ni avertissement TypeScript, et `npm test` sans échec. Corrige avant de rendre la main.
- Toute logique pure nouvelle ou modifiée dans `src/systems/` s'accompagne de tests (`*.test.ts` à côté du fichier). Toute nouvelle donnée JSON avec des références (ids) est couverte par `src/data/data.test.ts`.
- Termine par : ce qui a changé (fichiers), comment le tester à la main (2–4 étapes), et ce qui reste éventuellement bancal.
- Si une tâche contredit ce fichier ou semble mal conçue, **dis-le avant de coder** au lieu d'improviser.
- Ne coche une tâche dans `docs/TACHES.md` que lorsque Martin a confirmé qu'elle marche.

## Références externes

- https://github.com/rgascons/galore : survivor-like roguelite en Phaser + TypeScript + Vite (même stack que nous) : vagues, montée de niveau, boutique persistante. Assets Kenney (CC).
- https://github.com/manucaralmo/ironharch : clone d'Archero en JavaScript + canvas, sans moteur : boucle tir à l'arrêt, vagues, boss. Démo : https://manucaralmo.github.io/ironharch/ (clavier seulement).
- https://rexrainbow.github.io/phaser3-rex-notes/docs/site/virtualjoystick : joystick virtuel de référence pour Phaser 3 (tâche 1.2 : on code le nôtre, mais on peut s'inspirer de son API).
- https://phaser.io/examples : exemples officiels Phaser 3 (pools, Arcade physics, particules, caméra, entrées tactiles).

## Sécurité : le dépôt GitHub est PUBLIC

Tout ce qui est commité est visible par tout le monde, y compris dans l'historique (supprimer un fichier plus tard ne l'efface pas).

- Ne jamais commiter : clés d'API, tokens, mots de passe, fichiers `.env`, données personnelles (e-mail, adresse, téléphone, noms de proches), captures ou sauvegardes contenant des infos privées.
- Avant chaque `git add`/`git commit` : relire `git status` et `git diff --staged`. En cas de doute, ne pas commiter et demander.
- Phase 4 (Supabase) : seule la clé **anon** (publique par conception) peut apparaître côté client, et uniquement avec les règles RLS actives. La clé **service_role** ne doit jamais entrer dans ce dépôt ni dans le code du jeu.
- Si un secret est commité par erreur : le révoquer immédiatement chez le fournisseur (le réécrire dans l'historique ne suffit pas), puis prévenir Martin.

## Commandes

- `npm run dev` → jeu sur http://localhost:5173 (et sur le téléphone via l'IP locale affichée, même Wi-Fi)
- `npm run build` → vérification TypeScript + build dans `dist/`
- `npm run typecheck` → vérification seule
- `npm test` → tests automatiques (Vitest) de la logique pure et de l'intégrité des données ; `npm run test:watch` pour les relancer en continu
