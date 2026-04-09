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
import type { ForumChannel, ForumFeedFilter } from "@/lib/forum/config";
import type {
  FeedPage,
  FeedQuery,
  ForumPost,
  ForumPostMedia,
  ForumUserProfile,
} from "@/lib/types/forum";
import { getResponseErrorMessage } from "@/lib/utils/errors";
import { postSchema, type PostFormValues } from "@/lib/validation/forum";
import { buildSearchKeywords, normalizeText } from "@/lib/utils/text";

const forumChannels = new Set<ForumChannel>([
  "general",
  "fuites",
  "matos",
  "terrain",
]);

const forumDisplayModes = new Set(["standard", "media"]);

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
  const media = Array.isArray(data.media)
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
    : [];
  const channelValue = String(data.channel ?? "");
  const displayModeValue = String(data.displayMode ?? "");

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
    channel: forumChannels.has(channelValue as ForumChannel)
      ? (channelValue as ForumChannel)
      : "general",
    content: String(data.content),
    createdAt: toDate(data.createdAt),
    displayMode: forumDisplayModes.has(displayModeValue)
      ? (displayModeValue as ForumPost["displayMode"])
      : "standard",
    likeCount:
      typeof data.likeCount === "number" && Number.isFinite(data.likeCount)
        ? data.likeCount
        : 0,
    isPinned: Boolean(data.isPinned),
    media,
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

function sortPostsByPopularity(firstPost: ForumPost, secondPost: ForumPost) {
  if (secondPost.likeCount !== firstPost.likeCount) {
    return secondPost.likeCount - firstPost.likeCount;
  }

  return sortPostsByNewest(firstPost, secondPost);
}

function matchesSearch(post: ForumPost, search: string) {
  const normalizedQuery = normalizeText(search);
  const normalizedContent = normalizeText(`${post.title} ${post.content}`);

  return normalizedQuery
    .split(/\s+/)
    .every((term) => normalizedContent.includes(term));
}

function matchesChannel(post: ForumPost, channel: FeedQuery["channel"]) {
  return channel === undefined || channel === "all" || post.channel === channel;
}

function matchesFeedFilter(post: ForumPost, filter: ForumFeedFilter) {
  if (filter === "media") {
    return post.media.length > 0;
  }

  return true;
}

function sortPosts(posts: ForumPost[], filter: ForumFeedFilter) {
  return posts.sort(filter === "popular" ? sortPostsByPopularity : sortPostsByNewest);
}

async function fetchPostsBatch(
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
  channel = "all",
  filter = "recent",
  pageSize = 8,
  search = "",
}: FeedQuery = {}): Promise<FeedPage> {
  const db = getFirebaseDb();
  const postsReference = collection(db, "posts");
  const normalizedSearch = normalizeText(search);

  if (normalizedSearch || filter !== "recent" || channel !== "all") {
    const posts: ForumPost[] = [];
    let scanCursor: QueryDocumentSnapshot<DocumentData> | null = null;

    while (true) {
      const searchSnapshot = await fetchPostsBatch(postsReference, scanCursor);

      searchSnapshot.docs
        .map(mapPostSnapshot)
        .filter((post): post is ForumPost => Boolean(post))
        .filter((post) => matchesChannel(post, channel))
        .filter((post) => matchesFeedFilter(post, filter))
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
      posts: sortPosts(posts, filter),
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

export async function fetchPinnedPost(channel: FeedQuery["channel"] = "all") {
  const db = getFirebaseDb();
  const postsReference = collection(db, "posts");
  const posts: ForumPost[] = [];
  let scanCursor: QueryDocumentSnapshot<DocumentData> | null = null;

  while (true) {
    const snapshot = await fetchPostsBatch(postsReference, scanCursor);

    snapshot.docs
      .map(mapPostSnapshot)
      .filter((post): post is ForumPost => Boolean(post))
      .filter((post) => post.isPinned)
      .filter((post) => matchesChannel(post, channel))
      .forEach((post) => {
        posts.push(post);
      });

    if (snapshot.size < 50) {
      break;
    }

    scanCursor = snapshot.docs.at(-1) ?? null;
  }

  return posts.sort(sortPostsByNewest)[0] ?? null;
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
    channel: parsed.channel,
    content: parsed.content,
    createdAt: serverTimestamp(),
    displayMode: parsed.displayMode,
    hasMedia: parsed.media.length > 0,
    isPinned: false,
    likeCount: 0,
    media: parsed.media,
    mediaCount: parsed.media.length,
    searchKeywords: buildSearchKeywords(
      parsed.channel,
      parsed.title,
      parsed.content,
    ),
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
    channel: parsed.channel,
    content: parsed.content,
    displayMode: parsed.displayMode,
    hasMedia: parsed.media.length > 0,
    media: parsed.media,
    mediaCount: parsed.media.length,
    searchKeywords: buildSearchKeywords(
      parsed.channel,
      parsed.title,
      parsed.content,
    ),
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

export async function setPostPinnedState(
  postId: string,
  userId: string,
  isPinned: boolean,
) {
  const currentUser = getFirebaseAuth().currentUser;

  if (!currentUser || currentUser.uid !== userId) {
    throw new Error("Session invalide.");
  }

  const response = await fetch(`/api/posts/${postId}`, {
    body: JSON.stringify({ isPinned }),
    headers: {
      Authorization: `Bearer ${await currentUser.getIdToken()}`,
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response));
  }
}
