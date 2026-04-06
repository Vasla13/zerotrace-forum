import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { accessCodeHashes } from "@/lib/generated/access-codes.server";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import { HttpError } from "@/lib/server/http";
import { canonicalizeAccessCode } from "@/lib/utils/access-code";

export type AccessCodeRecord = {
  createdAt: Date | null;
  createdByUid: string | null;
  fingerprint: string;
  hash: string;
  note: string | null;
  revokedAt: Date | null;
  revokedByUid: string | null;
  source: string | null;
  usedAt: Date | null;
  usedByUid: string | null;
};

function parseEnvList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function hashAccessCodeServer(value: string) {
  return createHash("sha256")
    .update(canonicalizeAccessCode(value))
    .digest("hex");
}

const legacyHashes = new Set<string>([
  ...accessCodeHashes,
  ...parseEnvList(process.env.FORUM_BOOTSTRAP_ACCESS_CODES).map((value) =>
    hashAccessCodeServer(value),
  ),
]);
let legacySyncPromise: Promise<void> | null = null;

function toDate(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate() as Date;
  }

  return null;
}

function mapAccessCodeRecord(
  hash: string,
  data: Record<string, unknown> | undefined,
): AccessCodeRecord | null {
  if (!data) {
    return null;
  }

  return {
    createdAt: toDate(data.createdAt),
    createdByUid:
      typeof data.createdByUid === "string" ? data.createdByUid : null,
    fingerprint:
      typeof data.fingerprint === "string"
        ? data.fingerprint
        : hash.slice(0, 8).toUpperCase(),
    hash,
    note: typeof data.note === "string" && data.note.trim() ? data.note : null,
    revokedAt: toDate(data.revokedAt),
    revokedByUid:
      typeof data.revokedByUid === "string" ? data.revokedByUid : null,
    source: typeof data.source === "string" ? data.source : null,
    usedAt: toDate(data.usedAt),
    usedByUid: typeof data.usedByUid === "string" ? data.usedByUid : null,
  };
}

export function buildAccessCodeEmail(value: string) {
  return `${hashAccessCodeServer(value)}@auth.nest.local`;
}

export function createSecurePassword() {
  return randomBytes(32).toString("hex");
}

export function generateAccessCodeValue() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  let output = "NEST";

  for (let index = 0; index < bytes.length; index += 1) {
    output += alphabet[bytes[index] % alphabet.length];
  }

  return canonicalizeAccessCode(output).match(/.{1,4}/g)?.join("-") ?? output;
}

export async function syncLegacyAccessCodesToFirestore() {
  if (legacySyncPromise) {
    return legacySyncPromise;
  }

  legacySyncPromise = (async () => {
    if (!legacyHashes.size) {
      return;
    }

    const db = getFirebaseAdminDb();
    const batch = db.batch();
    let changed = false;

    for (const hash of legacyHashes) {
      const ref = db.collection("accessCodes").doc(hash);
      const snapshot = await ref.get();

      if (snapshot.exists) {
        continue;
      }

      batch.set(ref, {
        createdAt: Timestamp.now(),
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
      changed = true;
    }

    if (changed) {
      await batch.commit();
    }
  })();

  return legacySyncPromise;
}

export async function getAccessCodeRecordByHash(hash: string) {
  await syncLegacyAccessCodesToFirestore();

  const snapshot = await getFirebaseAdminDb().collection("accessCodes").doc(hash).get();

  if (!snapshot.exists) {
    return null;
  }

  return mapAccessCodeRecord(hash, snapshot.data() as Record<string, unknown>);
}

export async function getAccessCodeRecordByCode(value: string) {
  return getAccessCodeRecordByHash(hashAccessCodeServer(value));
}

export async function assertProvisionedAccessCode(value: string) {
  const record = await getAccessCodeRecordByCode(value);

  if (!record || record.revokedAt) {
    throw new HttpError(401, "Code d’accès invalide.");
  }

  return record;
}

export async function markAccessCodeUsed(hash: string, uid: string) {
  const db = getFirebaseAdminDb();
  const ref = db.collection("accessCodes").doc(hash);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists) {
      throw new HttpError(401, "Code d’accès invalide.");
    }

    const data = snapshot.data() as Record<string, unknown>;

    if (data.revokedAt) {
      throw new HttpError(401, "Code d’accès révoqué.");
    }

    const usedByUid = typeof data.usedByUid === "string" ? data.usedByUid : null;

    if (usedByUid && usedByUid !== uid) {
      throw new HttpError(409, "Ce code est déjà associé à un autre compte.");
    }

    if (!usedByUid) {
      transaction.update(ref, {
        usedAt: Timestamp.now(),
        usedByUid: uid,
      });
    }
  });
}

export async function listAccessCodeRecords() {
  await syncLegacyAccessCodesToFirestore();

  const snapshot = await getFirebaseAdminDb()
    .collection("accessCodes")
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  return snapshot.docs
    .map((documentSnapshot) =>
      mapAccessCodeRecord(
        documentSnapshot.id,
        documentSnapshot.data() as Record<string, unknown>,
      ),
    )
    .filter((record): record is AccessCodeRecord => Boolean(record));
}

export async function createAccessCodes({
  count,
  createdByUid,
  note,
  source,
}: {
  count: number;
  createdByUid: string;
  note: string | null;
  source: "panel" | "script";
}) {
  const db = getFirebaseAdminDb();
  const createdCodes: Array<{
    code: string;
    fingerprint: string;
    hash: string;
    note: string | null;
  }> = [];

  while (createdCodes.length < count) {
    const code = generateAccessCodeValue();
    const hash = hashAccessCodeServer(code);
    const ref = db.collection("accessCodes").doc(hash);
    const snapshot = await ref.get();

    if (snapshot.exists) {
      continue;
    }

    await ref.create({
      createdAt: Timestamp.now(),
      createdByUid,
      fingerprint: hash.slice(0, 8).toUpperCase(),
      hash,
      note,
      revokedAt: null,
      revokedByUid: null,
      source,
      usedAt: null,
      usedByUid: null,
    });

    createdCodes.push({
      code,
      fingerprint: hash.slice(0, 8).toUpperCase(),
      hash,
      note,
    });
  }

  return createdCodes;
}

export async function setAccessCodeRevokedState(
  hash: string,
  revoked: boolean,
  actorUid: string,
) {
  const db = getFirebaseAdminDb();
  const ref = db.collection("accessCodes").doc(hash);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new HttpError(404, "Code d’accès introuvable.");
  }

  await ref.update({
    revokedAt: revoked ? Timestamp.now() : null,
    revokedByUid: revoked ? actorUid : null,
  });
}
