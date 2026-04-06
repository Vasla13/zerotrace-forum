import { randomBytes, createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

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
    "Configuration Firebase Admin manquante. Ajoute FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL et FIREBASE_ADMIN_PRIVATE_KEY.",
  );
}

function parseArgs(argv) {
  const result = {
    count: 3,
    note: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === "--count" && next) {
      result.count = Number.parseInt(next, 10) || result.count;
      index += 1;
      continue;
    }

    if (current === "--note" && next) {
      result.note = next;
      index += 1;
    }
  }

  return result;
}

function canonicalizeAccessCode(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function hashAccessCode(value) {
  return createHash("sha256").update(canonicalizeAccessCode(value)).digest("hex");
}

function formatAccessCode(value) {
  return canonicalizeAccessCode(value).match(/.{1,4}/g)?.join("-") ?? value;
}

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  let output = "NEST";

  for (let index = 0; index < bytes.length; index += 1) {
    output += alphabet[bytes[index] % alphabet.length];
  }

  return formatAccessCode(output);
}

const args = parseArgs(process.argv.slice(2));
const db = getFirestore(getFirebaseAdminApp());
const generatedCodes = [];

while (generatedCodes.length < args.count) {
  const code = generateCode();
  const hash = hashAccessCode(code);
  const ref = db.collection("accessCodes").doc(hash);
  const snapshot = await ref.get();

  if (snapshot.exists) {
    continue;
  }

  await ref.create({
    createdAt: Timestamp.now(),
    createdByUid: null,
    fingerprint: hash.slice(0, 8).toUpperCase(),
    hash,
    note: args.note || null,
    revokedAt: null,
    revokedByUid: null,
    source: "script",
    usedAt: null,
    usedByUid: null,
  });

  generatedCodes.push(code);
}

console.log("Codes d’accès générés :");
generatedCodes.forEach((code) => {
  console.log(`- ${code}`);
});
console.log("");
console.log("Les codes ont été enregistrés dans Firestore.");
