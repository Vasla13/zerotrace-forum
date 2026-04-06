# NEST

Réseau/forum clandestin construit avec `Next.js`, `TypeScript`, `Firebase Auth` et `Cloud Firestore`.

Le projet Firebase dédié a été créé le `4 avril 2026` avec :

- nom affiché : `nest`
- project ID : `forum-20260404`
- web app : `nest-web`

## Stack

- Frontend : `Next.js 16` + `React 19` + `Tailwind CSS 4`
- Auth : `Firebase Authentication`
- Base de données : `Cloud Firestore`
- Validation : `Zod` + `react-hook-form`
- Notifications : `sonner`

## Fonctionnalités

- accès par code vers un forum public
- authentification par `code d’accès` validé côté serveur
- pseudo optionnel avec génération d’alias
- session persistée via Firebase Auth
- profil public avec pseudo, date d’inscription et nombre de posts
- création, modification et suppression de ses propres posts
- affichage des posts du plus récent au plus ancien
- page détail d’un post
- commentaires modifiables / supprimables par leur auteur
- likes
- recherche simple par mots-clés
- pagination via chargement progressif
- avatar par défaut généré depuis le pseudo
- interface forum volontairement simple
- panneau admin web pour gérer les utilisateurs et les codes d’accès

## Arborescence

```text
nest/
├─ src/
│  ├─ app/
│  │  ├─ login/
│  │  ├─ register/
│  │  ├─ posts/
│  │  ├─ profile/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx
│  │  └─ globals.css
│  ├─ components/
│  │  ├─ auth-form.tsx
│  │  ├─ forum-home.tsx
│  │  ├─ post-card.tsx
│  │  ├─ post-editor-form.tsx
│  │  ├─ post-page.tsx
│  │  └─ profile-page.tsx
│  ├─ lib/
│  │  ├─ data/
│  │  │  ├─ users.ts
│  │  │  ├─ posts.ts
│  │  │  ├─ comments.ts
│  │  │  └─ likes.ts
│  │  ├─ firebase/
│  │  ├─ types/
│  │  ├─ utils/
│  │  └─ validation/
│  └─ providers/
├─ scripts/
│  └─ firebase-setup.mjs
├─ firestore.rules
├─ firestore.indexes.json
├─ firebase.json
├─ .firebaserc
└─ .env.local.example
```

## Installation

```bash
npm install
```

Le projet est déjà branché localement sur Firebase via `.env.local`.

Pour les routes serveur d’authentification et d’administration locale, ajoute aussi :

```bash
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
FORUM_BOOTSTRAP_ADMIN_UIDS=
FORUM_BOOTSTRAP_ADMIN_USERNAMES=
FORUM_BOOTSTRAP_ACCESS_CODES=
```

Pour ouvrir le premier accès admin dans le site, renseigne au moins :

```bash
FORUM_BOOTSTRAP_ADMIN_USERNAMES=tonpseudo
```

Connecte-toi avec ce pseudo, puis ouvre `/admin`.

Si tu veux aussi provisionner un code local fixe pour ce compte, tu peux ajouter :

```bash
FORUM_BOOTSTRAP_ACCESS_CODES=netrunner
```

Dans ce cas, connecte-toi avec le pseudo `trinity` et le code `netrunner`, puis ouvre `/admin`.

## Lancement

```bash
npm run dev
```

Puis ouvre `http://localhost:3000`.

## Déploiement des règles Firestore

Avant d’utiliser la base distante, pousse les règles et index :

```bash
npm run firebase:deploy
```

## Assainissement des anciennes données

Après migration depuis l’ancien flux d’auth, tu peux nettoyer la base et durcir les anciens comptes :

```bash
npm run firebase:harden
```

## Site en ligne

Le site est accessible sur :

- `https://zerotrace-forum.web.app`
- `https://zerotrace--forum-20260404.europe-west4.hosted.app`

## Déploiement App Hosting

Le backend App Hosting configuré pour ce repo est `zerotrace`.

App Hosting injecte automatiquement la configuration Firebase Web en production. La clé web n'est donc plus committée dans `apphosting.yaml`.

Pour republier l'application web :

```bash
npm run firebase:deploy:app
```

Pour republier l'URL courte Firebase Hosting :

```bash
npm run firebase:deploy:hosting
```

Pour tout redéployer :

```bash
npm run firebase:deploy:full
```

## Commandes utiles

```bash
npm run dev
npm run build
npm run lint
npm run firebase:setup -- --projectId forum-20260404
npm run firebase:deploy
npm run firebase:deploy:hosting
npm run firebase:deploy:app
npm run firebase:deploy:full
```

## Gestion des codes d’accès

Depuis le site, ouvre `/admin` pour :

- générer des codes d’accès
- révoquer / réactiver des codes
- promouvoir ou retirer des admins
- supprimer des comptes utilisateurs

En CLI, tu peux aussi générer de nouveaux codes directement dans Firestore :

```bash
npm run access:codes -- --count 5
```

Le script affiche les codes en clair dans le terminal et les enregistre dans la collection `accessCodes`.

## Notes techniques

- Les identités sont mappées sur des comptes Firebase cachés dérivés du code d’accès.
- Les codes d’accès sont validés côté serveur puis convertis en custom token Firebase.
- Les règles Firestore limitent la modification directe côté client et réservent les actions sensibles au backend.
- Le rendu des posts et commentaires est en texte brut, sans HTML injecté.
- La recherche parcourt les posts du plus récent au plus ancien pour renvoyer des résultats complets.
- Les anciens hashes locaux peuvent être importés vers Firestore avec `npm run firebase:harden`.
