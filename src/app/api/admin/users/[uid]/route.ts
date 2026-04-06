import { NextResponse, type NextRequest } from "next/server";
import {
  deleteForumUserServer,
  requireAdminUid,
  setUserAdminRole,
} from "@/lib/server/admin";
import { HttpError, toErrorResponse } from "@/lib/server/http";

export const runtime = "nodejs";

type AdminUserRouteContext = {
  params: Promise<{ uid: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: AdminUserRouteContext,
) {
  try {
    const actorUid = await requireAdminUid(request);
    const { uid } = await context.params;
    const payload = (await request.json()) as { isAdmin?: unknown };

    if (typeof payload.isAdmin !== "boolean") {
      throw new HttpError(400, "Valeur admin invalide.");
    }

    await setUserAdminRole(actorUid, uid, payload.isAdmin);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: AdminUserRouteContext,
) {
  try {
    const actorUid = await requireAdminUid(request);
    const { uid } = await context.params;

    await deleteForumUserServer(actorUid, uid);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
