import { NextResponse, type NextRequest } from "next/server";
import { requireAdminUid } from "@/lib/server/admin";
import { toErrorResponse } from "@/lib/server/http";
import { listForumReportsServer } from "@/lib/server/reports";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireAdminUid(request);
    const reports = await listForumReportsServer();

    return NextResponse.json(
      reports.map((report) => ({
        ...report,
        createdAt: report.createdAt?.toISOString() ?? null,
        resolvedAt: report.resolvedAt?.toISOString() ?? null,
      })),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
