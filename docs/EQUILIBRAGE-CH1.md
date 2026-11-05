# Équilibrage du chapitre 1 (tâche 3.6)

Version initiale, **à valider en jouant** (5 runs). Elle repose sur un modèle chiffré et sur une simulation, pas sur des parties réelles : les chiffres ci-dessous sont une base de départ, pas une vérité.

## Objectifs
- Un run complet de 20 salles dure **10 à 15 minutes**.
- Un héros **neuf** (sans talents ni objets améliorés) atteint la salle **8 à 12** en moyenne.
- Un héros **bien équipé** (objets améliorés, talents) **finit** le chapitre.

## Le modèle
- **DPS d'un héros neuf : 21 PV/s.** Calcul : attaque 30 (20 de base + 10 de l'arc de départ) × 1,6 tirs/s × 1,05 (critiques) = 50 PV/s si on tire sans arrêt. On ne tire qu'à l'arrêt (environ 50 % du temps) et 85 % des tirs touchent : 50 × 0,5 × 0,85 ≈ 21.
- **Croissance : × 1,12 de DPS par niveau de run.** Estimée en moyennant l'effet des 12 compétences pondérées par leur poids d'apparition (Force brute, Frénésie, Tir multiple, etc.).
- **Temps de combat visé par salle** : de 12 s (salle 1) à 34 s (salle 19), 45 s pour le mini-boss, 70 s pour le boss. Total : 505 s de combat. Avec environ 8 s de déplacements et de transitions par salle et 4 s par choix de compétence, un run complet dure ≈ 11 à 13 minutes.
- **PV totaux de chaque salle** = temps visé × DPS du héros au niveau attendu à cette salle. Le multiplicateur de salle (`difficulty` dans chapters.json) est calculé pour que les PV de la salle atteignent cette cible.
- **Dégâts reçus** : modèle d'exposition (un ennemi au contact touche ≈ 0,06 fois par seconde, un tireur ≈ 0,05, un shaman ≈ 0,07, un boss ≈ 0,12, tous pondérés par la fraction du combat où il est vivant). Les dégâts des ennemis ont été calés pour qu'un héros neuf de 200 PV meure en médiane vers la salle 11.

## Résultats de la simulation (4 000 parties simulées par profil)
| Profil | Salle atteinte (médiane) | Quartiles 25 % / 75 % | Chapitre fini |
|---|---|---|---|
| Héros neuf (200 PV) | 11 | 10 / 12 | 0 % |
| Héros équipé (300 PV, +30 % de DPS, −15 % de dégâts reçus) | 18 | 14 / 19 | 12 % |
| Héros très équipé (420 PV, +70 % de DPS, −30 % de dégâts reçus) | 20 | 21 / 21 | 87 % |

## Changement de code (à connaître)
La consigne de départ était « uniquement dans les JSON », mais un seul chiffre de difficulté pour tout le chapitre ne permettait pas de faire monter les ennemis salle par salle. J'ai donc ajouté un champ optionnel **`difficulty` par salle** (types.ts, RoomFlow.ts, Enemy.ts) : il multiplie les PV de la salle, et les dégâts n'en suivent que 35 % (`roomDamageShare` dans combat.json). Sans ce champ, tout reste comme avant.

## Ennemis (avant → après)
| Ennemi | PV | Dégâts | XP | Or |
|---|---|---|---|---|
| Gobelin | 40 → 60 | 12 → 4.6 | 6 → 8 | 2 → 6 |
| Archer squelette | 30 → 45 | 10 → 4.1 | 8 → 10 | 3 → 8 |
| Shaman | 50 → 85 | 9 → 3.7 | 10 → 14 | 4 → 12 |
| Ogre | 380 → 800 | 20 → 8.3 | 40 → 70 | 20 → 60 |
| Liche | 900 → 2000 | 24 → 9.2 | 120 → 170 | 60 → 160 |

Les dégâts finaux d'un ennemi = dégâts de base × (1 + (multiplicateur de salle − 1) × 0,35). Les PV finaux = PV de base × multiplicateur de salle.

## Les 20 salles
| Salle | Ennemis | Mult. | PV totaux | DPS visé | Temps visé | Niv. visé | XP | Or |
|---|---|---|---|---|---|---|---|---|
| 1 | 4 Gobelin | ×1.05 | 252 | 21 | 12 s | 1 | 32 | 24 |
| 2 | 4 Gobelin | ×1.25 | 300 | 24 | 13 s | 2 | 32 | 24 |
| 3 | 3 Gobelin, 2 Archer squelette | ×1.3 | 351 | 24 | 15 s | 2 | 44 | 34 |
| 4 | 6 Archer squelette | ×1.55 | 418 | 26 | 16 s | 3 | 60 | 48 |
| 5 | ange | | | | | | | |
| 6 | 4 Gobelin, 2 Archer squelette | ×1.8 | 594 | 30 | 20 s | 4 | 52 | 40 |
| 7 | 3 Shaman | ×2.85 | 727 | 33 | 22 s | 5 | 42 | 36 |
| 8 | 4 Gobelin, 1 Shaman | ×2.45 | 796 | 33 | 24 s | 5 | 46 | 36 |
| 9 | 5 Archer squelette, 2 Shaman | ×2.45 | 968 | 37 | 26 s | 6 | 78 | 64 |
| 10 | 1 Ogre | ×2.35 | 1880 | 41 | 45 s | 7 | 70 | 60 |
| 11 | 7 Gobelin | ×2.85 | 1197 | 46 | 26 s | 8 | 56 | 42 |
| 12 | 4 Archer squelette, 3 Shaman | ×3 | 1305 | 46 | 28 s | 8 | 82 | 68 |
| 13 | 5 Gobelin, 2 Shaman | ×3.1 | 1457 | 52 | 28 s | 9 | 68 | 54 |
| 14 | 6 Archer squelette, 3 Gobelin | ×3.9 | 1755 | 58 | 30 s | 10 | 84 | 66 |
| 15 | ange | | | | | | | |
| 16 | 3 Shaman, 4 Gobelin | ×3.95 | 1955 | 65 | 30 s | 11 | 74 | 60 |
| 17 | 1 Ogre, 2 Gobelin | ×2.7 | 2484 | 73 | 34 s | 12 | 86 | 72 |
| 18 | 6 Archer squelette, 3 Shaman | ×4.45 | 2336 | 73 | 32 s | 12 | 102 | 84 |
| 19 | 8 Gobelin, 2 Archer squelette | ×4.9 | 2793 | 82 | 34 s | 13 | 84 | 64 |
| 20 | 1 Liche | ×3.2 | 6400 | 92 | 70 s | 14 | 170 | 160 |

Totaux : XP 1262, or 1036.
Les compositions des salles ont été rééchelonnées : les nombres d'ennemis augmentent au fil du chapitre (plafonnés à 8 gobelins, 6 archers, 3 shamans par salle pour que l'écran reste lisible).

## Progression et économie
| Réglage | Avant | Après | Pourquoi |
|---|---|---|---|
| XP par niveau de run | 30, 45, 65… 420 (10 valeurs) | 32, 45, 55, 65, 75, 85, 95, 105, 112, 118, 124, 130, 136 | Viser le niveau 14 à la fin du chapitre (environ 12 à 13 choix de compétence par run), sans paliers trop lents à la fin |
| Parchemins par run | 0 à 3 (moyenne 1,3), +3 si victoire | 1 à 5 (moyenne 3,2), +4 si victoire | Monter l'arme au niveau 5 devait demander environ 100 runs ; c'est maintenant 8 à 10 |
| Coût d'amélioration en parchemins | 1 + 0,5 par niveau | 0,5 + 0,25 par niveau (arrondi au-dessus) | Niveau 5 : 5 parchemins ; niveau 10 : 17 |
| Gemmes | 5 par boss, +20 victoire | 8 par boss, +30 victoire | Une victoire donne ≈ 54 gemmes, soit un coffre doré (50) |
| Coffre de bois | 500 or | 700 or | Un run complet rapporte ≈ 1 090 or : environ 1 coffre ou 1 talent par run |
| Or par ennemi | 2 à 60 | ×2 | Un run complet rapporte ≈ 1 090 or (≈ 400 pour un run qui s'arrête à la salle 10) |

## Les boutons de réglage pour ajuster après tes parties
- **Trop dur / trop facile partout** : multiplie les `difficulty` des salles dans `chapters.json`, ou change `roomDamageShare` dans `combat.json` (0 = les dégâts ne montent plus).
- **Trop de dégâts reçus** : baisse `damage` des ennemis dans `enemies.json`.
- **Salles trop courtes ou trop longues** : joue sur le nombre d'ennemis d'une salle, ou son `difficulty`.
- **Niveaux de run trop rapides ou lents** : `xpPerLevel` dans `progression.json`.

## Limites connues
- Le modèle suppose une habileté moyenne. Un joueur qui esquive bien ou qui construit une bonne combinaison de compétences ira beaucoup plus loin.
- Les compétences se combinent de façon non linéaire (Tir multiple + Ricochet + Perçant), la croissance réelle de 1,12 par niveau est une moyenne.
- Les objets, passifs de rareté et talents ne sont modélisés que par les trois profils ci-dessus.
- La valeur de 21 PV/s de DPS est le chiffre le plus important à vérifier en jeu : c'est lui qui règle tout le reste.
