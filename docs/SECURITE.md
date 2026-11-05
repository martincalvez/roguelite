# Sécurité du projet (revue 4.4, 5 novembre 2026)

Le dépôt GitHub est **public** et le jeu est publié sur GitHub Pages. Ce document dit ce qui est public, ce qui est protégé, ce qui a été vérifié, et ce que Martin doit contrôler lui-même. Il ne contient aucun secret.

## Ce qui est public par conception
- Tout le code et toutes les données de jeu (le jeu est solo : rien à cacher).
- L'URL du projet Supabase et la clé **publique** (`publishable`/`anon`) : elles finissent dans le jeu publié. Elles ne donnent aucun droit par elles-mêmes ; c'est la **sécurité par ligne (RLS)** de la base qui protège les sauvegardes.
- Le schéma SQL (`docs/supabase/001_saves.sql`).

## Ce qui doit rester secret (et où il vit)
| Secret | Où | Jamais |
|---|---|---|
| Clé `secret` / `service_role` Supabase | nulle part (on ne l'utilise pas) | dans le dépôt, le chat, le jeu |
| Mot de passe de la base Supabase | gestionnaire de mots de passe | dans le dépôt, le chat |
| Clé d'envoi Resend (SMTP) | gestionnaire + tableau de bord Supabase | dans le dépôt, le chat |
| Mots de passe des comptes Supabase, GitHub, Resend | gestionnaire de mots de passe, double authentification | partout ailleurs |
| `.env.local` | disque de Martin, ignoré par git | commité |

## Vérifications faites (résultats)
| Contrôle | Résultat |
|---|---|
| Secrets dans tout l'historique git (clés, jetons, mots de passe, `.env`) | **rien** ; seul `.env.example` (valeurs bidons) est commité |
| `.env.local` jamais commité | **oui** |
| Jeu publié : clé secrète, clé d'envoi, e-mail perso | **absents** (la chaîne `sb_secret_` du bundle est le contrôle de la bibliothèque qui *refuse* une telle clé dans un navigateur) |
| Journalisation (`console.*`) d'e-mails, codes ou jetons | **aucune** dans le code du jeu |
| API sondée avec la seule clé publique : lire / écrire / modifier / supprimer `saves` | **refusé** (HTTP 401, code 42501 « permission denied ») |
| API : liste des tables exposée aux visiteurs | **refusée** (401) ; table privée (`auth.users`) : introuvable (404) |
| Inscriptions publiques | **fermées** (`disable_signup = true`), seul le fournisseur « e-mail » est actif |
| Connexion avec une adresse inconnue | même message qu'une adresse valide (pas de fuite sur l'existence d'un compte) |
| Content-Security-Policy du build de production | active : aucune ressource externe sauf Supabase ; jeu et écran COMPTE testés sans violation |
| Essais de code | limités à 5 côté jeu, puis nouveau code obligatoire |
| Suppression de la sauvegarde cloud | supprime la ligne, pas le compte ; l'appareil garde sa progression |

## À faire par Martin (je ne peux pas le vérifier moi-même)
1. **Lancer `docs/supabase/002_security_tests.sql`** dans le SQL Editor : il simule deux joueurs, ne modifie rien, et affiche 14 résultats (tous doivent être « OK »). Dis-moi ce qu'il affiche.
2. **Supabase → Authentication** : « Allow new users to sign up » décoché (déjà vu), durée d'expiration du code réglée à **600 s** (10 minutes) et longueur **6** (Sign In / Providers → Email) ; **Rate Limits** : laisser les valeurs par défaut ou les baisser.
3. **Double authentification** activée sur les comptes **GitHub, Supabase et Resend**.
4. **Resend** : la clé API doit avoir la permission **« Sending access »** seulement (pas « Full access »).
5. **GitHub → ton dépôt → Settings → Code security** : activer **Secret scanning**, **Push protection** (bloque un push contenant une clé) et **Dependabot alerts** (gratuit sur un dépôt public).
6. Après le test, **supprimer tout compte de test** créé dans Supabase (Authentication → Users).

## Constats et décisions
| Gravité | Constat | Décision |
|---|---|---|
| Moyenne | Ton adresse e-mail Gmail figure dans les métadonnées des commits (publiques). | À décider par Martin : activer « Keep my email addresses private » dans GitHub et utiliser l'adresse noreply pour la suite ; réécrire l'historique est possible mais non recommandé. |
| Faible | Les GitHub Actions du déploiement sont référencées par version (`@v4`) et non par empreinte de commit : une action compromise pourrait s'exécuter dans le build. | Acceptable pour un jeu perso ; Dependabot peut proposer les mises à jour. Épingler par empreinte si le projet grandit. |
| Faible | La CSP par balise `meta` ne peut pas poser `frame-ancestors` (GitHub Pages n'envoie pas d'en-têtes) : le jeu peut être mis dans une page tierce. | Sans conséquence : aucune action sensible, la connexion se fait par code. |
| Faible | `style-src 'unsafe-inline'` est nécessaire (champs de saisie du jeu). | Accepté ; les scripts, eux, n'autorisent que `'self'`. |
| Info | La sauvegarde cloud est modifiable par son propriétaire (comme le `localStorage`). | Accepté : jeu solo, sans classement ni achat. Aucune confiance accordée aux données reçues sans contrôle de forme (`isPlausibleSave`) et de version. |
| Info | Le service d'e-mail gratuit (Resend, expéditeur `onboarding@resend.dev`) n'envoie qu'à l'adresse du propriétaire du compte Resend. | Convient à un joueur unique. Un second joueur demanderait un domaine vérifié. |

## RGPD (données personnelles)
- **Seule donnée personnelle : ton adresse e-mail**, stockée par Supabase (authentification, région choisie à la création du projet). La sauvegarde ne contient aucune donnée personnelle.
- **Sous-traitants :** Supabase (base et authentification), Resend (envoi du code : voit l'adresse du destinataire et le contenu du message), GitHub (hébergement des fichiers du jeu).
- **Suppression :** « Supprimer ma sauvegarde cloud » (écran COMPTE) supprime la ligne ; supprimer l'utilisateur dans Supabase (Authentication → Users) supprime aussi sa sauvegarde (suppression en cascade) ; supprimer le compte Resend efface les envois.

## Si une clé fuite
1. **Révoque-la tout de suite** chez le fournisseur (Resend : API Keys → supprimer ; Supabase : régénérer les clés dans Settings → API Keys). Supprimer le fichier ou réécrire l'historique ne suffit pas : une clé publiée doit être considérée comme perdue.
2. Remplace-la (gestionnaire de mots de passe, `.env.local`, Variables GitHub, SMTP Supabase).
3. Préviens Claude : on cherche dans l'historique ce qui a pu fuiter.
