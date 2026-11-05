# Tâches — prompts prêts à coller

Mode d'emploi : dans Claude Code (modèle **Sonnet**), colle le bloc « Prompt » d'**une seule** tâche. Teste, puis commit (`git commit -am "1.1 joueur"`) avant la suivante. Coche la case quand c'est validé.

## Quand repasser sur Opus

- Au **début des phases 3 et 4** : « Lis CLAUDE.md et docs/TACHES.md, détaille les tâches de la phase N en prompts du même format. »
- Quand Sonnet **échoue deux fois** sur le même bug.
- À **chaque porte de phase** : « Fais une revue de l'architecture et du code de la phase N par rapport à CLAUDE.md, liste les problèmes par gravité. »
- Pour l'**équilibrage chiffré** (courbes d'XP, coûts, taux de drop) et tout ce qui touche à la **sécurité** (comptes, Supabase).

---

## Phase 1 — Combat (porte : une salle reste fun 5 parties de suite)

### [x] 1.1 Joueur et déplacements clavier

```
Tâche 1.1. Crée src/entities/Player.ts : un sprite Arcade (texture 'player') dont la vitesse vient de stats.moveSpeed (GameState.heroStats()). Déplacements ZQSD + flèches, diagonale normalisée. Dans RunScene, remplace le placeholder : arène rectangulaire avec murs (bords) que le joueur ne peut pas traverser, bandeau HUD de 120 px en haut laissé vide. Expose sur Player une méthode getMoveVector() qui renvoie le vecteur d'entrée normalisé (sera aussi alimenté par le joystick à la tâche suivante) et un getter isMoving.
```
Validation : le cercle bleu se déplace à vitesse constante, y compris en diagonale, et reste dans l'arène.

### [x] 1.2 Joystick virtuel flottant

```
Tâche 1.2. Crée src/ui/VirtualJoystick.ts : joystick flottant qui apparaît là où le doigt touche la moitié basse de l'arène, base + manette, rayon max 90 px, zone morte 10 %. Il produit un vecteur normalisé (0 à 1 en intensité). Player.getMoveVector() combine clavier et joystick (le joystick prime s'il est actif). Le joystick ne s'affiche que sur écran tactile ou au clic souris maintenu. Pas de dépendance externe.
```
Validation : sur téléphone (`npm run dev`, même Wi-Fi), le héros se pilote au pouce, sans scroll ni zoom de la page.

### [x] 1.3 Ennemis et pool

```
Tâche 1.3. Crée src/entities/Enemy.ts et un groupe Phaser poolé dans RunScene. Chaque ennemi est configuré par un EnemyDef (src/data/enemies.json) : texture cercle générée dans BootScene à sa couleur et son rayon. Comportements selon behavior : 'melee' fonce vers le joueur ; 'shooter' garde ses distances (≈300 px) et tire un projectile vers le joueur selon fireRate ; 'spreader' tire projectileCount projectiles en éventail. Projectiles ennemis dans leur propre pool (texture 'enemy-projectile'), détruits sur les murs. Fais apparaître les ennemis de la salle 1 du chapitre ch1 à des positions aléatoires dans la moitié haute. Pas encore de dégâts au joueur.
```
Validation : 3 gobelins foncent vers le héros ; en modifiant chapters.json pour mettre des archers, ils tirent.

### [x] 1.4 Tir automatique

```
Tâche 1.4. Crée src/entities/Projectile.ts et un pool de projectiles joueur (texture 'projectile'). Quand le joueur est immobile (ou toujours si GameState.data.settings.alwaysShoot), il tire vers l'ennemi vivant le plus proche à la cadence stats.attackSpeed, vitesse stats.projectileSpeed. Dégâts = stats.attack, coup critique selon critChance × critDamage. Les ennemis perdent des PV et meurent à 0 (émettre l'événement 'enemy-died' avec l'EnemyDef). Calcule les dégâts dans une fonction pure src/systems/combat.ts. Le héros se tourne vers sa cible.
```
Validation : immobile, le héros tue les gobelins ; en mouvement, il ne tire pas.

### [x] 1.5 Dégâts au joueur, mort et victoire

```
Tâche 1.5. Le joueur subit des dégâts au contact des ennemis et des projectiles ennemis (damage de l'EnemyDef), avec 0,6 s d'invulnérabilité (clignotement) et une chance d'esquive stats.dodge (afficher « Esquive »). Ajoute un HUD (src/ui/Hud.ts) dans le bandeau du haut : barre de PV avec valeur. À 0 PV : écran « Défaite » avec bouton « Menu ». Quand tous les ennemis de la salle sont morts : écran « Salle terminée » avec bouton « Menu » (l'enchaînement des salles viendra en phase 2).
```
Validation : on peut perdre et gagner une salle, et revenir au menu.

### [x] 1.6 Sensations (game feel)

```
Tâche 1.6. Ajoute du retour visuel, sans toucher à l'équilibrage : flash blanc 80 ms sur un ennemi touché, léger recul (knockback) des ennemis touchés, chiffres de dégâts flottants (jaunes et plus gros pour les critiques), petit tremblement d'écran quand le joueur est touché, petite explosion de particules à la mort d'un ennemi. Tout doit rester fluide avec 15 ennemis à l'écran. Regroupe ces effets dans src/ui/Fx.ts (Phaser autorisé ici, pas dans systems/).
```
Validation : les coups « se sentent » ; pas de baisse de fluidité sur téléphone.

**Porte de phase 1 → revue Opus.**

---

## Phase 2 — Run complet (porte : run de 10 min jouable sur PC et téléphone)

### [x] 2.1 État du run et XP

```
Tâche 2.1. Crée src/state/RunState.ts (état du run en cours : niveau, XP, compétences prises avec leurs stacks, or gagné, salle actuelle). Ajoute src/data/progression.json typé dans types.ts : XP nécessaire par niveau de run (tableau). Les ennemis morts lâchent des orbes d'XP (texture 'xp-orb') aspirés par le joueur quand la salle est vidée. Barre d'XP dans le HUD. Émettre 'level-up' quand un niveau est atteint.
```
Validation : la barre d'XP se remplit, le niveau monte.

### [x] 2.2 Choix d'une compétence parmi 3

```
Tâche 2.2. Crée src/systems/skills.ts (pur) : tirage pondéré (weight) de 3 compétences distinctes, en excluant celles à maxStacks. Crée une scène overlay SkillPickScene qui met RunScene en pause et propose 3 cartes (nom, description, stacks actuels), grandes et lisibles au doigt. Applique tout de suite les compétences 'stat' et 'heal' via RunState → les stats du joueur sont recalculées avec computeStats(heroStats base + modificateurs du run). Les autres types sont enregistrés mais sans effet pour l'instant.
```
Validation : à chaque niveau, 3 choix ; Force brute augmente visiblement les dégâts.

### [x] 2.3 Compétences de tir

```
Tâche 2.3. Implémente les effets 'multishot' (projectiles parallèles espacés), 'diagonal' (+2 à ±45°), 'rear' (+1 vers l'arrière), 'pierce' (traverse N ennemis), 'ricochet' (rebondit vers l'ennemi le plus proche non touché). Les effets se cumulent. Inclure les passifs d'objets et de héros (passives.json) comme des compétences acquises au début du run.
```
Validation : prendre multishot + diagonale + ricochet donne un tir en éventail qui rebondit.

### [x] 2.4 Effets et orbe

```
Tâche 2.4. Implémente 'burn' (dégâts dans le temps, teinte orange), 'freeze' (ralentissement, teinte bleue), 'orb' (orbes qui tournent autour du héros et blessent au contact, avec un délai par ennemi). Les durées et valeurs viennent de skills.json.
```

### [x] 2.5 Enchaînement des salles

```
Tâche 2.5. Quand une salle est vidée, une porte s'ouvre en haut de l'arène ; la traverser charge la salle suivante du chapitre (PV, XP et compétences conservés). Compteur « Salle X/20 » dans le HUD. Salle 'angel' : pas d'ennemis, choix entre « Soigner 40 % » et une compétence rare. Les PV/dégâts ennemis sont multipliés par chapter.difficulty. Victoire après la dernière salle.
```

### [x] 2.6 Mini-boss et boss

```
Tâche 2.6. Comportement 'boss' : alterne 3 patterns toutes les ~4 s (ruée vers le joueur, cercle de projectileCount projectiles, salve visée de 3 tirs). Barre de vie de boss en haut de l'écran avec son nom. Bref avertissement visuel (0,5 s) avant chaque attaque, pour que ce soit esquivable.
```

### [x] 2.7 Fin de run et butin

```
Tâche 2.7. Crée LootScene : affiche or gagné, XP de compte gagnée (ajoute la règle dans progression.json), salle atteinte, et 0 à 2 objets lâchés (src/systems/loot.ts pur : tirage pondéré par rareté, table dans un JSON). Tout est ajouté via GameState puis sauvegardé. Mettre à jour bestChapter. Bouton « Menu ».
```
Validation : recharger la page conserve l'or et les objets.

### [x] 2.8 Arme équipable

```
Tâche 2.8. Dans le menu, ajoute un sélecteur simple d'arme parmi les armes de l'inventaire. Le champ weapon de l'ItemDef change le tir : 'arrow' normal, 'bolt' gros projectile lent perçant (pierce), 'shuriken' petit et rapide. Les stats de l'arme passent par heroStats().
```

### [x] 2.9 Mise en ligne et installation sur téléphone

```
Tâche 2.9. Prépare le déploiement GitHub Pages via une GitHub Action (build Vite, publication de dist/). Ajoute un manifest PWA (nom, icône simple générée, mode standalone, orientation portrait) et un service worker minimal pour que le jeu s'installe sur l'écran d'accueil. Explique-moi les réglages à faire sur GitHub.
```
Validation : le jeu s'ouvre depuis une icône sur le téléphone, en plein écran.

**Porte de phase 2 → revue Opus. Fin du prototype.**

---

## Phase 3 — Méta-progression (porte : on a envie de relancer un run pour progresser)

Détaillée en fin de phase 2 (par Sonnet ; Opus recommandé pour la 3.6). Chaque tâche suit le même format que les phases 1 et 2.

### Décisions de conception (valeurs par défaut, modifiables avant de commencer)

- **Gemmes** : gagnées en fin de run (bonus de victoire, boss tués). Elles ouvrent les coffres dorés (3.4) et débloqueront les héros (5.2).
- **Parchemins** : un type par slot (arme, armure, anneau, amulette, familier), lâchés en fin de run comme le reste du butin (3.2).
- **Niveau de compte** : il débloque les talents (chacun a un niveau de compte requis, 3.5). Pas de bonus de stats direct.
- **Sauvegarde** : tout nouveau champ de `SaveData` = `SAVE_VERSION + 1` et une étape dans `migrate()`. La 3.2 passe à la version 2.
- **Dépôt public** : aucune donnée personnelle ni clé dans les fichiers (voir CLAUDE.md).

### [x] 3.1 Écran équipement

```
Tâche 3.1. Crée src/scenes/EquipmentScene.ts, accessible par un bouton « ÉQUIPEMENT » du menu (hauteur ≥ 88 px ; réorganise le menu en liste verticale de gros boutons : JOUER, ÉQUIPEMENT). Retire le sélecteur d'arme provisoire du menu (il est remplacé par cet écran). En haut : 6 cases de slot (weapon, armor, ring1, ring2, amulet, pet) avec l'objet équipé (nom, couleur de rareté, niveau) ou vide. Dessous : l'inventaire en grille de cartes (4 par ligne, défilement vertical au doigt si besoin), triée par rareté puis nom. Toucher une carte ouvre un panneau de détail : nom, rareté, niveau, description, stats de l'objet (modifiers avec rareté et niveau via itemModifiers), passif de rareté éventuel, et la DIFFÉRENCE de stats du héros si on l'équipait (vert si mieux, rouge si moins bien, pour chaque stat qui change). Bouton « Équiper » (un anneau va dans ring1 ou ring2, le premier libre sinon ring1) et « Retirer » pour un objet équipé. Logique pure dans src/systems/equipment.ts : slotAccepts(slot, itemSlotType), statDiff(before, after). GameState gagne equipItem(uid, slot), unequip(slot) et heroStatsWith(equipped) pour simuler un équipement sans le sauvegarder. Bouton « Retour » en haut. Rien d'important dans les 60 px du bord bas.
```
Validation : on équipe et retire des objets, la différence de stats est juste (vert/rouge), et le menu affiche les nouveaux PV et ATQ.

### [x] 3.2 Amélioration d'objet

```
Tâche 3.2. Passe SAVE_VERSION à 2 : SaveData gagne scrolls: Record<ItemSlotType, number> (migrate() l'initialise à 0 pour une ancienne sauvegarde). Crée src/data/upgrade.json (typé dans types.ts) : niveau max par rareté, et le coût de chaque niveau en or et en parchemins. Logique pure dans src/systems/upgrade.ts : upgradeCost(level, rarity), canUpgrade(item, gold, scrolls). Les parchemins sont lâchés en fin de run : ajoute-les à loot.json (nombre et type tirés au hasard), à RunRewards, à GameState.applyRunRewards et à l'écran de butin. Dans le panneau de détail de l'écran équipement, bouton « Améliorer » (coût affiché, grisé si impossible) : retire l'or et les parchemins du slot de l'objet, monte son niveau (les stats suivent déjà ITEM_GROWTH_PER_LEVEL) et sauvegarde. Affiche or et parchemins dans l'en-tête de l'écran équipement.
```
Validation : un objet monte de niveau, ses stats augmentent, l'or et les parchemins baissent ; une ancienne sauvegarde se charge sans erreur.

### [x] 3.3 Fusion et passifs de rareté

```
Tâche 3.3. Passe SAVE_VERSION à 3 si besoin de migrer. D'abord, fais fonctionner les passifs de type 'stat' : startingPassives() renvoie des PassiveDef dont l'effet 'stat' doit entrer dans GameState.heroStats() comme les compétences (via les modificateurs). Ajoute dans items.json et passives.json des passifs de rareté pour chaque objet (en réutilisant les effets existants : multishot, pierce, ricochet, burn, freeze, orb, stat), débloqués à partir d'une rareté croissante. Logique pure dans src/systems/fusion.ts : canFuse(inventory, defId, rarity) (FUSION_COUNT objets identiques, même defId et même rareté, rareté non maximale) et fuse(...) qui retire les objets consommés et renvoie un objet de la rareté supérieure (niveau 1). Un objet équipé ne peut pas être consommé tant qu'il en reste d'autres. Dans l'écran équipement : bouton « Fusionner (3) » dans le détail d'un objet qui peut l'être, avec confirmation, résultat affiché en clair, sauvegarde.
```
Validation : trois objets identiques deviennent un objet de rareté supérieure avec son nouveau passif actif au prochain run.

### [x] 3.4 Coffres et gemmes

```
Tâche 3.4. Les gemmes sont gagnées en fin de run (ajoute-les à loot.json, RunRewards, applyRunRewards et à l'écran de butin : bonus de victoire, bonus par boss tué). Crée src/data/chests.json (typé dans types.ts) : coffre de bois (coût en or) et coffre doré (coût en gemmes), chacun avec ses poids de rareté (le doré garantit au moins « rare »). Logique pure dans src/systems/chests.ts : openChest(def, items, rng) qui renvoie un ItemInstance. Crée src/scenes/ChestScene.ts, accessible par un bouton « COFFRES » du menu : deux gros coffres à toucher ; ouvrir un coffre débite le coût, joue une animation (le coffre tremble, flash, puis la carte de l'objet apparaît avec sa couleur de rareté, façon récompense Archero), ajoute l'objet à l'inventaire et sauvegarde. Refuse proprement (message) si le joueur n'a pas assez d'or ou de gemmes.
```
Validation : ouvrir un coffre débite le bon montant et ajoute l'objet ; l'animation est fluide sur téléphone.

### [x] 3.5 Talents et niveau de compte

```
Tâche 3.5. Ajoute requiredAccountLevel à TalentDef (types.ts) et dans talents.json. Crée src/scenes/TalentScene.ts, accessible par un bouton « TALENTS » du menu : liste verticale de gros boutons (nom, niveau actuel/max, effet par niveau, coût en or du prochain niveau, ou « Niveau de compte N requis »). Acheter un niveau débite l'or, incrémente GameState.data.talents[id] et sauvegarde ; les stats suivent déjà par talentModifiers(). Affiche le niveau de compte et la barre d'XP de compte (accountXpToNext) dans le menu et dans cet écran.
```
Validation : un talent acheté se voit dans les PV ou l'ATQ du menu et pendant un run.

### [ ] 3.6 Équilibrage du chapitre 1 (Opus)

```
Tâche 3.6. Équilibre le chapitre 1 avec des chiffres, pas au feeling. Objectifs : un run complet de 20 salles dure 10 à 15 minutes ; un héros neuf (sans talents ni objets) atteint la salle 8 à 12 en moyenne ; un héros bien équipé finit le chapitre. Propose un tableau (courbe de PV et de dégâts des ennemis par salle, XP par niveau, or par salle, taux de butin, coût des améliorations et des talents), applique-le uniquement dans les JSON (enemies.json, chapters.json, progression.json, loot.json, upgrade.json, talents.json, combat.json) et justifie chaque changement. Ne touche pas au code.
```
Validation : Martin joue 5 runs et dit si c'est trop dur, trop facile ou trop long.

**Porte de phase 3 → revue Opus.**

---

## Phase 4 — Compte et synchro (porte : la progression suit le joueur du PC au téléphone, sans fuite)

Détaillée par Sonnet ; **Opus recommandé** pour la revue de sécurité (4.4), car c'est la seule phase qui touche à de vraies données de comptes. Le dépôt GitHub est **public** : lire d'abord la section « Sécurité » de CLAUDE.md.

### Décisions de conception (valeurs par défaut, à confirmer)

- **Le jeu reste jouable sans compte.** Le cloud est optionnel : `localStorage` reste la source locale, la synchro s'y ajoute.
- **Qui crée quoi :** Martin crée lui-même le compte et le projet Supabase (gratuit, région Europe) et fait les réglages du tableau de bord ; Claude écrit le code et le SQL, et ne voit jamais de mot de passe ni de clé secrète.
- **Aucune clé dans le dépôt :** l'URL et la clé `anon` du projet passent par des variables d'environnement (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) : fichier `.env.local` en local (ignoré par git), « Variables » du dépôt GitHub pour le déploiement. La clé `anon` finit de toute façon visible dans le jeu publié : elle est publique par conception, et c'est la **RLS** qui protège les données. La clé `service_role` n'est jamais utilisée.
- **Dépendance :** `@supabase/supabase-js` (la bibliothèque officielle, la plus sûre pour l'authentification). À valider avant installation (règle « pas de dépendance sans demande »).
- **Connexion par code à 6 chiffres reçu par e-mail** plutôt que par lien : un lien s'ouvre souvent dans un autre navigateur que celui du jeu (surtout une application installée sur l'écran d'accueil), et la connexion échoue. Le code se tape dans le jeu, sans redirection. Même principe que le lien magique (aucun mot de passe).
- **Conflits :** si PC et téléphone ont tous deux progressé hors ligne, le jeu **demande** quelle sauvegarde garder (jamais d'écrasement silencieux). La règle « la plus récente gagne » s'applique seulement quand un côté est vide ou strictement plus ancien.
- **Données personnelles :** seule l'adresse e-mail est stockée (chez Supabase, pour l'authentification). La sauvegarde ne contient aucune donnée personnelle. Un bouton « Supprimer ma sauvegarde cloud » est prévu.

### [ ] 4.0 Réglages à faire par Martin sur Supabase (guidé pas à pas)

```
Tâche 4.0 (Martin, avec l'aide de Claude pour chaque écran). 1) Créer un compte sur supabase.com avec ton e-mail habituel, un mot de passe unique (gestionnaire de mots de passe) et active la double authentification. 2) Créer un projet « roguelite », région Europe (Frankfurt ou Paris), noter le mot de passe de la base dans ton gestionnaire (jamais dans le dépôt). 3) Authentication → URL Configuration : Site URL = https://martincalvez.github.io/roguelite/ et ajouter http://localhost:5173 dans les Redirect URLs. 4) Authentication → Providers : ne garder que « Email » ; désactiver « Confirm email » seulement si tu veux tester sans e-mail (sinon laisser). 5) Authentication → Email Templates : ajouter le code {{ .Token }} dans le modèle « Magic Link » pour recevoir le code à 6 chiffres. 6) Settings → API : noter l'URL du projet et la clé « anon public » (PAS la clé « service_role ») ; les mettre dans .env.local (jamais dans un message ni un fichier commité). 7) Dans les Variables du dépôt GitHub (Settings → Secrets and variables → Actions → Variables), créer VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY avec les mêmes valeurs.
```
Validation : le projet existe, l'URL et la clé anon sont dans `.env.local` et dans les Variables GitHub ; aucune clé n'est apparue dans le chat ni dans git.

### [ ] 4.1 Table de sauvegarde et règles d'accès (RLS)

```
Tâche 4.1. Le fichier docs/supabase/001_saves.sql crée la table public.saves (une ligne par joueur : data jsonb, save_version, client_updated_at, updated_at serveur, limite de 200 Ko) avec la sécurité au niveau des lignes (RLS) activée : chaque joueur connecté ne lit, n'écrit et ne supprime que SA ligne, et le rôle anon n'a aucun accès. Martin colle ce fichier dans Supabase → SQL Editor, puis lance les 3 vérifications SQL écrites en commentaire en bas du fichier et dit ce qu'il obtient. Claude ne code rien tant que la RLS n'est pas vérifiée.
```
Validation : `rowsecurity = true`, 4 politiques « authenticated », et « permission denied » pour le rôle anon.

### [ ] 4.2 Connexion par code e-mail

```
Tâche 4.2. Après accord sur la dépendance : npm install @supabase/supabase-js. Crée src/cloud/client.ts : client Supabase créé à partir de import.meta.env.VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY ; si elles sont absentes, le cloud est simplement désactivé (le jeu fonctionne comme avant, bouton COMPTE masqué ou grisé). Active le champ DOM de Phaser (dom: { createContainer: true } dans main.ts) pour pouvoir saisir une adresse e-mail et un code au clavier du téléphone. Crée src/scenes/AccountScene.ts, accessible par un bouton « COMPTE » du menu : (1) non connecté : champ e-mail + bouton « Recevoir un code » (signInWithOtp, shouldCreateUser: true), puis champ du code à 6 chiffres + bouton « Valider » (verifyOtp) ; (2) connecté : adresse affichée, bouton « Se déconnecter » ; messages d'erreur clairs (e-mail invalide, code faux ou expiré, trop de demandes, hors ligne). Ne jamais afficher ni journaliser le jeton de session. Ajoute .env.local, .env.* au .gitignore (déjà fait) et la variable dans le workflow GitHub (env: du step « npm run build » : ${{ vars.VITE_SUPABASE_URL }} et ${{ vars.VITE_SUPABASE_ANON_KEY }}). Documente dans docs/DEPLOIEMENT.md.
```
Validation : on se connecte avec un code reçu par e-mail, sur PC et sur téléphone (jeu installé), et on reste connecté après rechargement ; sans variables d'environnement, le jeu marche sans cloud.

### [ ] 4.3 Synchronisation de la sauvegarde

```
Tâche 4.3. Logique pure dans src/systems/cloudSync.ts, avec tests Vitest : decideSync(local, remote) renvoie 'noop' (identiques), 'upload' (pas de cloud, ou local strictement plus récent et cloud sans progression propre), 'download' (local vide/neuf et cloud existant, ou cloud strictement plus récent), ou 'conflict' (les deux ont progressé). « Plus récent » se mesure avec client_updated_at ; « a progressé » = différent de defaultSave(). Crée src/cloud/cloudSave.ts : fetchRemote(), pushLocal() (upsert sur user_id, avec save_version), et la migration de la sauvegarde téléchargée par migrate() de SaveManager avant de l'accepter (une sauvegarde cloud d'une version plus récente que le jeu est refusée avec un message). Déclencheurs : à la connexion, à la fin d'un run (après applyRunRewards), et au retour dans le jeu (visibilitychange), avec un délai minimal entre deux envois. En cas de conflit, écran « Quelle sauvegarde garder ? » comparant les deux (niveau de compte, or, gemmes, nombre d'objets, date) avec deux gros boutons. Toute erreur réseau est silencieuse pour le joueur (une petite icône d'état suffit) et ne bloque jamais le jeu. Ajoute « Supprimer ma sauvegarde cloud » (delete sur sa ligne, avec confirmation).
```
Validation : une progression faite sur PC apparaît sur le téléphone après connexion, et inversement ; un conflit provoque le choix ; hors ligne, le jeu fonctionne et se synchronise au retour du réseau.

### [ ] 4.4 Revue de sécurité (Opus recommandé)

```
Tâche 4.4. Revue de sécurité de la phase 4, par ordre de gravité : (1) RLS : test avec deux comptes (le joueur B ne voit ni ne modifie la ligne du joueur A), test du rôle anon, test d'une sauvegarde de plus de 200 Ko ; (2) recherche de secrets dans tout l'historique git (clé service_role, mots de passe, jetons, .env) ; (3) Content-Security-Policy dans index.html (meta) limitant les connexions au seul domaine Supabase du projet et aux ressources du site ; (4) aucune journalisation de jetons ou d'e-mails ; (5) limitation des envois de codes (réglages Supabase) et rappel que le service d'e-mail intégré gratuit est très limité ; (6) comportement si le code est faux 5 fois ; (7) suppression de sauvegarde ; (8) points RGPD : e-mail seule donnée personnelle, où elle est stockée, comment la supprimer.
```
Validation : liste de problèmes par gravité, tous corrigés ou acceptés explicitement par Martin.

**Porte de phase 4 → revue Opus.**

---

## Phase 5 — Contenu

- [ ] 5.1 Familiers (slot pet)
- [ ] 5.2 Écran des héros et déblocage (gemmes)
- [ ] 5.3 Chapitres 2 et 3, nouveaux ennemis
- [ ] 5.4 Mode Survie (vagues infinies, bestWave)
- [ ] 5.5 Graphismes fantasy (sprites, décors) et sons
