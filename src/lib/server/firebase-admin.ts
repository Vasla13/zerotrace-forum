import "server-only";

import {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function getFirebaseConfigValue<T extends "projectId" | "storageBucket">(
  key: T,
) {
  const firebaseConfig = process.env.FIREBASE_CONFIG;

  if (!firebaseConfig) {
    return null;
  }

  try {
    const parsed = JSON.parse(firebaseConfig) as Record<string, unknown>;

    return typeof parsed[key] === "string" ? parsed[key] : null;
  } catch {
    return null;
  }
}

function getFirebaseAdminApp() {
  if (getApps().length) {
    return getApp();
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.GCLOUD_PROJECT ??
    process.env.GCP_PROJECT ??
    getFirebaseConfigValue("projectId") ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket =
    process.env.FIREBASE_ADMIN_STORAGE_BUCKET ??
    getFirebaseConfigValue("storageBucket") ??
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        clientEmail,
        privateKey,
        projectId,
      }),
      projectId,
      storageBucket,
    });
  }

  if (projectId) {
    return initializeApp({
      credential: applicationDefault(),
      projectId,
      storageBucket,
    });
  }

  throw new Error(
    "Configuration Firebase Admin manquante. Ajoute FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL et FIREBASE_ADMIN_PRIVATE_KEY en local.",
  );
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseAdminDb() {
  return getFirestore(getFirebaseAdminApp());
}

export function getFirebaseAdminStorage() {
  return getStorage(getFirebaseAdminApp());
}
