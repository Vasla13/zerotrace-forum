import { signInWithCustomToken, signOut, type User } from "firebase/auth";
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type DocumentSnapshot,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb, prepareFirebaseAuth } from "@/lib/firebase/client";
import type { ForumUserProfile } from "@/lib/types/forum";
import type { AccessAuthValues } from "@/lib/validation/auth";
import { accessAuthSchema } from "@/lib/validation/auth";
import { getResponseErrorMessage } from "@/lib/utils/errors";
import { normalizeUsername } from "@/lib/utils/text";
import type { ProfileUsernameValues } from "@/lib/validation/profile";

async function buildAuthorizedHeaders(user: User) {
  return {
    Authorization: `Bearer ${await user.getIdToken()}`,
    "Content-Type": "application/json",
  };
}

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
    createdAt: toDate(data.createdAt),
  };
}

export async function authenticateWithAccessCode(values: AccessAuthValues) {
  const parsed = accessAuthSchema.parse(values);
  const response = await fetch("/api/auth/access", {
    body: JSON.stringify(parsed),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response));
  }

  const payload = (await response.json()) as {
    created: boolean;
    token: string;
    username: string;
  };

  await prepareFirebaseAuth();
  await signInWithCustomToken(getFirebaseAuth(), payload.token);

  return {
    created: payload.created,
    username: payload.username,
  };
}

export async function signOutForumUser() {
  await signOut(getFirebaseAuth());
}

export async function renameForumUser(
  user: User,
  values: ProfileUsernameValues,
) {
  const response = await fetch("/api/profile", {
    body: JSON.stringify(values),
    headers: await buildAuthorizedHeaders(user),
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response));
  }

  return (await response.json()) as {
    username: string;
    usernameLower: string;
  };
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
