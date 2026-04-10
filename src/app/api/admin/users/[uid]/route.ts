import { NextResponse, type NextRequest } from "next/server";
import {
  deleteForumUserServer,
  requireAdminUid,
  setUserCertificationStatus,
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
    const payload = (await request.json()) as {
      certificationStatus?: unknown;
      isAdmin?: unknown;
    };

    if (typeof payload.isAdmin !== "boolean") {
      if (
        payload.certificationStatus === "approved" ||
        payload.certificationStatus === "none"
      ) {
        await setUserCertificationStatus(uid, payload.certificationStatus);
        return NextResponse.json({ ok: true });
      }

      throw new HttpError(400, "Action admin invalide.");
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

    await deleteForumUserServer(actorUid, uid, { preserveContent: true });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
