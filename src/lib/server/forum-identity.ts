import "server-only";

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { Timestamp } from "firebase-admin/firestore";
import { hashAccessCodeServer } from "@/lib/server/access-code";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import { HttpError } from "@/lib/server/http";
import type {
  IdentityAuthValues,
  IdentityCreateValues,
  IdentityResumeValues,
} from "@/lib/validation/identity";
import { identityAuthSchema } from "@/lib/validation/identity";
import { normalizeUsername } from "@/lib/utils/text";

const scrypt = promisify(scryptCallback);

type IdentityCredentialRecord = {
  passwordHash: string;
  passwordSalt: string;
};

type IdentityProfileRecord = {
  avatarUrl: string | null;
  uid: string;
  username: string;
  usernameLower: string;
};

async function derivePasswordHash(password: string, salt: string) {
  return (await scrypt(password, salt, 64)) as Buffer;
}

async function createCredentialRecord(password: string) {
  const passwordSalt = randomBytes(16).toString("hex");
  const passwordHash = (await derivePasswordHash(password, passwordSalt)).toString(
    "hex",
  );

  return {
    passwordHash,
    passwordSalt,
  } satisfies IdentityCredentialRecord;
}

async function verifyCredentialRecord(
  password: string,
  credential: IdentityCredentialRecord,
) {
  const currentHash = Buffer.from(credential.passwordHash, "hex");
  const submittedHash = await derivePasswordHash(password, credential.passwordSalt);

  return (
    currentHash.length === submittedHash.length &&
    timingSafeEqual(currentHash, submittedHash)
  );
}

function mapIdentityProfile(
  uid: string,
  data: Record<string, unknown> | undefined,
): IdentityProfileRecord | null {
  if (!data) {
    return null;
  }

  const username = String(data.username ?? "").trim();
  const usernameLower = String(data.usernameLower ?? normalizeUsername(username));

  if (!username || !usernameLower) {
    return null;
  }

  return {
    avatarUrl:
      typeof data.avatarUrl === "string" && data.avatarUrl.trim()
        ? data.avatarUrl
        : null,
    uid,
    username,
    usernameLower,
  };
}

async function ensureAuthUser(
  profile: IdentityProfileRecord,
) {
  const auth = getFirebaseAdminAuth();

  try {
    await auth.updateUser(profile.uid, {
      displayName: profile.username,
      photoURL: profile.avatarUrl,
    });
    return;
  } catch (error) {
    if (
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== "auth/user-not-found"
    ) {
      throw error;
    }
  }

  await auth.createUser({
    displayName: profile.username,
    photoURL: profile.avatarUrl,
    uid: profile.uid,
  });
}

async function authenticateIdentityProfile(
  profile: IdentityProfileRecord,
) {
  await ensureAuthUser(profile);

  return {
    created: false,
    kind: "authenticated" as const,
    token: await getFirebaseAdminAuth().createCustomToken(profile.uid),
    username: profile.username,
  };
}

async function getIdentityProfileByUsername(username: string) {
  const db = getFirebaseAdminDb();
  const usernameLower = normalizeUsername(username);
  const usernameSnapshot = await db.collection("usernames").doc(usernameLower).get();

  if (!usernameSnapshot.exists) {
    return null;
  }

  const uid = String(usernameSnapshot.data()?.uid ?? "");

  if (!uid) {
    return null;
  }

  const userSnapshot = await db.collection("users").doc(uid).get();

  if (!userSnapshot.exists) {
    return null;
  }

  return mapIdentityProfile(uid, userSnapshot.data() as Record<string, unknown>);
}

async function createIdentityServer(values: IdentityCreateValues) {
  const db = getFirebaseAdminDb();
  const username = values.username.trim();
  const usernameLower = normalizeUsername(username);
  const uid = db.collection("users").doc().id;
  const createdAt = Timestamp.now();
  const credential = await createCredentialRecord(values.password);
  const usernameRef = db.collection("usernames").doc(usernameLower);
  const userRef = db.collection("users").doc(uid);
  const credentialRef = db.collection("credentials").doc(uid);

  await db.runTransaction(async (transaction) => {
    const usernameSnapshot = await transaction.get(usernameRef);

    if (usernameSnapshot.exists) {
      throw new HttpError(409, "Ce pseudo est déjà utilisé.");
    }

    transaction.create(usernameRef, {
      createdAt,
      uid,
      username,
      usernameLower,
    });
    transaction.create(userRef, {
      avatarUrl: null,
      certificationRequestedAt: null,
      certificationStatus: "none",
      certifiedAt: null,
      createdAt,
      uid,
      username,
      usernameLower,
    });
    transaction.create(credentialRef, {
      ...credential,
      createdAt,
      source: "identity",
      updatedAt: createdAt,
    });
  });

  const profile = {
    avatarUrl: null,
    uid,
    username,
    usernameLower,
  } satisfies IdentityProfileRecord;

  try {
    await ensureAuthUser(profile);
  } catch (error) {
    await Promise.allSettled([
      usernameRef.delete(),
      userRef.delete(),
      credentialRef.delete(),
    ]);
    throw error;
  }

  return {
    created: true,
    kind: "authenticated" as const,
    token: await getFirebaseAdminAuth().createCustomToken(uid),
    username,
  };
}

async function migrateLegacyAccessCodeIdentity(
  profile: IdentityProfileRecord,
  password: string,
) {
  const db = getFirebaseAdminDb();
  const accessCodeSnapshot = await db
    .collection("accessCodes")
    .doc(hashAccessCodeServer(password))
    .get();

  if (!accessCodeSnapshot.exists) {
    return false;
  }

  const data = accessCodeSnapshot.data() as Record<string, unknown>;
  const usedByUid = String(data.usedByUid ?? "");

  if (
    usedByUid !== profile.uid ||
    data.revokedAt
  ) {
    return false;
  }

  const createdAt = Timestamp.now();
  const credential = await createCredentialRecord(password);

  await db.collection("credentials").doc(profile.uid).set({
    ...credential,
    createdAt,
    migratedFrom: "access-code",
    source: "identity",
    updatedAt: createdAt,
  });

  return true;
}

async function resumeIdentityServer(values: IdentityResumeValues) {
  const profile = await getIdentityProfileByUsername(values.username);

  if (!profile) {
    throw new HttpError(401, "Identité introuvable ou mot de passe invalide.");
  }

  const db = getFirebaseAdminDb();
  const credentialSnapshot = await db.collection("credentials").doc(profile.uid).get();

  if (credentialSnapshot.exists) {
    const data = credentialSnapshot.data() as Record<string, unknown>;
    const credential = {
      passwordHash: String(data.passwordHash ?? ""),
      passwordSalt: String(data.passwordSalt ?? ""),
    } satisfies IdentityCredentialRecord;

    if (!credential.passwordHash || !credential.passwordSalt) {
      throw new HttpError(409, "Identité corrompue. Contacte un administrateur.");
    }

    const passwordMatches = await verifyCredentialRecord(values.password, credential);

    if (!passwordMatches) {
      throw new HttpError(401, "Identité introuvable ou mot de passe invalide.");
    }

    return authenticateIdentityProfile(profile);
  }

  const migrated = await migrateLegacyAccessCodeIdentity(profile, values.password);

  if (!migrated) {
    throw new HttpError(401, "Identité introuvable ou mot de passe invalide.");
  }

  return authenticateIdentityProfile(profile);
}

export async function authenticateIdentityServer(payload: unknown) {
  const values = identityAuthSchema.parse(payload) as IdentityAuthValues;

  if (values.mode === "create") {
    return createIdentityServer(values);
  }

  return resumeIdentityServer(values);
}
