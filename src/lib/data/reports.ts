import type { User } from "firebase/auth";
import { getResponseErrorMessage } from "@/lib/utils/errors";

export async function createForumReport(
  user: User,
  input: {
    commentId?: string | null;
    kind: "post" | "comment";
    postId: string;
    postTitle?: string | null;
    previewText: string;
    targetAuthorUsername: string;
  },
) {
  const response = await fetch("/api/reports", {
    body: JSON.stringify(input),
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response));
  }
}
