import type { FirebaseOptions } from "firebase/app";

const rawFirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const usesAppHostingAutoConfig =
  process.env.NEXT_PUBLIC_FIREBASE_AUTOCONFIG === "true";

export const missingFirebaseConfigurationMessage =
  "Configuration Firebase manquante. Lance `npm run firebase:setup -- --projectId forum-20260404`.";

export const hasExplicitFirebaseConfig = [
  rawFirebaseConfig.apiKey,
  rawFirebaseConfig.authDomain,
  rawFirebaseConfig.projectId,
  rawFirebaseConfig.storageBucket,
  rawFirebaseConfig.messagingSenderId,
  rawFirebaseConfig.appId,
].every(Boolean);

export const isFirebaseConfigured =
  hasExplicitFirebaseConfig || usesAppHostingAutoConfig;

export function getFirebaseConfig(): FirebaseOptions {
  if (!hasExplicitFirebaseConfig) {
    throw new Error(missingFirebaseConfigurationMessage);
  }

  return {
    apiKey: rawFirebaseConfig.apiKey,
    authDomain: rawFirebaseConfig.authDomain,
    projectId: rawFirebaseConfig.projectId,
    storageBucket: rawFirebaseConfig.storageBucket,
    messagingSenderId: rawFirebaseConfig.messagingSenderId,
    appId: rawFirebaseConfig.appId,
    measurementId: rawFirebaseConfig.measurementId || undefined,
  } satisfies FirebaseOptions;
}
