# ZeroTrace

Forum web complet construit avec `Next.js`, `TypeScript`, `Firebase Auth` et `Cloud Firestore`.

Le projet Firebase dédié a été créé le `4 avril 2026` avec :

- nom affiché : `forum`
- project ID : `forum-20260404`
- web app : `forum-web`

## Stack

- Frontend : `Next.js 16` + `React 19` + `Tailwind CSS 4`
- Auth : `Firebase Authentication`
- Base de données : `Cloud Firestore`
- Validation : `Zod` + `react-hook-form`
- Notifications : `sonner`

## Fonctionnalités

- inscription avec pseudo, email et mot de passe
- connexion / déconnexion
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

## Arborescence

```text
forum/
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

## Notes techniques

- Les mots de passe sont hashés et gérés par Firebase Auth.
- Les règles Firestore limitent la modification et la suppression au propriétaire du contenu.
- Le rendu des posts et commentaires est en texte brut, sans HTML injecté.
- La recherche s’appuie sur un index de mots-clés généré au moment de la création / édition des posts.
