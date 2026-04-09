import { NextResponse, type NextRequest } from "next/server";
import {
  deleteForumPostServer,
  setForumPostPinnedStateServer,
} from "@/lib/server/forum-posts";
import { HttpError, toErrorResponse } from "@/lib/server/http";
import { requireAdminUid } from "@/lib/server/admin";
import { requireAuthenticatedUid } from "@/lib/server/request-auth";

export const runtime = "nodejs";

type PostRouteContext = {
  params: Promise<{ postId: string }>;
};

export async function PATCH(request: NextRequest, context: PostRouteContext) {
  try {
    await requireAdminUid(request);
    const { postId } = await context.params;
    const payload = (await request.json()) as { isPinned?: unknown };

    if (typeof payload.isPinned !== "boolean") {
      throw new HttpError(400, "Valeur d’épinglage invalide.");
    }

    await setForumPostPinnedStateServer(postId, payload.isPinned);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

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
