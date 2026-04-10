import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import { HttpError } from "@/lib/server/http";
import { deleteStoragePrefix } from "@/lib/server/storage";

async function deleteCollectionInBatches(collectionPath: string, batchSize = 200) {
  const db = getFirebaseAdminDb();

  while (true) {
    const snapshot = await db.collection(collectionPath).limit(batchSize).get();

    if (snapshot.empty) {
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((documentSnapshot) => {
      batch.delete(documentSnapshot.ref);
    });

    await batch.commit();

    if (snapshot.size < batchSize) {
      return;
    }
  }
}

async function deleteReportsForPostServer(postId: string) {
  const db = getFirebaseAdminDb();
  const reportsSnapshot = await db
    .collection("reports")
    .where("postId", "==", postId)
    .get();

  if (reportsSnapshot.empty) {
    return;
  }

  for (let index = 0; index < reportsSnapshot.docs.length; index += 400) {
    const batch = db.batch();

    reportsSnapshot.docs.slice(index, index + 400).forEach((reportSnapshot) => {
      batch.delete(reportSnapshot.ref);
    });

    await batch.commit();
  }
}

async function deleteReportsForCommentServer(postId: string, commentId: string) {
  const db = getFirebaseAdminDb();
  const reportsSnapshot = await db
    .collection("reports")
    .where("postId", "==", postId)
    .get();

  const matchingReports = reportsSnapshot.docs.filter((reportSnapshot) => {
    const commentIdValue = String(reportSnapshot.data()?.commentId ?? "");

    return commentIdValue === commentId;
  });

  if (!matchingReports.length) {
    return;
  }

  for (let index = 0; index < matchingReports.length; index += 400) {
    const batch = db.batch();

    matchingReports.slice(index, index + 400).forEach((reportSnapshot) => {
      batch.delete(reportSnapshot.ref);
    });

    await batch.commit();
  }
}

type DeleteForumContentOptions = {
  actorIsAdmin?: boolean;
};

export async function deleteForumPostServer(
  postId: string,
  actorUid: string,
  options: DeleteForumContentOptions = {},
) {
  const db = getFirebaseAdminDb();
  const postRef = db.collection("posts").doc(postId);
  const postSnapshot = await postRef.get();

  if (!postSnapshot.exists) {
    throw new HttpError(404, "Post introuvable.");
  }

  const authorUid = String(postSnapshot.data()?.author?.uid ?? "");

  if (authorUid !== actorUid && !options.actorIsAdmin) {
    throw new HttpError(403, "Suppression non autorisée.");
  }

  await deleteCollectionInBatches(`posts/${postId}/comments`);
  await deleteCollectionInBatches(`posts/${postId}/likes`);
  await deleteReportsForPostServer(postId);
  await deleteStoragePrefix(`posts/${authorUid}/${postId}/`);
  await postRef.delete();
}

export async function deleteForumCommentServer(
  postId: string,
  commentId: string,
  actorUid: string,
  options: DeleteForumContentOptions = {},
) {
  const db = getFirebaseAdminDb();
  const commentRef = db.collection("posts").doc(postId).collection("comments").doc(commentId);
  const commentSnapshot = await commentRef.get();

  if (!commentSnapshot.exists) {
    throw new HttpError(404, "Commentaire introuvable.");
  }

  const authorUid = String(commentSnapshot.data()?.author?.uid ?? "");

  if (authorUid !== actorUid && !options.actorIsAdmin) {
    throw new HttpError(403, "Suppression non autorisée.");
  }

  await deleteReportsForCommentServer(postId, commentId);
  await commentRef.delete();
}

export async function setForumPostPinnedStateServer(
  postId: string,
  isPinned: boolean,
) {
  const db = getFirebaseAdminDb();
  const postRef = db.collection("posts").doc(postId);
  const postSnapshot = await postRef.get();

  if (!postSnapshot.exists) {
    throw new HttpError(404, "Post introuvable.");
  }

  await postRef.update({
    isPinned,
    updatedAt: Timestamp.now(),
  });
}

export async function togglePostLikeServer(postId: string, userId: string) {
  const db = getFirebaseAdminDb();
  const postRef = db.collection("posts").doc(postId);
  const likeRef = postRef.collection("likes").doc(userId);

  await db.runTransaction(async (transaction) => {
    const [postSnapshot, likeSnapshot] = await Promise.all([
      transaction.get(postRef),
      transaction.get(likeRef),
    ]);

    if (!postSnapshot.exists) {
      throw new HttpError(404, "Post introuvable.");
    }

    if ((postSnapshot.data()?.realm ?? "public") === "certified") {
      const [adminSnapshot, profileSnapshot] = await Promise.all([
        transaction.get(db.collection("admins").doc(userId)),
        transaction.get(db.collection("users").doc(userId)),
      ]);

      if (
        !adminSnapshot.exists &&
        (!profileSnapshot.exists ||
          profileSnapshot.data()?.certificationStatus !== "approved")
      ) {
        throw new HttpError(403, "Accès refusé à ce post.");
      }
    }

    const likeCountValue = postSnapshot.data()?.likeCount;
    const currentLikeCount =
      typeof likeCountValue === "number" && Number.isFinite(likeCountValue)
        ? likeCountValue
        : 0;

    if (likeSnapshot.exists) {
      transaction.delete(likeRef);
      transaction.update(postRef, {
        likeCount: Math.max(0, currentLikeCount - 1),
      });
      return;
    }

    transaction.set(likeRef, {
      createdAt: Timestamp.now(),
      uid: userId,
    });
    transaction.update(postRef, {
      likeCount: currentLikeCount + 1,
    });
  });
}
