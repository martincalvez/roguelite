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

### [ ] 1.4 Tir automatique

```
Tâche 1.4. Crée src/entities/Projectile.ts et un pool de projectiles joueur (texture 'projectile'). Quand le joueur est immobile (ou toujours si GameState.data.settings.alwaysShoot), il tire vers l'ennemi vivant le plus proche à la cadence stats.attackSpeed, vitesse stats.projectileSpeed. Dégâts = stats.attack, coup critique selon critChance × critDamage. Les ennemis perdent des PV et meurent à 0 (émettre l'événement 'enemy-died' avec l'EnemyDef). Calcule les dégâts dans une fonction pure src/systems/combat.ts. Le héros se tourne vers sa cible.
```
Validation : immobile, le héros tue les gobelins ; en mouvement, il ne tire pas.

### [ ] 1.5 Dégâts au joueur, mort et victoire

```
Tâche 1.5. Le joueur subit des dégâts au contact des ennemis et des projectiles ennemis (damage de l'EnemyDef), avec 0,6 s d'invulnérabilité (clignotement) et une chance d'esquive stats.dodge (afficher « Esquive »). Ajoute un HUD (src/ui/Hud.ts) dans le bandeau du haut : barre de PV avec valeur. À 0 PV : écran « Défaite » avec bouton « Menu ». Quand tous les ennemis de la salle sont morts : écran « Salle terminée » avec bouton « Menu » (l'enchaînement des salles viendra en phase 2).
```
Validation : on peut perdre et gagner une salle, et revenir au menu.

### [ ] 1.6 Sensations (game feel)

```
Tâche 1.6. Ajoute du retour visuel, sans toucher à l'équilibrage : flash blanc 80 ms sur un ennemi touché, léger recul (knockback) des ennemis touchés, chiffres de dégâts flottants (jaunes et plus gros pour les critiques), petit tremblement d'écran quand le joueur est touché, petite explosion de particules à la mort d'un ennemi. Tout doit rester fluide avec 15 ennemis à l'écran. Regroupe ces effets dans src/ui/Fx.ts (Phaser autorisé ici, pas dans systems/).
```
Validation : les coups « se sentent » ; pas de baisse de fluidité sur téléphone.

**Porte de phase 1 → revue Opus.**

---

## Phase 2 — Run complet (porte : run de 10 min jouable sur PC et téléphone)

### [ ] 2.1 État du run et XP

```
Tâche 2.1. Crée src/state/RunState.ts (état du run en cours : niveau, XP, compétences prises avec leurs stacks, or gagné, salle actuelle). Ajoute src/data/progression.json typé dans types.ts : XP nécessaire par niveau de run (tableau). Les ennemis morts lâchent des orbes d'XP (texture 'xp-orb') aspirés par le joueur quand la salle est vidée. Barre d'XP dans le HUD. Émettre 'level-up' quand un niveau est atteint.
```
Validation : la barre d'XP se remplit, le niveau monte.

### [ ] 2.2 Choix d'une compétence parmi 3

```
Tâche 2.2. Crée src/systems/skills.ts (pur) : tirage pondéré (weight) de 3 compétences distinctes, en excluant celles à maxStacks. Crée une scène overlay SkillPickScene qui met RunScene en pause et propose 3 cartes (nom, description, stacks actuels), grandes et lisibles au doigt. Applique tout de suite les compétences 'stat' et 'heal' via RunState → les stats du joueur sont recalculées avec computeStats(heroStats base + modificateurs du run). Les autres types sont enregistrés mais sans effet pour l'instant.
```
Validation : à chaque niveau, 3 choix ; Force brute augmente visiblement les dégâts.

### [ ] 2.3 Compétences de tir

```
Tâche 2.3. Implémente les effets 'multishot' (projectiles parallèles espacés), 'diagonal' (+2 à ±45°), 'rear' (+1 vers l'arrière), 'pierce' (traverse N ennemis), 'ricochet' (rebondit vers l'ennemi le plus proche non touché). Les effets se cumulent. Inclure les passifs d'objets et de héros (passives.json) comme des compétences acquises au début du run.
```
Validation : prendre multishot + diagonale + ricochet donne un tir en éventail qui rebondit.

### [ ] 2.4 Effets et orbe

```
Tâche 2.4. Implémente 'burn' (dégâts dans le temps, teinte orange), 'freeze' (ralentissement, teinte bleue), 'orb' (orbes qui tournent autour du héros et blessent au contact, avec un délai par ennemi). Les durées et valeurs viennent de skills.json.
```

### [ ] 2.5 Enchaînement des salles

```
Tâche 2.5. Quand une salle est vidée, une porte s'ouvre en haut de l'arène ; la traverser charge la salle suivante du chapitre (PV, XP et compétences conservés). Compteur « Salle X/20 » dans le HUD. Salle 'angel' : pas d'ennemis, choix entre « Soigner 40 % » et une compétence rare. Les PV/dégâts ennemis sont multipliés par chapter.difficulty. Victoire après la dernière salle.
```

### [ ] 2.6 Mini-boss et boss

```
Tâche 2.6. Comportement 'boss' : alterne 3 patterns toutes les ~4 s (ruée vers le joueur, cercle de projectileCount projectiles, salve visée de 3 tirs). Barre de vie de boss en haut de l'écran avec son nom. Bref avertissement visuel (0,5 s) avant chaque attaque, pour que ce soit esquivable.
```

### [ ] 2.7 Fin de run et butin

```
Tâche 2.7. Crée LootScene : affiche or gagné, XP de compte gagnée (ajoute la règle dans progression.json), salle atteinte, et 0 à 2 objets lâchés (src/systems/loot.ts pur : tirage pondéré par rareté, table dans un JSON). Tout est ajouté via GameState puis sauvegardé. Mettre à jour bestChapter. Bouton « Menu ».
```
Validation : recharger la page conserve l'or et les objets.

### [ ] 2.8 Arme équipable

```
Tâche 2.8. Dans le menu, ajoute un sélecteur simple d'arme parmi les armes de l'inventaire. Le champ weapon de l'ItemDef change le tir : 'arrow' normal, 'bolt' gros projectile lent perçant (pierce), 'shuriken' petit et rapide. Les stats de l'arme passent par heroStats().
```

### [ ] 2.9 Mise en ligne et installation sur téléphone

```
Tâche 2.9. Prépare le déploiement GitHub Pages via une GitHub Action (build Vite, publication de dist/). Ajoute un manifest PWA (nom, icône simple générée, mode standalone, orientation portrait) et un service worker minimal pour que le jeu s'installe sur l'écran d'accueil. Explique-moi les réglages à faire sur GitHub.
```
Validation : le jeu s'ouvre depuis une icône sur le téléphone, en plein écran.

**Porte de phase 2 → revue Opus. Fin du prototype.**

---

## Phase 3 — Méta-progression (à détailler par Opus avant de commencer)

- [ ] 3.1 Écran équipement : 6 slots, inventaire, infobulle avec différence de stats en vert/rouge
- [ ] 3.2 Amélioration d'objet : or + parchemins du type de slot
- [ ] 3.3 Fusion : 3 objets identiques → rareté supérieure, passif de rareté
- [ ] 3.4 Coffres : gemmes, raretés pondérées, animation d'ouverture
- [ ] 3.5 Talents (talents.json) et niveau de compte
- [ ] 3.6 Équilibrage du chapitre 1 (Opus)

## Phase 4 — Compte et synchro (à détailler par Opus : sécurité)

- [ ] 4.1 Projet Supabase, table de sauvegarde avec règles d'accès (RLS)
- [ ] 4.2 Connexion par lien magique email
- [ ] 4.3 SaveManager : envoi/récupération cloud, la sauvegarde la plus récente gagne (updatedAt)

## Phase 5 — Contenu

- [ ] 5.1 Familiers (slot pet)
- [ ] 5.2 Écran des héros et déblocage (gemmes)
- [ ] 5.3 Chapitres 2 et 3, nouveaux ennemis
- [ ] 5.4 Mode Survie (vagues infinies, bestWave)
- [ ] 5.5 Graphismes fantasy (sprites, décors) et sons
