import { NextResponse } from "next/server";
import { authenticateWithAccessCodeServer } from "@/lib/server/forum-auth";
import { toErrorResponse } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await authenticateWithAccessCodeServer(payload);

    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
