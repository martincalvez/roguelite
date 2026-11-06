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

Détaillée par Sonnet puis **mise à jour après revue** (inscriptions fermées, `revision` côté serveur, écriture conditionnelle). **Opus recommandé** pour la revue de sécurité (4.4), car c'est la seule phase qui touche à de vraies données de comptes. Le dépôt GitHub est **public** : lire d'abord la section « Sécurité » de CLAUDE.md.

### Décisions de conception

- **Un seul compte cloud : celui de Martin.** Les inscriptions publiques sont **désactivées** sur Supabase, et le jeu appelle `signInWithOtp` avec `shouldCreateUser: false` : un e-mail inconnu est refusé. Martin crée son compte à la main dans le tableau de bord. **SMTP personnalisé gratuit, seulement pour pouvoir modifier le modèle d'e-mail** (Supabase interdit de le modifier avec son service intégré, ce qui empêche d'y mettre le code à 6 chiffres) : Resend, expéditeur `onboarding@resend.dev`, sans domaine, qui n'envoie qu'à l'adresse du compte Resend (la tienne, la même que celle du compte Supabase). La clé d'envoi Resend est un vrai secret : gestionnaire de mots de passe et tableau de bord Supabase uniquement, jamais le dépôt ni le chat ; permission « Sending access » seule.
- **Le jeu reste jouable sans compte** : `localStorage` reste la sauvegarde locale ; le cloud s'y ajoute, de façon optionnelle. Sans variables d'environnement, le cloud est désactivé.
- **Aucune clé dans le dépôt :** l'URL et la clé `anon` passent par `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (`.env.local` ignoré par git en local, « Variables » du dépôt GitHub pour le déploiement). La clé `anon` est de toute façon visible dans le jeu publié : elle est publique par conception, la **RLS** protège les données. La clé `service_role` n'est jamais utilisée.
- **Dépendance :** `@supabase/supabase-js` (bibliothèque officielle). À valider avant installation.
- **Connexion par code à 6 chiffres reçu par e-mail** (pas de lien) : un lien s'ouvre souvent dans un autre navigateur que celui du jeu installé sur l'écran d'accueil et la connexion échoue ; le code se tape dans le jeu.
- **Horodatage et version fixés par le serveur.** `updated_at` et `revision` sont écrits par un trigger SQL, jamais par le client (l'heure d'un appareil n'est pas fiable). Chaque appareil mémorise la dernière `revision` synchronisée et l'empreinte de sa sauvegarde à ce moment-là.
- **Décision de synchro (fonction pure, testée) :**
  - seul le local a changé → **envoyer** ;
  - seul le cloud a changé (sa `revision` a bougé) → **récupérer** ;
  - les deux ont changé → **écran de choix** (jamais d'écrasement silencieux) ;
  - aucun des deux → rien.
  - Appareil jamais synchronisé : son état de référence est la sauvegarde neuve ; s'il n'a pas progressé et que le cloud existe → récupérer ; s'il a progressé et que le cloud existe → écran de choix.
  - Cloud vide : si le local a changé → envoyer ; sinon rien (une sauvegarde cloud supprimée volontairement n'est pas recréée par un autre appareil qui n'a rien changé).
- **Écriture conditionnelle :** l'envoi n'a lieu que si la `revision` en base est toujours celle que l'appareil connaît (`update … where revision = connue`). Si elle a bougé (ou si la première insertion échoue car la ligne existe déjà), on refait la décision de synchro. Deux appareils ne peuvent donc jamais s'écraser sans le savoir.
- **Indisponibilité :** si Supabase ne répond pas (projet mis en pause après une semaine sans activité, ou pas de réseau), le jeu continue en local sans erreur bloquante, affiche « Synchro indisponible » et réessaie au prochain lancement (et à la prochaine fin de run).
- **Suppression :** « Supprimer ma sauvegarde cloud » supprime la ligne de la table, pas le compte. C'est suffisant.
- **Données personnelles :** seule l'adresse e-mail est stockée (chez Supabase, pour l'authentification). La sauvegarde ne contient aucune donnée personnelle.

### [x] 4.0 Réglages à faire par Martin sur Supabase (guidé pas à pas)

```
Tâche 4.0 (Martin, avec l'aide de Claude pour chaque écran). 1) Créer un compte sur supabase.com avec un mot de passe unique (gestionnaire de mots de passe) et activer la double authentification. 2) Créer un projet « roguelite », région Europe (Frankfurt ou Paris) ; le mot de passe de la base va dans ton gestionnaire, jamais dans le dépôt. 3) Authentication → URL Configuration : Site URL = https://martincalvez.github.io/roguelite/ et ajouter http://localhost:5173 dans les Redirect URLs. 4) Authentication → Sign In / Providers : ne garder que « Email » et DÉCOCHER « Allow new users to sign up ». 5) Authentication → Users → « Add user » : créer ton compte à la main avec ton adresse (« Auto Confirm User » coché). 6) Compte Resend (même adresse e-mail que ton compte Supabase) → API Keys → créer une clé « Sending access » ; Supabase → Authentication → Emails → SMTP Settings : activer le SMTP personnalisé (expéditeur onboarding@resend.dev, hôte smtp.resend.com, port 465, utilisateur resend, mot de passe = la clé). Puis Authentication → Emails → Templates → « Magic Link » : remplacer le corps par un message contenant {{ .Token }} (et sans le lien {{ .ConfirmationURL }}). 7) Settings → API : noter l'URL du projet et la clé « anon public » (PAS la clé « service_role ») et les mettre dans .env.local (jamais dans un message ni un fichier commité). 8) Dans les Variables du dépôt GitHub (Settings → Secrets and variables → Actions → Variables), créer VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY avec les mêmes valeurs.
```
Validation : le projet existe, tes identifiants de compte et les clés sont dans ton gestionnaire / `.env.local` / Variables GitHub ; rien n'est apparu dans le chat ni dans git.

### [x] 4.1 Table de sauvegarde et règles d'accès (RLS)

```
Tâche 4.1. Le fichier docs/supabase/001_saves.sql crée la table public.saves (une ligne par joueur : data jsonb, save_version, revision, updated_at, limite de 200 Ko) avec la sécurité au niveau des lignes (RLS) : chaque joueur connecté ne lit, n'écrit et ne supprime que SA ligne, le rôle anon n'a aucun accès, et un trigger fixe revision (+1 à chaque écriture) et updated_at (now()) côté serveur, sans que le client puisse les choisir. Martin colle ce fichier dans Supabase → SQL Editor, puis lance les vérifications SQL écrites en commentaire en bas du fichier et dit ce qu'il obtient. Claude ne code rien tant que la RLS n'est pas vérifiée.
```
Validation : `rowsecurity = true`, 4 politiques « authenticated », « permission denied » pour le rôle anon, trigger `saves_before_write` présent, pas de colonne d'horodatage client.

### [x] 4.2 Connexion par code e-mail

```
Tâche 4.2. Après accord sur la dépendance : npm install @supabase/supabase-js. Crée src/cloud/client.ts : client Supabase créé à partir de import.meta.env.VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY ; si elles sont absentes, le cloud est simplement désactivé (le jeu fonctionne comme avant, bouton COMPTE grisé). Active le champ DOM de Phaser (dom: { createContainer: true } dans main.ts) pour saisir une adresse e-mail et un code au clavier du téléphone. Crée src/scenes/AccountScene.ts, accessible par un bouton « COMPTE » du menu : (1) non connecté : champ e-mail + bouton « Recevoir un code » (signInWithOtp avec shouldCreateUser: false), puis champ du code à 6 chiffres + bouton « Valider » (verifyOtp) ; (2) connecté : adresse affichée et bouton « Se déconnecter ». Messages d'erreur clairs et sobres (e-mail refusé ou inconnu, code faux ou expiré, trop de demandes, hors ligne) ; un e-mail inconnu ne doit pas révéler si le compte existe. Ne jamais afficher ni journaliser le jeton de session ni l'adresse e-mail dans la console. Ajoute les deux variables au step « npm run build » du workflow GitHub (env: ${{ vars.VITE_SUPABASE_URL }} et ${{ vars.VITE_SUPABASE_ANON_KEY }}) et documente dans docs/DEPLOIEMENT.md.
```
Validation : on se connecte avec un code reçu par e-mail, sur PC et sur téléphone (jeu installé), et on reste connecté après rechargement ; un e-mail inconnu est refusé ; sans variables d'environnement, le jeu marche sans cloud.

### [x] 4.3 Synchronisation de la sauvegarde

```
Tâche 4.3. Logique pure dans src/systems/cloudSync.ts, avec tests Vitest couvrant chaque cas de la décision de synchro décrite plus haut : decideSync({ localChanged, lastSyncedRevision, remote }) renvoie 'noop' | 'upload' | 'download' | 'conflict'. Chaque appareil mémorise (dans localStorage, sous une clé à part, jamais dans SaveData) la dernière revision synchronisée et l'empreinte de sa sauvegarde à ce moment-là ; « le local a changé » = empreinte actuelle (calculée hors updatedAt) différente de l'empreinte mémorisée (pour un appareil jamais synchronisé : différente de celle de defaultSave()). Crée src/cloud/cloudSave.ts : fetchRemote(), insertFirst() puis pushConditional() (update … eq('user_id') eq('revision', connue), qui renvoie la nouvelle revision ; 0 ligne modifiée ou erreur 23505 = la revision a bougé → refaire fetchRemote() et decideSync()), et la migration de la sauvegarde téléchargée par migrate() de SaveManager avant de l'accepter (une sauvegarde cloud d'une version plus récente que le jeu est refusée avec un message clair). Déclencheurs : au lancement, à la fin d'un run (après applyRunRewards) et au retour dans le jeu (visibilitychange), avec un délai minimal entre deux envois. En cas de conflit : écran « Quelle sauvegarde garder ? » comparant les deux (niveau de compte, or, gemmes, nombre d'objets, date serveur) avec deux gros boutons. Si Supabase ne répond pas : aucune erreur bloquante, une petite mention « Synchro indisponible » dans le menu, nouvel essai au prochain lancement. Ajoute « Supprimer ma sauvegarde cloud » (delete sur sa ligne, avec confirmation) : la ligne est supprimée, pas le compte.
```
Validation : une progression faite sur PC apparaît sur le téléphone, et inversement ; deux appareils modifiés hors ligne provoquent l'écran de choix ; hors ligne, le jeu fonctionne et la synchro reprend au lancement suivant.

### [x] 4.4 Revue de sécurité (Opus recommandé)

```
Tâche 4.4. Revue de sécurité de la phase 4, par ordre de gravité : (1) RLS : test avec un second compte de test (créé à la main puis supprimé) : B ne voit ni ne modifie la ligne de A ; test du rôle anon ; test d'une sauvegarde de plus de 200 Ko ; test qu'un client ne peut pas imposer revision ni updated_at ; (2) inscriptions fermées : un e-mail inconnu est refusé par le jeu et par l'API ; (3) recherche de secrets dans tout l'historique git (clé service_role, mots de passe, jetons, .env) ; (4) Content-Security-Policy dans index.html (meta) limitant les connexions au seul domaine Supabase du projet et aux ressources du site (le script de service worker inline devra être déplacé dans un fichier ou signé) ; (5) limitation des envois de codes (réglages Supabase), expiration du code, et clé d'envoi Resend (permission minimale, révocable, absente du dépôt) ; (6) comportement si le code est faux plusieurs fois ; (7) suppression de sauvegarde ; (8) projet en pause : le jeu ne se bloque pas ; (9) RGPD : l'e-mail est la seule donnée personnelle, où elle est stockée, comment la supprimer.
```
Validation : liste de problèmes par gravité, tous corrigés ou acceptés explicitement par Martin.

Validation effectuée le 5 novembre 2026 : les tests SQL T1–T14 sont tous OK ; les contrôles de sécurité et réglages listés dans `docs/SECURITE.md` ont été vérifiés ; Martin accepte explicitement que son e-mail figure dans les métadonnées des commits publics. Le script SQL n'a créé aucun compte de test et sa transaction a été annulée.

**Porte de phase 4 → revue Opus.**

---

## Phase 5 — Contenu

Direction visuelle de Martin : interface portrait très colorée, héros et familier au centre, cartes de rareté, boutons épais avec contour et relief, arènes lumineuses, boss bar visible et choix de compétences en grandes cartes. Voir `docs/CIBLE-UI.md`.

- [ ] 5.1 Familiers (slot pet)

```
Tâche 5.1. Ajoute trois familiers équipables avec des bonus de stats distincts définis dans items.json et une apparence générée depuis leur palette JSON. Migre les sauvegardes existantes vers SAVE_VERSION 3 sans perte : chaque joueur reçoit et équipe une Chouette d'ambre si aucun familier de départ n'existe. Crée un écran FAMILIERS accessible depuis le menu, dans la direction de docs/CIBLE-UI.md : héros et compagnon mis en scène dans un panneau central, cartes de familiers bordées par leur rareté, bonus affichés, équipement en un toucher et défilement adapté au téléphone. En run, le familier équipé suit le héros avec un léger flottement, sans collision ni dégâts. Les bonus passent par les stats d'équipement existantes. Tests : migration v2→v3 sans perte ni doublon, présence et palette valides pour chaque familier. Pas de nouvelle dépendance.
```
Validation : un familier est visible sur l'écran FAMILIERS et suit le héros en combat ; en changer met à jour l'apparence et les stats ; une ancienne sauvegarde garde sa progression et reçoit le familier de départ.
- [ ] 5.2 Écran des héros et déblocage (gemmes)

```
Tâche 5.2. Crée un écran HÉROS accessible depuis le menu, dans la direction visuelle de docs/CIBLE-UI.md : portrait illustré généré depuis une palette déclarée dans heroes.json, héros actif mis en scène avec son familier, statistiques calculées avec l'équipement/talents/passif, et cartes tactiles pour tous les héros. L'écran distingue héros sélectionné, héros débloqué et héros verrouillé ; choisir un héros débloqué ne coûte rien. Débloquer un héros débite une seule fois son unlockCostGems et le sélectionne immédiatement ; si le solde est insuffisant, afficher le manque et ne rien changer. Les achats et la sélection passent par GameState et persistent/synchronisent avec la sauvegarde existante. Le héros sélectionné apparaît aussi avec son sprite propre en combat, sans changer son collider. Ajoute la logique testée dans src/systems/heroes.ts et valide les références/palettes dans data.test.ts. Pas de nouvelle dépendance.
```
Validation : sélectionner Aldric, débloquer Seren au prix indiqué, vérifier le nouveau solde et la sélection après rechargement/synchro ; tenter avec un solde insuffisant ; confirmer l'apparence du héros choisi en combat.

- [ ] 5.3 Chapitres 2 et 3, nouveaux ennemis

```
Tâche 5.3. Ajoute deux chapitres de 20 salles dans chapters.json, avec une identité de décor en couleurs déclarée par chapitre, une difficulté qui suit la progression du chapitre 1 et des compositions d'ennemis variées. Crée de nouveaux ennemis pour les chapitres 2 et 3 (mêlée, tir, éventail et boss) dans enemies.json ; les sprites temporaires sont générés depuis leurs couleurs et utilisent les comportements déjà pris en charge. Respecte le rythme des salles : combats, ange aux salles 5 et 15, mini-boss salle 10, boss final salle 20. Donne aux chapitres un écran de sélection accessible avec JOUER ; chapitre 1 toujours ouvert, chapitre N ouvert après victoire au chapitre N-1. Les thèmes de chapitre doivent différencier les arènes en combat. Tests : références ennemis, structure des chapitres, palettes et règles de déblocage. Pas de nouvelle dépendance.
```
Validation : terminer le chapitre 1 pour ouvrir le chapitre 2, puis le chapitre 2 pour ouvrir le chapitre 3 ; jouer au moins une salle de chaque nouveau chapitre et confirmer le décor, les nouveaux ennemis et le comportement des boss.

- [ ] 5.5 Graphismes fantasy, référence vidéo et sons (en cours)

```
Tâche 5.5. Applique les références visuelles des menus et de l'équipement décrites dans docs/CIBLE-UI.md, et utilise la vidéo de Martin comme référence prioritaire pour les scènes de combat : vue de dessus portrait, petites salles et couloirs de pierre/herbe/eau, blocs, tourelles et pièges, attaques en mouvement, barre de progression, récompenses très lisibles. Cette passe a intégré Aldric et sa chouette, gemme d'XP, pièce de butin, tourelle, golems et chevalier bleu ; des silhouettes cartoon originales distinctes complètent maintenant les ennemis sans dépendre d'assets tiers. Aldric est plus grand, les hitboxes sont rapprochées des silhouettes, les blocs et murs correspondent à leurs collisions et stoppent héros, ennemis et tirs. Les cartes de capacité sont courtes et plus lisibles, l'équipement est plus dense, la sortie est une arche animée et chaque transition supprime les orbes résiduelles. Chaque nouvelle salle choisit l'un de dix plans originaux de données (clairière, rive, colonnes, zigzags, sanctuaire…), avec plaques d'eau/pierre et blocs distincts ; un plan ne revient jamais immédiatement, le départ et la sortie restent toujours accessibles. Les rencontres tirent maintenant un profil de vagues depuis les données : première entrée puis renforts devant, sur les flancs ou derrière, sans apparition dans la zone de sécurité du héros. Le total d'ennemis de la salle est strictement conservé, les boss restent en duel et la sortie attend la dernière vague. Le cadre de combat et les rochers sont désormais des volumes cartoon colorés plutôt que les anciens murs/piliers en pierre répétés. Les feux sont des braises animées ; les nouveaux Pyromancien braise et Lanceur d'orage introduisent, respectivement, boule de feu explosive et tir en cloche télégraphié qui survole les blocs. Les pièces sont plus petites et l'équipement propose « Tout fusionner » selon la règle existante de trois exemplaires identiques. Navigation, ciblage, joystick et difficulté tiennent compte des blocs et de l'équipement ; les chapitres 2–3 ajoutent de la pression par des groupes plus nombreux. Le tir auto est continu même en déplacement, y compris après migration d'une sauvegarde existante. La police Lilita One est locale et forcée sur tous les textes. Des sons arcade synthétisés et un retour haptique léger, sans aucun fichier audio externe, réagissent aux touches clés du combat et respectent le réglage son ; le bouton pause compact donne une reprise ou un retour au menu. À valider sur iPhone : contraste réel des textes, taille d'Aldric, hitboxes, fluidité, difficulté, placement du familier, activation des sons après le premier toucher, pause/reprise, dégâts de zone, rythme des renforts et action « Tout fusionner ». Garde les textes courts, surtout dans les chapitres, des icônes grandes et expressives, une palette saturée, contours/ombres nets et effets rapides. Ne remplace pas la campagne par une capture de fond ; les éléments du jeu restent animés et interactifs. Pas de nouvelle dépendance sans accord.
```
Validation : sur téléphone, comparer accueil/équipement aux captures et une salle de combat à la vidéo ; confirmer lisibilité, échelle du héros, animation du familier, pièges, projectiles et ramassage des récompenses.

- [ ] 5.4 Mode Survie (implémenté, test téléphone à faire)

```
Tâche 5.4. Mode Survie ajouté à l'accueil, distinct de la campagne. 50 étapes ; le compteur s'affiche dans le HUD, des haltes de l'ange sont prévues à 5/15/25/35/45, des zones de feu animées dans certaines salles et un boss à chaque dizaine, jusqu'au boss final à 50. Les ennemis changent par palier, la difficulté croît jusqu'à une limite, les choix de capacités, salles, portes, tirs, XP et récompenses réutilisent la boucle de run ; le record est enregistré dans `bestWave` existant et synchronisé avec la sauvegarde. Les règles sont dans `src/data/survival.json`, la génération pure dans `src/systems/survival.ts`. Fin à 50 choisie comme règle de cette première version, puisque la vidéo ne montre rien après. Chaque run commence par le choix de pouvoir de la vidéo, puis la Roue de l'éclat lance une seule récompense courte, visuellement alignée sur l'aiguille ; elle ne donne jamais assez d'XP pour déclencher un deuxième choix avant le départ. La table d'XP ralentit chaque niveau, puis continue à croître après son dernier palier. Quand les compétences limitées sont épuisées, Force brute, Frénésie et Vitalité servent de trois améliorations de secours : la potion ne peut plus être le seul choix. Vérifier les choix, tirs, transitions, difficulté et record sur téléphone. Aucun équilibrage chiffré en dur dans le code ; pas de nouvelle dépendance.
```
Validation : lancer une partie sur téléphone, choisir une capacité, esquiver les tirs, ramasser l'XP/butin, vérifier les transitions, le record et le boss final à l'étape 50.

## Pistes après la phase 5 (à arbitrer, pas encore planifiées)

- Validation complète sur téléphone et équilibrage des chapitres 1–3, y compris la tâche 3.6 encore à confirmer.
- Nouveaux chapitres, ennemis, pièges et boss, en fonction des assets disponibles.
- Amélioration de la boucle de progression (défis, objectifs ou récompenses), seulement si Martin la souhaite après avoir testé la Survie.
