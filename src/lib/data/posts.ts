import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  serverTimestamp,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { FeedPage, ForumPost, ForumUserProfile } from "@/lib/types/forum";
import { postSchema, type PostFormValues } from "@/lib/validation/forum";
import { buildSearchKeywords, normalizeText } from "@/lib/utils/text";

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

function mapPostSnapshot(
  snapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>,
) {
  if (!snapshot.exists()) {
    return null;
  }

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
    searchKeywords: Array.isArray(data.searchKeywords)
      ? data.searchKeywords.map(String)
      : [],
    title: String(data.title),
    updatedAt: toDate(data.updatedAt),
  } satisfies ForumPost;
}

function sortPostsByNewest(firstPost: ForumPost, secondPost: ForumPost) {
  return (
    (secondPost.createdAt?.getTime() ?? 0) - (firstPost.createdAt?.getTime() ?? 0)
  );
}

function matchesSearch(post: ForumPost, search: string) {
  const normalizedQuery = normalizeText(search);
  const normalizedContent = normalizeText(`${post.title} ${post.content}`);

  return normalizedQuery
    .split(/\s+/)
    .every((term) => normalizedContent.includes(term));
}

async function deleteSubcollection(
  postId: string,
  subcollectionName: "comments" | "likes",
) {
  const db = getFirebaseDb();

  while (true) {
    const snapshot = await getDocs(
      query(collection(db, "posts", postId, subcollectionName), limit(200)),
    );

    if (snapshot.empty) {
      return;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach((documentSnapshot) => {
      batch.delete(documentSnapshot.ref);
    });
    await batch.commit();

    if (snapshot.size < 200) {
      return;
    }
  }
}

export async function fetchFeedPage({
  cursor = null,
  pageSize = 8,
  search = "",
}: {
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
  pageSize?: number;
  search?: string;
}): Promise<FeedPage> {
  const db = getFirebaseDb();
  const postsReference = collection(db, "posts");
  const normalizedSearch = normalizeText(search);

  if (normalizedSearch) {
    const searchTokens = buildSearchKeywords(normalizedSearch).slice(0, 10);

    if (!searchTokens.length) {
      return {
        hasMore: false,
        nextCursor: null,
        posts: [],
      };
    }

    const searchSnapshot = await getDocs(
      query(
        postsReference,
        where("searchKeywords", "array-contains-any", searchTokens),
        limit(pageSize * 4),
      ),
    );

    const posts = searchSnapshot.docs
      .map(mapPostSnapshot)
      .filter((post): post is ForumPost => Boolean(post))
      .filter((post) => matchesSearch(post, normalizedSearch))
      .sort(sortPostsByNewest);

    return {
      hasMore: false,
      nextCursor: null,
      posts,
    };
  }

  const feedQuery = cursor
    ? query(
        postsReference,
        orderBy("createdAt", "desc"),
        startAfter(cursor),
        limit(pageSize),
      )
    : query(postsReference, orderBy("createdAt", "desc"), limit(pageSize));

  const snapshot = await getDocs(feedQuery);

  return {
    hasMore: snapshot.size === pageSize,
    nextCursor: snapshot.docs.at(-1) ?? null,
    posts: snapshot.docs
      .map(mapPostSnapshot)
      .filter((post): post is ForumPost => Boolean(post)),
  };
}

export async function fetchPostsByUser(uid: string, pageSize = 12) {
  const snapshot = await getDocs(
    query(
      collection(getFirebaseDb(), "posts"),
      where("author.uid", "==", uid),
      orderBy("createdAt", "desc"),
      limit(pageSize),
    ),
  );

  return snapshot.docs
    .map(mapPostSnapshot)
    .filter((post): post is ForumPost => Boolean(post));
}

export function subscribeToPost(
  postId: string,
  onData: (post: ForumPost | null) => void,
  onError: (error: unknown) => void,
) {
  return onSnapshot(doc(getFirebaseDb(), "posts", postId), {
    next: (snapshot) => {
      onData(mapPostSnapshot(snapshot));
    },
    error: onError,
  });
}

export async function createForumPost(
  values: PostFormValues,
  profile: ForumUserProfile,
) {
  const parsed = postSchema.parse(values);
  const postReference = await addDoc(collection(getFirebaseDb(), "posts"), {
    author: {
      uid: profile.uid,
      username: profile.username,
      usernameLower: profile.usernameLower,
    },
    content: parsed.content,
    createdAt: serverTimestamp(),
    searchKeywords: buildSearchKeywords(parsed.title, parsed.content),
    title: parsed.title,
    updatedAt: serverTimestamp(),
  });

  return postReference.id;
}

export async function updateForumPost(
  postId: string,
  userId: string,
  values: PostFormValues,
) {
  const parsed = postSchema.parse(values);
  const postReference = doc(getFirebaseDb(), "posts", postId);
  const snapshot = await getDoc(postReference);
  const existingPost = mapPostSnapshot(snapshot);

  if (!existingPost || existingPost.author.uid !== userId) {
    throw new Error("Tu ne peux modifier que tes propres posts.");
  }

  await updateDoc(postReference, {
    content: parsed.content,
    searchKeywords: buildSearchKeywords(parsed.title, parsed.content),
    title: parsed.title,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteForumPost(postId: string, userId: string) {
  const db = getFirebaseDb();
  const postReference = doc(db, "posts", postId);
  const snapshot = await getDoc(postReference);
  const existingPost = mapPostSnapshot(snapshot);

  if (!existingPost || existingPost.author.uid !== userId) {
    throw new Error("Tu ne peux supprimer que tes propres posts.");
  }

  await deleteSubcollection(postId, "comments");
  await deleteSubcollection(postId, "likes");
  await deleteDoc(postReference);
}
