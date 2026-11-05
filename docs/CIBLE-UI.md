# Cible d'interface (inspiration, à atteindre progressivement)

Martin vise à terme une interface de gestion dans l'esprit d'un jeu mobile de roguelite d'action moderne (référence : l'écran « Équipement » d'un Archero récent). Cette note décrit la **structure** à reproduire avec **nos propres visuels** : on ne copie ni les images, ni les icônes, ni les noms de ce jeu (voir CLAUDE.md : le dépôt est public). La capture de référence n'est pas stockée dans le dépôt.

## Structure de l'écran équipement visé

1. **Bandeau de monnaies en haut** : niveau de compte avec % d'XP, énergie, or, gemmes (chaque monnaie dans une pastille arrondie avec son icône).
2. **Le héros au centre**, grand, entouré des slots : une colonne de slots à gauche, une à droite, un slot en bas au centre. Chaque slot est une case carrée à la couleur de sa rareté, avec le niveau (« Lv.60 »), une pastille d'état en coin (améliorable, nouveau) et une petite flèche verte si une amélioration est possible.
3. **Ligne de statistiques** sous le héros : Attaque et PV en gros chiffres.
4. **Onglets de catégories** (Héros, Familier, Ailes…) en bandeau défilant.
5. **Barre de tri/filtre** (« Par qualité », « Collections », « Favoris », « Forge ») au-dessus de la grille.
6. **Grille d'inventaire** de cases carrées colorées par rareté, avec icône de type en haut à gauche et niveau en bas.
7. **Barre de navigation fixe en bas** (5 onglets : coffres, équipement, carte/chapitres, talents/amélioration, défi/mode), l'onglet actif agrandi, des pastilles rouges de notification.

## Ce qu'on garde de notre côté
- Mobile d'abord (rien d'important dans les 60 px du bas : la barre de navigation doit tenir compte de la zone de geste du téléphone).
- Style cartoon coloré (voir CLAUDE.md, direction artistique).
- Visuels générés ou libres de droits (Kenney, OpenGameArt) puis dessinés par nous en phase 5.5, jamais extraits du jeu de référence.

## Plan proposé
- **Pendant la phase 3** : barre de navigation du bas (Équipement, Coffres, Talents, Jouer) et bandeau de monnaies commun à tous les écrans, pour que 3.2 à 3.5 s'y branchent directement.
- **Après la 3.5** : refonte de l'écran équipement (héros au centre, slots autour, grille colorée, onglets), avec toujours des formes générées.
- **Phase 5.5** : vrais visuels (héros, icônes d'objets, fonds).
