import { NextResponse, type NextRequest } from "next/server";
import { toErrorResponse } from "@/lib/server/http";
import { requireAuthenticatedUid } from "@/lib/server/request-auth";
import { createForumReportServer } from "@/lib/server/reports";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const uid = await requireAuthenticatedUid(request);
    const payload = await request.json();

    await createForumReportServer(uid, payload);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
