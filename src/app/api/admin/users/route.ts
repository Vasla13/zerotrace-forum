import { NextResponse, type NextRequest } from "next/server";
import { listAdminUsers, requireAdminUid } from "@/lib/server/admin";
import { toErrorResponse } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireAdminUid(request);
    const search = request.nextUrl.searchParams.get("q") ?? "";
    const users = await listAdminUsers(search);

    return NextResponse.json(
      users.map((user) => ({
        ...user,
        certificationRequestedAt:
          user.certificationRequestedAt?.toISOString() ?? null,
        certifiedAt: user.certifiedAt?.toISOString() ?? null,
        createdAt: user.createdAt?.toISOString() ?? null,
      })),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
