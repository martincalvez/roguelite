# État du projet (note de passation)

Mise à jour : 5 novembre 2026. Ce fichier résume ce que l'historique des conversations contenait, pour qu'un autre agent ou une autre session puisse reprendre sans cet historique. Il ne contient aucun secret.

## Le projet
Roguelite d'action 2D façon Archero, jouable sur navigateur PC et téléphone (portrait), jeu personnel de Martin Calvez (pas de store, pas de pub). Phaser 3 + TypeScript strict + Vite. Dépôt : github.com/martincalvez/roguelite (public), jeu publié sur GitHub Pages (https://martincalvez.github.io/roguelite/), installable sur téléphone (PWA).

## Avancement (voir docs/TACHES.md pour le détail)
- **Phases 1 à 3 terminées** : combat, run complet de 20 salles (boss, ange, choix de compétences), butin, équipement, amélioration, fusion, coffres, talents, niveau de compte. 3.6 (équilibrage, `docs/EQUILIBRAGE-CH1.md`) **reste à valider par Martin en jouant 5 runs**.
- **Phase 4 (compte et synchro Supabase)** : 4.0 à 4.4 terminées. 4.2 (connexion par code e-mail) et 4.3 (synchronisation) sont confirmées par Martin sur téléphone et ordinateur. 4.4 : les 14 tests SQL passent, réglages de sécurité confirmés et adresse e-mail dans les anciens commits acceptée (voir `docs/SECURITE.md`).
- **Phase 5 (contenu)** en cours. 5.1 (familiers) est implémentée et publiée, en attente de validation manuelle par Martin. 5.2 (écran des héros et déblocage contre gemmes) en cours. Direction visuelle souhaitée : interface portrait riche en couleurs, personnage et familier au centre, cartes de rareté et reliefs épais, combats lumineux et choix de compétences illustrés ; détails dans `docs/CIBLE-UI.md`.
- Martin n'a pas encore tout joué : les cases ne se cochent qu'après sa confirmation.

## Décisions importantes (et pourquoi)
- **Direction artistique : Archero** (cartoon, très coloré, « dopamine »), pas de fantasy sombre. Captures fournies par Martin comme référence visuelle de la phase 5 : `docs/CIBLE-UI.md`.
- **Équilibrage** : modèle chiffré dans `docs/EQUILIBRAGE-CH1.md`. Un champ `difficulty` par salle (PV) et `roomDamageShare` (part appliquée aux dégâts) ont été ajoutés pour faire monter les ennemis salle par salle.
- **Sauvegarde** : `localStorage` via `GameState`/`SaveManager`, format versionné (`SAVE_VERSION`, actuellement 3). La migration v2→v3 ajoute et équipe la Chouette d'ambre sans écraser la progression existante. Le cloud est optionnel : le jeu ne dépend jamais de Supabase.
- **Cloud** : un seul compte (celui de Martin), **inscriptions publiques fermées**, `signInWithOtp` avec `shouldCreateUser: false`, connexion par **code à 6 chiffres** (pas de lien : un lien s'ouvre dans un autre navigateur que le jeu installé). L'envoi d'e-mails passe par un SMTP gratuit (Resend, expéditeur `onboarding@resend.dev`) uniquement parce que Supabase interdit de modifier le modèle d'e-mail avec son service intégré.
- **Synchro** : `revision` et `updated_at` fixés par le serveur (trigger SQL), écriture conditionnelle (`update … where revision = connue`), jamais d'écrasement silencieux (écran de choix si les deux côtés ont changé). Détails dans `docs/DEPLOIEMENT.md` et `docs/supabase/001_saves.sql`.
- **Aucune clé dans le dépôt** : l'URL et la clé publique de Supabase viennent de `.env.local` (non commité, modèle `.env.example`) et des Variables GitHub Actions. La RLS protège les données ; la clé publique est visible dans le jeu publié par conception.

## Ce qui n'est PAS dans le dépôt
- `.env.local` (clés Supabase de Martin), les **Variables du dépôt GitHub**, et les **réglages du tableau de bord Supabase** (inscriptions fermées, SMTP Resend, modèle d'e-mail « Magic link or OTP » avec le code, URL du site). Voir `docs/TACHES.md`, tâche 4.0, pour la liste.
- Les mots de passe et clés d'envoi : dans le gestionnaire de mots de passe de Martin. Ne les demande jamais dans le chat.
- La mémoire privée de Claude Code (`~/.claude/…`) : son contenu utile est recopié ici et dans CLAUDE.md.

## Pièges connus
- `scene.children.removeAll(true)` ne détruit rien (le `true` = « sans callbacks ») : un champ HTML reste affiché, d'anciens boutons restent actifs. Utiliser `clearScene(this)`.
- Après modification de `.env.local`, relancer `npm run dev`.
- Le navigateur intégré de Claude Code tourne au ralenti quand son volet est caché : les tests visuels de combat y paraissent lents.
- Une salle de l'ange est la salle 5 ; la salle 10 est un mini-boss (Ogre) ; la salle 20 est le boss (Liche).
- Les tests (`npm test`) couvrent la logique pure et l'intégrité des données JSON ; l'affichage se vérifie en jouant.

## Méthode de travail de Martin
Une tâche à la fois, prompt détaillé dans `docs/TACHES.md`, test à la main, puis commit. Le code est commité et poussé à chaque étape (le déploiement GitHub Pages est automatique et lance `npm test` avant le build).
