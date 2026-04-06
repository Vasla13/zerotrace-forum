import { NextResponse, type NextRequest } from "next/server";
import { deleteForumPostServer } from "@/lib/server/forum-posts";
import { toErrorResponse } from "@/lib/server/http";
import { requireAuthenticatedUid } from "@/lib/server/request-auth";

export const runtime = "nodejs";

type PostRouteContext = {
  params: Promise<{ postId: string }>;
};

export async function DELETE(request: NextRequest, context: PostRouteContext) {
  try {
    const { postId } = await context.params;
    const userId = await requireAuthenticatedUid(request);

    await deleteForumPostServer(postId, userId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
