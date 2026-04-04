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
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/client";
import type { ForumUserProfile } from "@/lib/types/forum";
import type { LoginFormValues, RegisterFormValues } from "@/lib/validation/auth";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
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

export async function registerForumUser(values: RegisterFormValues) {
  const parsed = registerSchema.parse(values);
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  const username = parsed.username.trim();
  const usernameLower = normalizeUsername(username);
  const email = parsed.email.trim().toLowerCase();

  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    parsed.password,
  );

  try {
    await runTransaction(db, async (transaction) => {
      const userRef = doc(db, "users", credential.user.uid);
      const usernameRef = doc(db, "usernames", usernameLower);

      const userSnapshot = await transaction.get(userRef);
      const usernameSnapshot = await transaction.get(usernameRef);

      if (userSnapshot.exists()) {
        throw new Error("Ce compte existe déjà.");
      }

      if (usernameSnapshot.exists()) {
        throw new Error("Ce pseudo est déjà utilisé.");
      }

      transaction.set(userRef, {
        uid: credential.user.uid,
        username,
        usernameLower,
        email,
        createdAt: serverTimestamp(),
      });

      transaction.set(usernameRef, {
        uid: credential.user.uid,
        username,
        usernameLower,
        createdAt: serverTimestamp(),
      });
    });

    await updateProfile(credential.user, {
      displayName: username,
    });
  } catch (error) {
    await credential.user.delete().catch(() => undefined);
    throw error;
  }
}

export async function signInForumUser(values: LoginFormValues) {
  const parsed = loginSchema.parse(values);
  return signInWithEmailAndPassword(
    getFirebaseAuth(),
    parsed.email.trim().toLowerCase(),
    parsed.password,
  );
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
