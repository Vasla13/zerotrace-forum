import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  assertProvisionedAccessCode,
  buildAccessCodeEmail,
  createSecurePassword,
  markAccessCodeUsed,
} from "@/lib/server/access-code";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import { HttpError } from "@/lib/server/http";
import { generateAliasBundle, generateNodeAlias } from "@/lib/utils/alias";
import { normalizeUsername } from "@/lib/utils/text";
import { accessAuthSchema, type AccessAuthValues } from "@/lib/validation/auth";

function buildUsernameCandidates({ accessCode, username }: AccessAuthValues) {
  if (username) {
    return [username.trim()];
  }

  return Array.from({ length: 12 }, (_, index) =>
    generateNodeAlias(`${accessCode}:${index}`),
  );
}

async function findAuthUidByAccessCode(accessCode: string) {
  const auth = getFirebaseAdminAuth();
  const email = buildAccessCodeEmail(accessCode);

  try {
    const userRecord = await auth.getUserByEmail(email);
    return userRecord.uid;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "auth/user-not-found"
    ) {
      return null;
    }

    throw error;
  }
}

async function getOrCreateAuthUid(accessCode: string) {
  const auth = getFirebaseAdminAuth();
  const email = buildAccessCodeEmail(accessCode);

  try {
    const userRecord = await auth.getUserByEmail(email);

    await auth
      .updateUser(userRecord.uid, {
        password: createSecurePassword(),
      })
      .catch(() => undefined);

    return userRecord.uid;
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

  const createdUser = await auth.createUser({
    email,
    password: createSecurePassword(),
  });

  return createdUser.uid;
}

async function getExistingProfile(uid: string) {
  const db = getFirebaseAdminDb();

  return db.runTransaction(async (transaction) => {
    const userRef = db.collection("users").doc(uid);
    const userSnapshot = await transaction.get(userRef);

    if (!userSnapshot.exists) {
      return null;
    }

    const data = userSnapshot.data();
    const createdAt = Timestamp.now();
    const username = String(data?.username ?? "").trim();
    const usernameLower = String(
      data?.usernameLower ?? normalizeUsername(username),
    );

    if (!username || !usernameLower) {
      throw new HttpError(409, "Profil incomplet. Contacte un administrateur.");
    }

    const usernameRef = db.collection("usernames").doc(usernameLower);
    const usernameSnapshot = await transaction.get(usernameRef);

    if (!usernameSnapshot.exists) {
      transaction.set(usernameRef, {
        createdAt: data?.createdAt ?? createdAt,
        uid,
        username,
        usernameLower,
      });
    }

    if (data?.email) {
      transaction.update(userRef, {
        email: FieldValue.delete(),
      });
    }

    return {
      created: false,
      avatarUrl:
        typeof data?.avatarUrl === "string" && data.avatarUrl.trim()
          ? data.avatarUrl
          : null,
      username,
    };
  });
}

async function ensureUserProfile(uid: string, values: AccessAuthValues) {
  const db = getFirebaseAdminDb();
  const usernameCandidates = buildUsernameCandidates(values);

  return db.runTransaction(async (transaction) => {
    const createdAt = Timestamp.now();
    const userRef = db.collection("users").doc(uid);
    const existingProfile = await transaction.get(userRef);

    if (existingProfile.exists) {
      const data = existingProfile.data();

      return {
        created: false,
        avatarUrl:
          typeof data?.avatarUrl === "string" && data.avatarUrl.trim()
            ? data.avatarUrl
            : null,
        username: String(data?.username ?? ""),
      };
    }

    for (const candidate of usernameCandidates) {
      const username = candidate.trim();
      const usernameLower = normalizeUsername(username);

      if (!usernameLower) {
        continue;
      }

      const usernameRef = db.collection("usernames").doc(usernameLower);
      const usernameSnapshot = await transaction.get(usernameRef);

      if (usernameSnapshot.exists) {
        const reservedUid = String(usernameSnapshot.data()?.uid ?? "");

        if (reservedUid === uid) {
          transaction.set(userRef, {
            avatarUrl: null,
            createdAt: usernameSnapshot.data()?.createdAt ?? createdAt,
            uid,
            username,
            usernameLower,
          });

          return {
            created: true,
            avatarUrl: null,
            username,
          };
        }

        if (values.username) {
          throw new HttpError(409, "Ce pseudo est déjà utilisé.");
        }

        continue;
      }

      transaction.create(usernameRef, {
        createdAt,
        uid,
        username,
        usernameLower,
      });
      transaction.create(userRef, {
        avatarUrl: null,
        createdAt,
        uid,
        username,
        usernameLower,
      });

      return {
        created: true,
        avatarUrl: null,
        username,
      };
    }

    throw new HttpError(409, "Impossible de provisionner un pseudo disponible.");
  });
}

export async function authenticateWithAccessCodeServer(payload: unknown) {
  const values = accessAuthSchema.parse(payload);
  const accessCodeRecord = await assertProvisionedAccessCode(values.accessCode);
  const existingUid = await findAuthUidByAccessCode(values.accessCode);

  if (existingUid) {
    const existingProfile = await getExistingProfile(existingUid);

    if (existingProfile) {
      await markAccessCodeUsed(accessCodeRecord.hash, existingUid);

      const auth = getFirebaseAdminAuth();
      await auth
        .updateUser(existingUid, {
          displayName: existingProfile.username,
          photoURL: existingProfile.avatarUrl,
        })
        .catch(() => undefined);

      return {
        created: false,
        kind: "authenticated" as const,
        token: await auth.createCustomToken(existingUid),
        username: existingProfile.username,
      };
    }
  }

  if (!values.username) {
    return {
      kind: "needs-username" as const,
      suggestions: generateAliasBundle(values.accessCode, 6),
    };
  }

  const uid = existingUid ?? (await getOrCreateAuthUid(values.accessCode));
  await markAccessCodeUsed(accessCodeRecord.hash, uid);
  const profile = await ensureUserProfile(uid, values);
  const auth = getFirebaseAdminAuth();

  await auth
    .updateUser(uid, {
      displayName: profile.username,
      photoURL: profile.avatarUrl,
    })
    .catch(() => undefined);

  return {
    created: profile.created,
    kind: "authenticated" as const,
    token: await auth.createCustomToken(uid),
    username: profile.username,
  };
}
