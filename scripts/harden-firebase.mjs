import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

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

function readProvisionedHashes() {
  const filePath = resolve("src/lib/generated/access-codes.server.ts");
  const file = readFileSync(filePath, "utf8");
  const matches = [...file.matchAll(/"([a-f0-9]{64})"/g)];

  return matches.map((match) => match[1]);
}

async function syncLegacyAccessCodes(db) {
  const hashes = readProvisionedHashes();
  let created = 0;

  for (const hash of hashes) {
    const ref = db.collection("accessCodes").doc(hash);
    const snapshot = await ref.get();

    if (snapshot.exists) {
      continue;
    }

    await ref.create({
      createdAt: new Date(),
      createdByUid: null,
      fingerprint: hash.slice(0, 8).toUpperCase(),
      hash,
      note: "import legacy",
      revokedAt: null,
      revokedByUid: null,
      source: "legacy-file",
      usedAt: null,
      usedByUid: null,
    });
    created += 1;
  }

  return created;
}

async function scrubUserEmails(db) {
  const snapshot = await db.collection("users").get();
  let updated = 0;

  for (const documentSnapshot of snapshot.docs) {
    if (!("email" in documentSnapshot.data())) {
      continue;
    }

    await documentSnapshot.ref.update({
      email: FieldValue.delete(),
    });
    updated += 1;
  }

  return updated;
}

async function backfillLikeCounts(db) {
  const snapshot = await db.collection("posts").get();
  let updated = 0;

  for (const postSnapshot of snapshot.docs) {
    const likesSnapshot = await postSnapshot.ref.collection("likes").get();
    const likeCount = likesSnapshot.size;
    const currentLikeCount = postSnapshot.data().likeCount;

    if (currentLikeCount === likeCount) {
      continue;
    }

    await postSnapshot.ref.update({
      likeCount,
    });
    updated += 1;
  }

  return updated;
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

async function rotateLegacyPasswords(auth) {
  const hashes = readProvisionedHashes();
  let updated = 0;

  for (const hash of hashes) {
    const email = `${hash}@auth.nest.local`;

    try {
      const userRecord = await auth.getUserByEmail(email);
      await auth.updateUser(userRecord.uid, {
        password: randomBytes(32).toString("hex"),
      });
      updated += 1;
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "auth/user-not-found"
      ) {
        continue;
      }

      throw error;
    }
  }

  return updated;
}

const app = getFirebaseAdminApp();
const auth = getAuth(app);
const db = getFirestore(app);

const [createdAccessCodes, scrubbedUsers, updatedPosts, updatedPostRealms, rotatedPasswords] = await Promise.all([
  syncLegacyAccessCodes(db),
  scrubUserEmails(db),
  backfillLikeCounts(db),
  backfillPostRealms(db),
  rotateLegacyPasswords(auth),
]);

console.log(`Codes legacy importes: ${createdAccessCodes}`);
console.log(`Profils nettoyes: ${scrubbedUsers}`);
console.log(`Posts avec likeCount corrige: ${updatedPosts}`);
console.log(`Posts avec realm public ajoute: ${updatedPostRealms}`);
console.log(`Mots de passe herites rotates: ${rotatedPasswords}`);
