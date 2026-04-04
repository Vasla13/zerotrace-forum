import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

export type ForumAuthor = {
  uid: string;
  username: string;
  usernameLower: string;
};

export type ForumUserProfile = {
  uid: string;
  username: string;
  usernameLower: string;
  email: string;
  createdAt: Date | null;
};

export type ForumPost = {
  id: string;
  author: ForumAuthor;
  content: string;
  createdAt: Date | null;
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

export type LikeState = {
  count: number;
  likedByUser: boolean;
};
