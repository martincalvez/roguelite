# État du projet (note de passation)

Mise à jour : 6 novembre 2026. Ce fichier résume ce que l'historique des conversations contenait, pour qu'un autre agent ou une autre session puisse reprendre sans cet historique. Il ne contient aucun secret.

## Le projet
Roguelite d'action 2D façon Archero, jouable sur navigateur PC et téléphone (portrait), jeu personnel de Martin Calvez (pas de store, pas de pub). Phaser 3 + TypeScript strict + Vite. Dépôt : github.com/martincalvez/roguelite (public), jeu publié sur GitHub Pages (https://martincalvez.github.io/roguelite/), installable sur téléphone (PWA).

## Avancement (voir docs/TACHES.md pour le détail)
- **Phases 1 à 3 terminées** : combat, run complet de 20 salles (boss, ange, choix de compétences), butin, équipement, amélioration, fusion, coffres, talents, niveau de compte. 3.6 (équilibrage, `docs/EQUILIBRAGE-CH1.md`) **reste à valider par Martin en jouant 5 runs**.
- **Phase 4 (compte et synchro Supabase)** : 4.0 à 4.4 terminées. 4.2 (connexion par code e-mail) et 4.3 (synchronisation) sont confirmées par Martin sur téléphone et ordinateur. 4.4 : les 14 tests SQL passent, réglages de sécurité confirmés et adresse e-mail dans les anciens commits acceptée (voir `docs/SECURITE.md`).
- **Phase 5 (contenu)** en cours. 5.1 (familiers), 5.2 (héros) et 5.3 (chapitres 2–3) sont implémentées et publiées ; validation manuelle en jeu à confirmer. **5.5 (graphismes et sensations de combat) est en cours**, avant 5.4, conformément au choix de Martin. Déjà publiés : accueil illustré, chapitres simplifiés, équipement et boutique colorés (`6f73ff6`, `4613607`, `db72343`), sprites d'Aldric et de la Chouette d'ambre (`1e791e5`, `f8261e7`), décor, ennemis et butin Gemini (`3482cba`), cartes de choix de capacité (`ae49982`), police Lilita One locale avec contour/ombre (`7030092`), correction initiale des collisions et sprite de remplacement des gobelins (`e8898b8`, `40b227b`). Publié (`fe4cfa7`) : navigation ennemie autour des blocs, tirs et ciblage limités aux lignes de vue, joystick plus nerveux, vitesse accrue, difficulté qui tient compte de l'équipement, projectiles illustrés, texte plus lisible et familier replacé pour ne plus masquer Aldric. Les blocs arrêtent les entités et absorbent les tirs. Build et 164 tests locaux réussis ; contrôle visuel dans le navigateur et déploiement GitHub Pages réussis. Reste à confirmer sur iPhone la lisibilité, les détours d'ennemis et le placement du familier, et à fournir des sprites distincts pour davantage d'ennemis et d'équipements, plus des pièges, récompenses et animations. La vidéo fournie par Martin est la référence de combat/Survie ; son relevé détaillé et les limites de ce qu'elle montre sont dans `docs/CIBLE-UI.md`.
- **Mode Survie 5.4** : pas encore commencé. Cible vidéo : salles/couloirs variés, combat en mouvement, pièges, choix de capacité et progression visible `5/50`, grand ennemi bleu à barre de vie. L'enregistrement s'arrête avant la fin ; il ne confirme ni l'après-50 ni l'écran final. À décider avant implémentation : la survie s'arrête-t-elle à 50, ou continue-t-elle avec un record ?
- Martin confirme que le problème de porte de sortie est réglé. La vérification visuelle de la nouvelle police et du héros agrandi sur téléphone reste à faire.
- Martin n'a pas encore tout joué : les cases ne se cochent qu'après sa confirmation.

## Décisions importantes (et pourquoi)
- **Direction artistique : Archero** (cartoon, très coloré, « dopamine »), pas de fantasy sombre. Captures fournies par Martin comme référence visuelle de la phase 5 : `docs/CIBLE-UI.md`.
- **Équilibrage** : modèle chiffré dans `docs/EQUILIBRAGE-CH1.md`. Un champ `difficulty` par salle (PV) et `roomDamageShare` (part appliquée aux dégâts) ont été ajoutés pour faire monter les ennemis salle par salle.
- **Réponse à l'équipement** : au début de chaque salle, les PV et dégâts ennemis reçoivent un bonus borné calculé depuis l'attaque, la vitesse d'attaque et les PV max du héros. Les coefficients et la limite sont dans `src/data/combat.json`. Un héros neuf garde la courbe actuelle ; les équipements avancés rencontrent une résistance plus forte.
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

## Assets reçus et préparation (5 novembre 2026)

Martin a fourni 11 images Gemini pour le décor et le combat. Les JPG qui montrent un damier n'ont pas de transparence réelle. Les PNG préparés sont dans `public/assets/generated/gemini-transparent/` : gemme d'XP, pièce, tourelle rouge, pilier, chevalier bleu, golems vert/rose, planche d'Aldric en 4×4 et ses 16 cases, planche de chouette en 1×4 et ses 4 poses. Les textures de mur et d'eau ont été converties en PNG opaques, car le motif fait partie de l'image. Les gros visuels sont réduits à 512 px, les icônes à 256 px pour le chargement mobile.

La méthode qui a fonctionné : script Python/Pillow `scripts/remove_checkerboard.py`, qui rend transparents les pixels neutres reliés au bord. Chaque cellule des planches est détourée séparément pour que les séparateurs ne piègent pas le damier. Les halos très lumineux de la gemme et de la pièce nécessitent un seuil plus large ; leur bord lumineux est donc un peu atténué. Relancer la conversion complète avec : `python3 scripts/remove_checkerboard.py --manifest scripts/gemini-assets-manifest.json --source-dir ~/Downloads --output-dir public/assets/generated/gemini-transparent` (Pillow requis, aucune dépendance ajoutée au jeu).

**État :** première intégration faite : Aldric animé par orientation dans le combat et agrandi, chouette en familier, XP en gemme, pièce sur le butin, tourelle immobile, golems, chevalier bleu, textures de pierre/eau et pilier dans les salles. `npm run build` passe. La validation manuelle sur téléphone reste à faire ; la phase 5.5 continue pour les pièges/attaques, le butin et les autres écrans.
