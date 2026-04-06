import type { User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { getResponseErrorMessage } from "@/lib/utils/errors";

export function subscribeToOwnLike(
  postId: string,
  userId: string | null,
  onData: (likedByUser: boolean) => void,
  onError: (error: unknown) => void,
) {
  if (!userId) {
    onData(false);
    return () => undefined;
  }

  return onSnapshot(doc(getFirebaseDb(), "posts", postId, "likes", userId), {
    next: (snapshot) => {
      onData(snapshot.exists());
    },
    error: onError,
  });
}

export async function togglePostLike(postId: string, user: User) {
  const response = await fetch(`/api/posts/${postId}/likes`, {
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response));
  }
}
