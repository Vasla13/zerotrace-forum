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

export async function deleteForumPostServer(postId: string, userId: string) {
  const db = getFirebaseAdminDb();
  const postRef = db.collection("posts").doc(postId);
  const postSnapshot = await postRef.get();

  if (!postSnapshot.exists) {
    throw new HttpError(404, "Post introuvable.");
  }

  const authorUid = String(postSnapshot.data()?.author?.uid ?? "");

  if (authorUid !== userId) {
    throw new HttpError(403, "Suppression non autorisée.");
  }

  await deleteCollectionInBatches(`posts/${postId}/comments`);
  await deleteCollectionInBatches(`posts/${postId}/likes`);
  await deleteStoragePrefix(`posts/${authorUid}/${postId}/`);
  await postRef.delete();
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
