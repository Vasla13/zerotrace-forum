import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { CommentFormValues } from "@/lib/validation/forum";
import { commentSchema } from "@/lib/validation/forum";
import type { ForumComment, ForumUserProfile } from "@/lib/types/forum";

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

function mapCommentSnapshot(
  snapshot: QueryDocumentSnapshot<DocumentData>,
  postId: string,
) {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    author: {
      uid: String(data.author.uid),
      username: String(data.author.username),
      usernameLower: String(data.author.usernameLower),
    },
    content: String(data.content),
    createdAt: toDate(data.createdAt),
    postId,
    updatedAt: toDate(data.updatedAt),
  } satisfies ForumComment;
}

export function subscribeToComments(
  postId: string,
  onData: (comments: ForumComment[]) => void,
  onError: (error: unknown) => void,
) {
  return onSnapshot(
    query(
      collection(getFirebaseDb(), "posts", postId, "comments"),
      orderBy("createdAt", "asc"),
    ),
    {
      next: (snapshot) => {
        onData(snapshot.docs.map((comment) => mapCommentSnapshot(comment, postId)));
      },
      error: onError,
    },
  );
}

export async function createPostComment(
  postId: string,
  values: CommentFormValues,
  profile: ForumUserProfile,
) {
  const parsed = commentSchema.parse(values);

  await addDoc(collection(getFirebaseDb(), "posts", postId, "comments"), {
    author: {
      uid: profile.uid,
      username: profile.username,
      usernameLower: profile.usernameLower,
    },
    content: parsed.content,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updatePostComment(
  postId: string,
  commentId: string,
  _userId: string,
  values: CommentFormValues,
) {
  void _userId;
  const parsed = commentSchema.parse(values);
  await updateDoc(doc(getFirebaseDb(), "posts", postId, "comments", commentId), {
    content: parsed.content,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePostComment(
  postId: string,
  commentId: string,
  _userId: string,
) {
  void _userId;
  await deleteDoc(doc(getFirebaseDb(), "posts", postId, "comments", commentId));
}
