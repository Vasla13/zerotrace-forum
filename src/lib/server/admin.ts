import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";
import { deleteForumPostServer } from "@/lib/server/forum-posts";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import { HttpError } from "@/lib/server/http";
import { requireAuthenticatedUid } from "@/lib/server/request-auth";
import { deleteStoragePrefix } from "@/lib/server/storage";
import { normalizeText } from "@/lib/utils/text";

type AdminUserRecord = {
  createdAt: Date | null;
  isAdmin: boolean;
  isBootstrapAdmin: boolean;
  postCount: number;
  uid: string;
  username: string;
  usernameLower: string;
};

function isFirestoreFailedPrecondition(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  return (
    "code" in error &&
    error.code === 9
  );
}

function toIndexProvisioningError() {
  return new HttpError(
    503,
    "Suppression temporairement indisponible. Les index Firestore sont en cours de création, réessaie dans quelques minutes.",
  );
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

function parseEnvList(value: string | undefined, mode: "raw" | "normalized") {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => (mode === "normalized" ? normalizeText(entry) : entry)),
  );
}

const bootstrapAdminUids = parseEnvList(
  process.env.FORUM_BOOTSTRAP_ADMIN_UIDS,
  "raw",
);
const bootstrapAdminUsernames = parseEnvList(
  process.env.FORUM_BOOTSTRAP_ADMIN_USERNAMES,
  "normalized",
);

async function getUserProfileRecord(uid: string) {
  const snapshot = await getFirebaseAdminDb().collection("users").doc(uid).get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data();

  return {
    createdAt: toDate(data?.createdAt),
    uid,
    username: String(data?.username ?? ""),
    usernameLower: String(data?.usernameLower ?? ""),
  };
}

export async function getUsernamesByUids(uids: string[]) {
  const uniqueUids = Array.from(new Set(uids.filter(Boolean)));

  if (!uniqueUids.length) {
    return new Map<string, string>();
  }

  const snapshots = await Promise.all(
    uniqueUids.map((uid) => getFirebaseAdminDb().collection("users").doc(uid).get()),
  );

  return new Map(
    snapshots
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => [
        snapshot.id,
        String(snapshot.data()?.username ?? snapshot.id),
      ]),
  );
}

function isBootstrapAdminUser(
  uid: string,
  usernameLower: string,
) {
  return (
    bootstrapAdminUids.has(uid) || bootstrapAdminUsernames.has(usernameLower)
  );
}

async function ensureBootstrapAdmin(uid: string) {
  const db = getFirebaseAdminDb();
  const adminRef = db.collection("admins").doc(uid);
  const existingAdmin = await adminRef.get();

  if (existingAdmin.exists) {
    return true;
  }

  const profile = await getUserProfileRecord(uid);

  if (!profile || !isBootstrapAdminUser(uid, profile.usernameLower)) {
    return false;
  }

  await adminRef.set({
    createdAt: Timestamp.now(),
    grantedByUid: null,
    source: "bootstrap",
    uid,
    username: profile.username,
    usernameLower: profile.usernameLower,
  });

  return true;
}

export async function isAdminUid(uid: string) {
  const adminSnapshot = await getFirebaseAdminDb().collection("admins").doc(uid).get();

  if (adminSnapshot.exists) {
    return true;
  }

  return ensureBootstrapAdmin(uid);
}

export async function requireAdminUid(request: NextRequest) {
  const uid = await requireAuthenticatedUid(request);

  if (!(await isAdminUid(uid))) {
    throw new HttpError(403, "Accès admin requis.");
  }

  return uid;
}

export async function getAdminSession(uid: string) {
  const profile = await getUserProfileRecord(uid);

  if (!profile) {
    throw new HttpError(404, "Profil introuvable.");
  }

  const isBootstrapAdmin = isBootstrapAdminUser(uid, profile.usernameLower);

  return {
    isAdmin: await isAdminUid(uid),
    isBootstrapAdmin,
    uid: profile.uid,
    username: profile.username,
  };
}

async function countPostsByUser(uid: string) {
  const snapshot = await getFirebaseAdminDb()
    .collection("posts")
    .where("author.uid", "==", uid)
    .count()
    .get();

  return snapshot.data().count;
}

export async function listAdminUsers(search = "") {
  const normalizedSearch = normalizeText(search);
  const db = getFirebaseAdminDb();
  const userSnapshots = await db
    .collection("users")
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();
  const adminSnapshots = await db.collection("admins").get();
  const explicitAdminUids = new Set(adminSnapshots.docs.map((doc) => doc.id));

  const filteredUsers = userSnapshots.docs.filter((snapshot) => {
    const usernameLower = String(snapshot.data()?.usernameLower ?? "");

    return !normalizedSearch || usernameLower.includes(normalizedSearch);
  });

  const users = await Promise.all(
    filteredUsers.map(async (snapshot) => {
      const data = snapshot.data();
      const username = String(data?.username ?? "");
      const usernameLower = String(data?.usernameLower ?? "");
      const isBootstrapAdmin = isBootstrapAdminUser(snapshot.id, usernameLower);

      return {
        createdAt: toDate(data?.createdAt),
        isAdmin: explicitAdminUids.has(snapshot.id) || isBootstrapAdmin,
        isBootstrapAdmin,
        postCount: await countPostsByUser(snapshot.id),
        uid: snapshot.id,
        username,
        usernameLower,
      } satisfies AdminUserRecord;
    }),
  );

  return users;
}

export async function setUserAdminRole(
  actorUid: string,
  targetUid: string,
  isAdmin: boolean,
) {
  if (actorUid === targetUid && !isAdmin) {
    throw new HttpError(400, "Tu ne peux pas retirer ton propre accès admin.");
  }

  const db = getFirebaseAdminDb();
  const targetProfile = await getUserProfileRecord(targetUid);

  if (!targetProfile) {
    throw new HttpError(404, "Utilisateur introuvable.");
  }

  if (!isAdmin && isBootstrapAdminUser(targetUid, targetProfile.usernameLower)) {
    throw new HttpError(
      400,
      "Cet admin vient de la configuration bootstrap. Retire-le des variables d’environnement.",
    );
  }

  const adminRef = db.collection("admins").doc(targetUid);

  if (isAdmin) {
    await adminRef.set(
      {
        createdAt: Timestamp.now(),
        grantedByUid: actorUid,
        source: "panel",
        uid: targetUid,
        username: targetProfile.username,
        usernameLower: targetProfile.usernameLower,
      },
      { merge: true },
    );

    return;
  }

  await adminRef.delete();
}

async function deleteDocumentSnapshots(
  snapshots: FirebaseFirestore.QueryDocumentSnapshot[],
) {
  if (!snapshots.length) {
    return;
  }

  const db = getFirebaseAdminDb();

  for (let index = 0; index < snapshots.length; index += 400) {
    const batch = db.batch();

    snapshots.slice(index, index + 400).forEach((documentSnapshot) => {
      batch.delete(documentSnapshot.ref);
    });

    await batch.commit();
  }
}

async function deleteReportsForDeletedUser(options: {
  commentIds: string[];
  postIds: string[];
  reportedByUid: string;
}) {
  const db = getFirebaseAdminDb();
  const reportsSnapshot = await db.collection("reports").get();

  if (reportsSnapshot.empty) {
    return;
  }

  const commentIds = new Set(options.commentIds);
  const postIds = new Set(options.postIds);
  const matchingReports = reportsSnapshot.docs.filter((reportSnapshot) => {
    const data = reportSnapshot.data();
    const commentId = String(data.commentId ?? "");
    const postId = String(data.postId ?? "");
    const reportedByUid = String(data.reportedByUid ?? "");

    return (
      reportedByUid === options.reportedByUid ||
      postIds.has(postId) ||
      (commentId ? commentIds.has(commentId) : false)
    );
  });

  await deleteDocumentSnapshots(matchingReports);
}

async function deleteUserLikes(uid: string) {
  const db = getFirebaseAdminDb();
  let likesSnapshot;

  try {
    likesSnapshot = await db
      .collectionGroup("likes")
      .where("uid", "==", uid)
      .get();
  } catch (error) {
    if (isFirestoreFailedPrecondition(error)) {
      throw toIndexProvisioningError();
    }

    throw error;
  }

  if (likesSnapshot.empty) {
    return;
  }

  const perPostDeletes = new Map<string, number>();
  for (let index = 0; index < likesSnapshot.docs.length; index += 400) {
    const batch = db.batch();

    likesSnapshot.docs.slice(index, index + 400).forEach((likeSnapshot) => {
      batch.delete(likeSnapshot.ref);
    });

    await batch.commit();
  }

  likesSnapshot.docs.forEach((likeSnapshot) => {
    const postRef = likeSnapshot.ref.parent.parent;

    if (!postRef) {
      return;
    }

    perPostDeletes.set(postRef.path, (perPostDeletes.get(postRef.path) ?? 0) + 1);
  });

  for (const [postPath, decrementBy] of perPostDeletes.entries()) {
    const postRef = db.doc(postPath);
    await postRef.update({
      likeCount: FieldValue.increment(-decrementBy),
    });

    const likesCountSnapshot = await postRef.collection("likes").count().get();
    await postRef.update({
      likeCount: likesCountSnapshot.data().count,
    });
  }
}

export async function deleteForumUserServer(
  actorUid: string,
  targetUid: string,
  options?: {
    allowSelf?: boolean;
  },
) {
  if (actorUid === targetUid && !options?.allowSelf) {
    throw new HttpError(400, "Tu ne peux pas supprimer ton propre compte.");
  }

  const db = getFirebaseAdminDb();
  const targetProfile = await getUserProfileRecord(targetUid);

  if (!targetProfile) {
    throw new HttpError(404, "Utilisateur introuvable.");
  }

  const [authoredPosts, authoredComments] = await Promise.all([
    db
      .collection("posts")
      .where("author.uid", "==", targetUid)
      .get(),
    db.collectionGroup("comments").where("author.uid", "==", targetUid).get(),
  ]);
  const authoredPostIds = authoredPosts.docs.map((postSnapshot) => postSnapshot.id);
  const authoredCommentIds = authoredComments.docs.map(
    (commentSnapshot) => commentSnapshot.id,
  );

  for (const postSnapshot of authoredPosts.docs) {
    await deleteForumPostServer(postSnapshot.id, targetUid);
  }

  await deleteDocumentSnapshots(authoredComments.docs);
  await deleteUserLikes(targetUid);
  await deleteReportsForDeletedUser({
    commentIds: authoredCommentIds,
    postIds: authoredPostIds,
    reportedByUid: targetUid,
  });

  const accessCodeSnapshots = await db
    .collection("accessCodes")
    .where("usedByUid", "==", targetUid)
    .get();

  if (!accessCodeSnapshots.empty) {
    const batch = db.batch();

    accessCodeSnapshots.docs.forEach((snapshot) => {
      batch.update(snapshot.ref, {
        usedAt: null,
        usedByUid: null,
      });
    });

    await batch.commit();
  }

  await db.collection("admins").doc(targetUid).delete().catch(() => undefined);
  await db.collection("usernames").doc(targetProfile.usernameLower).delete();
  await db.collection("users").doc(targetUid).delete();
  await deleteStoragePrefix(`users/${targetUid}/`);
  await deleteStoragePrefix(`posts/${targetUid}/`);
  await getFirebaseAdminAuth().deleteUser(targetUid).catch((error: unknown) => {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "auth/user-not-found"
    ) {
      return;
    }

    throw error;
  });
}
