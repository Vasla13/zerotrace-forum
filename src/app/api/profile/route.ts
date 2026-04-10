import { NextResponse, type NextRequest } from "next/server";
import { deleteForumUserServer } from "@/lib/server/admin";
import { updateForumProfileServer } from "@/lib/server/profile";
import { requireAuthenticatedUid } from "@/lib/server/request-auth";
import { toErrorResponse } from "@/lib/server/http";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  try {
    const uid = await requireAuthenticatedUid(request);
    const payload = await request.json();
    const profile = await updateForumProfileServer(uid, payload);

    return NextResponse.json(profile);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const uid = await requireAuthenticatedUid(request);
    await deleteForumUserServer(uid, uid, {
      allowSelf: true,
      preserveContent: true,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
