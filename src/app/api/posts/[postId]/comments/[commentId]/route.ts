import { NextResponse, type NextRequest } from "next/server";
import { deleteForumCommentServer } from "@/lib/server/forum-posts";
import { isAdminUid } from "@/lib/server/admin";
import { toErrorResponse } from "@/lib/server/http";
import { requireAuthenticatedUid } from "@/lib/server/request-auth";

export const runtime = "nodejs";

type CommentRouteContext = {
  params: Promise<{ commentId: string; postId: string }>;
};

export async function DELETE(request: NextRequest, context: CommentRouteContext) {
  try {
    const { commentId, postId } = await context.params;
    const actorUid = await requireAuthenticatedUid(request);
    const actorIsAdmin = await isAdminUid(actorUid);

    await deleteForumCommentServer(postId, commentId, actorUid, {
      actorIsAdmin,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
