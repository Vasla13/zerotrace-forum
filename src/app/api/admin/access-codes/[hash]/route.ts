import { NextResponse, type NextRequest } from "next/server";
import { requireAdminUid } from "@/lib/server/admin";
import { deleteAccessCode, setAccessCodeRevokedState } from "@/lib/server/access-code";
import { HttpError, toErrorResponse } from "@/lib/server/http";

export const runtime = "nodejs";

type AccessCodeRouteContext = {
  params: Promise<{ hash: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: AccessCodeRouteContext,
) {
  try {
    const actorUid = await requireAdminUid(request);
    const { hash } = await context.params;
    const payload = (await request.json()) as { revoked?: unknown };

    if (typeof payload.revoked !== "boolean") {
      throw new HttpError(400, "Valeur de révocation invalide.");
    }

    await setAccessCodeRevokedState(hash, payload.revoked, actorUid);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: AccessCodeRouteContext,
) {
  try {
    await requireAdminUid(request);
    const { hash } = await context.params;

    await deleteAccessCode(hash);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
