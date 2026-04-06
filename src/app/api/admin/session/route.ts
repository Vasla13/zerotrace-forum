import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession, requireAdminUid } from "@/lib/server/admin";
import { toErrorResponse } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const uid = await requireAdminUid(request);
    const session = await getAdminSession(uid);

    return NextResponse.json(session);
  } catch (error) {
    return toErrorResponse(error);
  }
}
