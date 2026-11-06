# Cible visuelle et d'interface

Les captures fournies par Martin (IMG_3929 à IMG_3934, puis IMG_3936 à IMG_3942, 5 novembre 2026) sont les références visuelles de la phase 5. Elles montrent le niveau de couleur, de relief, de densité et de lisibilité souhaité pour les menus, l'équipement, les familiers et le combat. Cette direction complète le style Archero déjà défini dans `CLAUDE.md`.

## Langage visuel

- Interface mobile portrait, très colorée, lumineuse et immédiatement lisible.
- Boutons et cartes épais, contours sombres, ombres nettes, reflets, lueurs et cadres dorés ; fonds bleus, verts et turquoise saturés.
- Icônes illustrées, grandes et reconnaissables à petite taille ; raretés distinctes par couleur et cadre.
- Badges visibles pour nouveautés, améliorations et notifications.
- Décors de jeu vivants, avec profondeur, eau, végétation et arènes aux couleurs franches ; boss signalé par une barre de vie dédiée en haut.
- Choix de compétences dans de grandes cartes verticales, avec icône expressive, titre court et description lisible au téléphone.
- Les familiers apparaissent près du héros, dans l'écran de gestion et pendant le combat ; leur onglet et leur emplacement d'équipement doivent être faciles à trouver.

### Couleurs, matières et finitions des nouvelles références

- Fonds bleus profonds ou turquoise, souvent texturés avec motifs géométriques ; grandes zones vert prairie ou cyan clair pour les arènes.
- Panneaux et fenêtres très contrastés : magenta lumineux pour les bandeaux d'événement, violet pour les objets rares, bleu/cyan pour les panneaux et jaune-orangé pour les titres, cadres et commandes principales.
- Boutons larges jaune-or ou vert vif, avec bordure sombre, relief marqué et ombre portée. Les états doivent se distinguer immédiatement.
- Cartes d'équipement à cadres épais dont la couleur code la rareté, icône centrale ample, niveau en évidence et petits badges de catégorie.
- Fenêtres de détail sur fond crème/parchemin, bandeau supérieur jaune, sections de statistiques bien séparées et boutons d'action colorés.
- Menus illustrés avec personnages, familiers, coffres et objets mis en scène en grand ; l'arrière-plan peut être plus détaillé, mais le texte et les actions restent très lisibles.
- Effets lumineux, reflets, dégradés et petites particules pour donner une sensation de récompense et de matière, sans réduire le contraste du texte.
- **Typographie** : caractères ronds, très gras et légèrement condensés, proches des titres des captures ; texte clair avec contour sombre épais et ombre nette. Éviter la police monospace par défaut de Phaser.

## Écran de gestion visé

1. Bandeau de ressources en haut : niveau et XP, énergie, or, gemmes.
2. Héros ou familier mis en scène au centre, entouré des emplacements d'équipement sous forme de cartes carrées colorées selon la rareté.
3. Attaque et PV présentés en chiffres larges sous le personnage.
4. Onglets horizontaux pour les catégories (héros, familier, équipement et autres systèmes à venir).
5. Tri et filtres au-dessus d'une grille d'inventaire dense, mais lisible au doigt.
6. Navigation fixe en bas, adaptée à la zone de geste de l'iPhone ; l'onglet actif ressort nettement.

## Écrans de jeu visés

- **Accueil** : décor central reconnaissable, boutons latéraux pour les activités, grand bouton « Jouer » en bas au centre.
- **Talents** : fond bleu texturé, onglets en haut, icônes en médaillons hexagonaux, progression et bouton d'amélioration très visibles.
- **Combat** : arène lumineuse, héros et familier bien détachés du sol, effets de tir colorés, PV du boss en haut et commandes tactiles dégagées.
- **Choix de compétence** : panneau central contrasté et trois cartes verticales avec de grandes zones tactiles.

Les captures servent de référence de direction et de composition. Martin a confirmé qu'il peut utiliser les visuels concernés ; les ressources qu'il fournit ou choisit pourront donc être intégrées au projet.

## Référence prioritaire pour le combat et le mode Survie

La vidéo de gameplay envoyée par Martin le 5 novembre 2026 devient la référence principale pour les scènes de combat et le futur mode Survie. Les captures fixes IMG_3929–IMG_3942 restent la référence pour les menus, l'équipement, les familiers et les fenêtres. Le relevé ci-dessous suit la chronologie détaillée fournie par Martin ; le fichier MOV (environ 33 secondes, HEVC) n'a pas pu être extrait image par image dans l'environnement de développement. Ne pas présenter les détails non visibles dans le clip comme confirmés.

### Déroulé observé (00:00–00:33)

- **Départ (00:00)** : choix d'une capacité parmi trois grandes cartes crème à bordure dorée, avec icône et nom court ; le choix met le jeu en pause.
- **Mise en route (00:01–00:05)** : écran de combat de niveau 1, joystick flottant en bas, compteur de pièces en haut. Une roue de la fortune propose « Commencer », tourne, puis verse des pièces avec une animation de jaillissement.
- **Salles et pièges (00:05–00:22)** : déplacement rapide au travers de salles ouvertes et de passages de pierre, sol d'herbe quadrillé, blocs, eau et végétation. Des tourelles tirent horizontalement ; des pièges de feu et des projectiles obligent à changer de trajectoire. Monstres roses et tireurs verts sont combattus en mouvement.
- **Combat et butin** : attaques répétées pendant les déplacements, projectiles, chiffres de dégâts très visibles, ennemis qui disparaissent à leur mort, pièces et objets au sol, notifications courtes comme « Snack pour familier x1 » et « Saphir x2 ».
- **Montée de niveau (00:22–00:26)** : retour à trois cartes de compétences, pause puis reprise après sélection. Le relevé fourni comporte des noms d'options divergents ; seuls le format des cartes et le principe de choix sont certains.
- **Ennemi majeur (00:26–fin)** : grand chevalier bleu, barre de vie dédiée, attaques à esquiver en tournant autour des obstacles. La vidéo s'arrête pendant ce combat ; son issue et le contenu après l'étape 50 ne sont pas montrés.

### Règles de rendu à reprendre

- Vue de dessus en portrait, avec personnage volontairement petit par rapport à l'arène dans cette vidéo. Cette proportion devient prioritaire pour le combat, même si une ancienne capture montrait un héros plus grand.
- Sols en tuiles lisibles ; alternance herbe vive, pierre claire, couloirs et canaux d'eau. Murs de pierre épais et obstacles qui dessinent des trajectoires.
- Couleurs franches pour distinguer le héros, les ennemis, les projectiles, les pièges et les récompenses. Les effets doivent être visibles sans masquer la navigation.
- Barre du niveau/progression en haut, pièces à droite, joystick en bas. Cartes de compétence en pause, textes très courts, grandes icônes.
- Rythme vif : changements de direction fréquents, tirs sans immobiliser le héros, récompenses brèves et immédiatement lisibles.
- **Variété de salle** : le plan, les points d'apparition et les zones de danger changent à chaque porte. Les attaques venant des côtés ou du bas valorisent les tirs arrière et latéraux ; aucune apparition ne doit tomber directement sur le héros.
- **Télégraphie** : une boule de feu et un tir en cloche annoncent clairement leur zone d'impact par une marque lumineuse ; les murs arrêtent les tirs droits, tandis qu'un projectile en cloche les survole. Les effets restent compacts pour ne pas masquer le joystick ni les trajectoires.
- **Volumes** : éviter les murs en pierre répétés et plats. Préférer un cadre épais coloré, des obstacles bas à ombres douces et reflets, et des feux à plusieurs couches (braises, cœur jaune, étincelles) pour garder la lecture à vitesse élevée.

### Assets à obtenir en priorité

1. **Kit de décor vu de dessus** : tuiles d'herbe, pierre, eau, murs et blocs, couleurs coordonnées et raccords propres.
2. **Ennemis isolés en PNG transparent** : tourelle rouge, monstre rose, tireur vert et chevalier bleu de grande taille.
3. **Planches d'animation cohérentes** : Aldric en déplacement/attaque et chouette en vol ; toutes les cases gardent la même échelle et le même angle de vue.
4. **Effets et butin** : flèches, poison, éclair, gemme d'XP, pièces, saphir et snack de familier.

Pour le tout premier lot, le décor et les quatre ennemis auront le plus grand effet visuel. Générer les éléments séparément, sans texte ni interface incrustée, afin de pouvoir les animer et les placer librement.

## Ordre prévu

- **5.5 d'abord** : finaliser le langage visuel, les polices et les assets de combat prioritaires, puis vérifier sur téléphone.
- **5.4 ensuite** : créer le mode Survie en réutilisant les salles, compétences, combats et sauvegarde existants.
- **5.1–5.3** : les fonctionnalités sont codées/publiées ; les validations manuelles restantes sont consignées dans `docs/ETAT-DU-PROJET.md`.
