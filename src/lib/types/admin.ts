export type AdminSession = {
  isAdmin: boolean;
  isBootstrapAdmin: boolean;
  uid: string;
  username: string;
};

export type AdminUserSummary = {
  createdAt: string | null;
  isAdmin: boolean;
  isBootstrapAdmin: boolean;
  postCount: number;
  uid: string;
  username: string;
  usernameLower: string;
};

export type AdminAccessCodeSummary = {
  code: string | null;
  createdAt: string | null;
  createdByUsername: string | null;
  fingerprint: string;
  hash: string;
  note: string | null;
  revoked: boolean;
  revokedAt: string | null;
  source: string | null;
  usedAt: string | null;
  usedByUsername: string | null;
};

export type GeneratedAdminAccessCode = {
  code: string;
  fingerprint: string;
  hash: string;
  note: string | null;
};

export type AdminReportSummary = {
  commentId: string | null;
  createdAt: string | null;
  id: string;
  kind: "post" | "comment";
  postId: string;
  postTitle: string | null;
  previewText: string;
  reportedByUsername: string;
  resolved: boolean;
  resolvedAt: string | null;
  targetAuthorUsername: string;
};
