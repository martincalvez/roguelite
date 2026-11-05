# Mise en ligne et installation sur téléphone

Le jeu est publié sur **GitHub Pages** par la GitHub Action `.github/workflows/deploy.yml` : à chaque push sur `main` (ou `master`), elle lance `npm ci` puis `npm run build` et publie `dist/`.

## Réglages à faire une seule fois sur GitHub

1. Crée un dépôt sur github.com (bouton **New**). Nom au choix, par exemple `roguelite`. Laisse-le **vide** (pas de README, pas de .gitignore).
   - Dépôt **public** : Pages est gratuit. Dépôt **privé** : Pages demande un abonnement payant (Pro ou Team).
2. Dans le dossier du projet, relie-le et envoie le code :
   ```bash
   git remote add origin https://github.com/TON-PSEUDO/roguelite.git
   git branch -M main
   git push -u origin main
   ```
3. Sur GitHub : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
4. Onglet **Actions** : le workflow « Déploiement GitHub Pages » tourne (1 à 2 minutes). S'il est rouge, ouvre-le pour lire l'erreur.
5. L'adresse du jeu est `https://TON-PSEUDO.github.io/roguelite/` (affichée à la fin du workflow et dans Settings → Pages).

Ensuite, chaque `git push` met le jeu à jour tout seul.

## Installer sur l'écran d'accueil

- **iPhone (Safari)** : ouvre l'adresse → bouton Partager → **Sur l'écran d'accueil**.
- **Android (Chrome)** : ouvre l'adresse → menu ⋮ → **Installer l'application** (ou « Ajouter à l'écran d'accueil »).

Le jeu s'ouvre alors en plein écran, en portrait, avec son icône. Après une première visite, il se relance aussi hors ligne.

## Bon à savoir

- Le service worker ne s'active qu'en HTTPS : il est donc absent en local (`npm run dev`), ce qui évite de servir une vieille version pendant le développement.
- Réseau d'abord : quand tu es en ligne, tu as toujours la dernière version. Hors ligne, c'est la copie en cache.
- La sauvegarde (`localStorage`) est propre à chaque appareil et à chaque adresse : PC et téléphone n'ont pas la même progression avant la synchro de la phase 4.

## Compte cloud (Supabase)

Le compte est facultatif : sans configuration, le jeu fonctionne comme avant, et le bouton COMPTE est grisé.

- **En local :** le fichier `.env.local` (jamais commité, modèle : `.env.example`) contient `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`. Après l'avoir modifié, relance `npm run dev`.
- **En ligne :** les deux mêmes valeurs sont dans les **Variables** du dépôt GitHub (Settings → Secrets and variables → Actions → Variables). Le workflow les lit au moment du build.
- **Sécurité :** la clé utilisée est la clé *publique* (« publishable » ou « anon »), visible dans le jeu publié par conception. Les données sont protégées par les règles RLS de `docs/supabase/001_saves.sql`. La clé « secret » ou « service_role » ne doit jamais être utilisée.
- **Connexion :** par code à 6 chiffres reçu par e-mail, sans mot de passe. Les inscriptions sont fermées : seule l'adresse créée à la main dans Supabase (Authentication → Users) peut se connecter.
- **Projet en pause :** le plan gratuit met le projet en pause après environ une semaine sans activité. Le jeu continue alors en local ; relance le projet dans le tableau de bord Supabase.
