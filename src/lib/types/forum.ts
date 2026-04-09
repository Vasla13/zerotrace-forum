import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import type {
  ForumChannel,
  ForumFeedFilter,
  ForumPostDisplayMode,
} from "@/lib/forum/config";

export type ForumAuthor = {
  avatarUrl: string | null;
  uid: string;
  username: string;
  usernameLower: string;
};

export type ForumUserProfile = {
  avatarUrl: string | null;
  uid: string;
  username: string;
  usernameLower: string;
  createdAt: Date | null;
};

export type ForumPostMedia = {
  storagePath: string;
  type: "image" | "video";
  url: string;
};

export type ForumPost = {
  id: string;
  author: ForumAuthor;
  channel: ForumChannel;
  content: string;
  createdAt: Date | null;
  displayMode: ForumPostDisplayMode;
  likeCount: number;
  isPinned: boolean;
  media: ForumPostMedia[];
  searchKeywords: string[];
  title: string;
  updatedAt: Date | null;
};

export type ForumComment = {
  id: string;
  author: ForumAuthor;
  content: string;
  createdAt: Date | null;
  postId: string;
  updatedAt: Date | null;
};

export type FeedPage = {
  hasMore: boolean;
  nextCursor: QueryDocumentSnapshot<DocumentData> | null;
  posts: ForumPost[];
};

export type FeedChannelFilter = ForumChannel | "all";

export type FeedQuery = {
  channel?: FeedChannelFilter;
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
  filter?: ForumFeedFilter;
  pageSize?: number;
  search?: string;
};

export type LikeState = {
  count: number;
  likedByUser: boolean;
};
