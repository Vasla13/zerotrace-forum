import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type DocumentData,
  type DocumentSnapshot,
  type Transaction,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/client";
import type { ForumUserProfile } from "@/lib/types/forum";
import type { AccessAuthValues } from "@/lib/validation/auth";
import { accessAuthSchema } from "@/lib/validation/auth";
import {
  buildAccessCodeIdentity,
  isAccessCodeProvisioned,
} from "@/lib/utils/access-code";
import { generateNodeAlias } from "@/lib/utils/alias";
import { normalizeUsername } from "@/lib/utils/text";

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

function mapUserProfile(
  snapshot: DocumentSnapshot<DocumentData>,
): ForumUserProfile | null {
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  return {
    uid: String(data.uid),
    username: String(data.username),
    usernameLower: String(data.usernameLower),
    email: String(data.email),
    createdAt: toDate(data.createdAt),
  };
}

async function reserveUsername(
  transaction: Transaction,
  uid: string,
  requestedUsername: string,
) {
  const username = requestedUsername.trim();
  const usernameLower = normalizeUsername(username);
  const usernameRef = doc(getFirebaseDb(), "usernames", usernameLower);
  const usernameSnapshot = await transaction.get(usernameRef);

  if (usernameSnapshot.exists()) {
    throw new Error("Ce pseudo est déjà utilisé.");
  }

  transaction.set(usernameRef, {
    uid,
    username,
    usernameLower,
    createdAt: serverTimestamp(),
  });

  return {
    username,
    usernameLower,
  };
}

function isSignInFallbackError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "auth/user-not-found" ||
      error.code === "auth/invalid-credential" ||
      error.code === "auth/email-already-in-use")
  );
}

async function createProfileForAccessCode(
  uid: string,
  email: string,
  requestedUsername: string,
) {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  const usernameCandidates = requestedUsername
    ? [requestedUsername]
    : Array.from(
        { length: 12 },
        (_, index) => generateNodeAlias(`${uid}:${email}:${index}`),
      );

  const username = await runTransaction(db, async (transaction) => {
    const userRef = doc(db, "users", uid);
    const userSnapshot = await transaction.get(userRef);

    if (userSnapshot.exists()) {
      return {
        username: String(userSnapshot.data().username),
        usernameLower: String(userSnapshot.data().usernameLower),
      };
    }

    for (const candidate of usernameCandidates) {
      try {
        const reserved = await reserveUsername(transaction, uid, candidate);

        transaction.set(userRef, {
          uid,
          username: reserved.username,
          usernameLower: reserved.usernameLower,
          email,
          createdAt: serverTimestamp(),
        });

        return reserved;
      } catch (error) {
        if (requestedUsername) {
          throw error;
        }
      }
    }

    throw new Error("Impossible de provisionner un pseudo disponible.");
  });

  if (auth.currentUser) {
    await updateProfile(auth.currentUser, {
      displayName: username.username,
    }).catch(() => undefined);
  }

  return username.username;
}

export async function authenticateWithAccessCode(values: AccessAuthValues) {
  const parsed = accessAuthSchema.parse(values);
  const identity = await buildAccessCodeIdentity(parsed.accessCode);

  if (!isAccessCodeProvisioned(identity.hash)) {
    throw new Error("Code d’accès invalide, révoqué ou non provisionné.");
  }

  const auth = getFirebaseAuth();

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      identity.email,
      identity.password,
    );

    return {
      created: false,
      username: credential.user.displayName || null,
    };
  } catch (error) {
    if (!isSignInFallbackError(error)) {
      throw error;
    }
  }

  const credential = await createUserWithEmailAndPassword(
    auth,
    identity.email,
    identity.password,
  ).catch(async (error) => {
    if (!isSignInFallbackError(error)) {
      throw error;
    }

    return signInWithEmailAndPassword(auth, identity.email, identity.password);
  });

  if (!credential.user) {
    throw new Error("Impossible d’ouvrir la session réseau.");
  }

  try {
    const username = await createProfileForAccessCode(
      credential.user.uid,
      identity.email,
      parsed.username,
    );

    return {
      created: true,
      username,
    };
  } catch (error) {
    const profileSnapshot = await getDoc(doc(getFirebaseDb(), "users", credential.user.uid));

    if (profileSnapshot.exists()) {
      return {
        created: false,
        username: String(profileSnapshot.data().username),
      };
    }

    await credential.user.delete().catch(() => undefined);
    throw error;
  }
}

export async function signOutForumUser() {
  await signOut(getFirebaseAuth());
}

export function subscribeToUserProfile(
  uid: string,
  onData: (profile: ForumUserProfile | null) => void,
  onError: (error: unknown) => void,
) {
  return onSnapshot(doc(getFirebaseDb(), "users", uid), {
    next: (snapshot) => {
      onData(mapUserProfile(snapshot));
    },
    error: onError,
  });
}

export async function getUserProfileByUsername(username: string) {
  const db = getFirebaseDb();
  const usernameSnapshot = await getDoc(
    doc(db, "usernames", normalizeUsername(username)),
  );

  if (!usernameSnapshot.exists()) {
    return null;
  }

  const userProfileSnapshot = await getDoc(
    doc(db, "users", String(usernameSnapshot.data().uid)),
  );

  return mapUserProfile(userProfileSnapshot);
}

export async function getUserPostCount(uid: string) {
  const postsCount = await getCountFromServer(
    query(collection(getFirebaseDb(), "posts"), where("author.uid", "==", uid)),
  );

  return postsCount.data().count;
}
