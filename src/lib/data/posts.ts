import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  startAfter,
  updateDoc,
  where,
  serverTimestamp,
  type CollectionReference,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/client";
import type {
  FeedPage,
  ForumPost,
  ForumPostMedia,
  ForumUserProfile,
} from "@/lib/types/forum";
import { getResponseErrorMessage } from "@/lib/utils/errors";
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
      avatarUrl:
        typeof data.author.avatarUrl === "string" && data.author.avatarUrl.trim()
          ? data.author.avatarUrl
          : null,
      uid: String(data.author.uid),
      username: String(data.author.username),
      usernameLower: String(data.author.usernameLower),
    },
    content: String(data.content),
    createdAt: toDate(data.createdAt),
    likeCount:
      typeof data.likeCount === "number" && Number.isFinite(data.likeCount)
        ? data.likeCount
        : 0,
    media: Array.isArray(data.media)
      ? data.media
          .map((item) => {
            if (!item || typeof item !== "object") {
              return null;
            }

            const type = String(item.type ?? "");
            const url = String(item.url ?? "");
            const storagePath = String(item.storagePath ?? "");

            if (
              (type !== "image" && type !== "video") ||
              !url.trim() ||
              !storagePath.trim()
            ) {
              return null;
            }

            return {
              storagePath,
              type,
              url,
            } satisfies ForumPostMedia;
          })
          .filter((item): item is ForumPostMedia => Boolean(item))
      : [],
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

async function fetchSearchBatch(
  postsReference: CollectionReference<DocumentData>,
  cursor: QueryDocumentSnapshot<DocumentData> | null,
) {
  return getDocs(
    cursor
      ? query(
          postsReference,
          orderBy("createdAt", "desc"),
          startAfter(cursor),
          limit(50),
        )
      : query(postsReference, orderBy("createdAt", "desc"), limit(50)),
  );
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
    const posts: ForumPost[] = [];
    let scanCursor: QueryDocumentSnapshot<DocumentData> | null = null;

    while (true) {
      const searchSnapshot = await fetchSearchBatch(postsReference, scanCursor);

      searchSnapshot.docs
        .map(mapPostSnapshot)
        .filter((post): post is ForumPost => Boolean(post))
        .filter((post) => matchesSearch(post, normalizedSearch))
        .forEach((post) => {
          posts.push(post);
        });

      if (searchSnapshot.size < 50) {
        break;
      }

      scanCursor = searchSnapshot.docs.at(-1) ?? null;
    }

    return {
      hasMore: false,
      nextCursor: null,
      posts: posts.sort(sortPostsByNewest),
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
  postId: string,
  values: PostFormValues,
  media: ForumPostMedia[],
  profile: ForumUserProfile,
) {
  const parsed = postSchema.parse({
    ...values,
    media,
  });
  const postReference = doc(getFirebaseDb(), "posts", postId);
  await setDoc(postReference, {
    author: {
      avatarUrl: profile.avatarUrl,
      uid: profile.uid,
      username: profile.username,
      usernameLower: profile.usernameLower,
    },
    content: parsed.content,
    createdAt: serverTimestamp(),
    likeCount: 0,
    media: parsed.media,
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
  media: ForumPostMedia[],
) {
  const parsed = postSchema.parse({
    ...values,
    media,
  });
  const postReference = doc(getFirebaseDb(), "posts", postId);
  const snapshot = await getDoc(postReference);
  const existingPost = mapPostSnapshot(snapshot);

  if (!existingPost || existingPost.author.uid !== userId) {
    throw new Error("Tu ne peux modifier que tes propres posts.");
  }

  await updateDoc(postReference, {
    content: parsed.content,
    media: parsed.media,
    searchKeywords: buildSearchKeywords(parsed.title, parsed.content),
    title: parsed.title,
    updatedAt: serverTimestamp(),
  });
}

export function createDraftPostId() {
  return doc(collection(getFirebaseDb(), "posts")).id;
}

export async function deleteForumPost(postId: string, userId: string) {
  const currentUser = getFirebaseAuth().currentUser;

  if (!currentUser || currentUser.uid !== userId) {
    throw new Error("Session invalide.");
  }

  const response = await fetch(`/api/posts/${postId}`, {
    headers: {
      Authorization: `Bearer ${await currentUser.getIdToken()}`,
    },
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response));
  }
}
