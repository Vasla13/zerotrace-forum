import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.trim().startsWith("#"))
    .reduce((result, line) => {
      const separatorIndex = line.indexOf("=");

      if (separatorIndex === -1) {
        return result;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();

      result[key] = value;
      return result;
    }, {});
}

function getEnvValue(key, fileValues) {
  return process.env[key] || fileValues[key] || "";
}

function getFirebaseAdminApp() {
  const envFileValues = parseEnvFile(resolve(".env.local"));
  const projectId =
    getEnvValue("FIREBASE_ADMIN_PROJECT_ID", envFileValues) ||
    getEnvValue("NEXT_PUBLIC_FIREBASE_PROJECT_ID", envFileValues);
  const clientEmail = getEnvValue("FIREBASE_ADMIN_CLIENT_EMAIL", envFileValues);
  const privateKey = getEnvValue("FIREBASE_ADMIN_PRIVATE_KEY", envFileValues).replace(
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
    });
  }

  if (projectId) {
    return initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }

  throw new Error(
    "Configuration Firebase Admin manquante. Ajoute FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL et FIREBASE_ADMIN_PRIVATE_KEY en local.",
  );
}

async function backfillPostRealms(db) {
  const snapshot = await db.collection("posts").get();
  let updated = 0;

  for (const postSnapshot of snapshot.docs) {
    if (typeof postSnapshot.data().realm === "string") {
      continue;
    }

    await postSnapshot.ref.update({
      realm: "public",
    });
    updated += 1;
  }

  return updated;
}

const app = getFirebaseAdminApp();
const db = getFirestore(app);
const updated = await backfillPostRealms(db);

console.log(`Posts avec realm public ajoute: ${updated}`);
