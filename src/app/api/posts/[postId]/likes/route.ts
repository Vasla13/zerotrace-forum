import { NextResponse, type NextRequest } from "next/server";
import { togglePostLikeServer } from "@/lib/server/forum-posts";
import { toErrorResponse } from "@/lib/server/http";
import { requireAuthenticatedUid } from "@/lib/server/request-auth";

export const runtime = "nodejs";

type LikeRouteContext = {
  params: Promise<{ postId: string }>;
};

export async function POST(request: NextRequest, context: LikeRouteContext) {
  try {
    const { postId } = await context.params;
    const userId = await requireAuthenticatedUid(request);

    await togglePostLikeServer(postId, userId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
