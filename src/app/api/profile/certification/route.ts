import { NextResponse, type NextRequest } from "next/server";
import { requestUserCertification } from "@/lib/server/admin";
import { toErrorResponse } from "@/lib/server/http";
import { requireAuthenticatedUid } from "@/lib/server/request-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const uid = await requireAuthenticatedUid(request);
    await requestUserCertification(uid);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
