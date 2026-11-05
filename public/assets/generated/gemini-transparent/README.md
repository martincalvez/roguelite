# Assets Gemini détourés

Ces fichiers sont des préparations locales des 11 images fournies par Martin le 5 novembre 2026. Les JPG sources contenaient un damier simulant la transparence ; ce damier est incorporé aux pixels.

- Les personnages, ennemis, objets et planches ont un vrai canal alpha PNG.
- La planche d'Aldric est fournie en 4×4, avec chaque case exportée séparément (`aldric-view-…`).
- La planche de chouette est fournie en 1×4, avec chaque pose exportée séparément (`owl-pose-…`).
- Les textures de mur et d'eau sont opaques : leur motif est leur contenu.

Pour tout régénérer depuis les JPG du dossier Téléchargements :

```sh
python3 scripts/remove_checkerboard.py \
  --manifest scripts/gemini-assets-manifest.json \
  --source-dir ~/Downloads \
  --output-dir public/assets/generated/gemini-transparent
```

Le script utilise Pillow. Il supprime le fond neutre connecté aux bords ; les planches sont traitées case par case pour contourner leurs séparateurs. La gemme d'XP et la pièce emploient un seuil plus large afin d'effacer le damier visible dans leurs halos JPG ; cela atténue un peu le bord du halo.

Ces fichiers sont des références prêtes à intégrer, pas encore utilisées par le jeu.
