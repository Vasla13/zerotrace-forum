import { getApp, getApps, initializeApp } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import {
  getFirebaseConfig,
  hasExplicitFirebaseConfig,
  isFirebaseConfigured,
} from "@/lib/firebase/config";

let persistenceInitialized = false;

function getFirebaseApp() {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase n'est pas configuré.");
  }

  if (getApps().length) {
    return getApp();
  }

  return hasExplicitFirebaseConfig
    ? initializeApp(getFirebaseConfig())
    : initializeApp();
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb() {
  return getFirestore(getFirebaseApp());
}

export async function prepareFirebaseAuth() {
  if (!isFirebaseConfigured || persistenceInitialized) {
    return;
  }

  persistenceInitialized = true;
  await setPersistence(getFirebaseAuth(), browserLocalPersistence).catch(
    () => undefined,
  );
}
