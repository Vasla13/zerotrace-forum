import { NextResponse, type NextRequest } from "next/server";
import { renameForumUserServer } from "@/lib/server/profile";
import { requireAuthenticatedUid } from "@/lib/server/request-auth";
import { toErrorResponse } from "@/lib/server/http";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  try {
    const uid = await requireAuthenticatedUid(request);
    const payload = await request.json();
    const profile = await renameForumUserServer(uid, payload);

    return NextResponse.json(profile);
  } catch (error) {
    return toErrorResponse(error);
  }
}
