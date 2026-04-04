import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { LikeState } from "@/lib/types/forum";

export function subscribeToLikeState(
  postId: string,
  userId: string | null,
  onData: (state: LikeState) => void,
  onError: (error: unknown) => void,
) {
  return onSnapshot(collection(getFirebaseDb(), "posts", postId, "likes"), {
    next: (snapshot) => {
      onData({
        count: snapshot.size,
        likedByUser: userId ? snapshot.docs.some((doc) => doc.id === userId) : false,
      });
    },
    error: onError,
  });
}

export async function togglePostLike(postId: string, userId: string) {
  const likeReference = doc(getFirebaseDb(), "posts", postId, "likes", userId);
  const snapshot = await getDoc(likeReference);

  if (snapshot.exists()) {
    await deleteDoc(likeReference);
    return;
  }

  await setDoc(likeReference, {
    uid: userId,
    createdAt: serverTimestamp(),
  });
}
