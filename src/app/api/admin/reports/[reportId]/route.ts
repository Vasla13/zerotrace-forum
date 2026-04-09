import { NextResponse, type NextRequest } from "next/server";
import { requireAdminUid } from "@/lib/server/admin";
import { HttpError, toErrorResponse } from "@/lib/server/http";
import {
  deleteForumReportServer,
  setForumReportResolvedServer,
} from "@/lib/server/reports";

export const runtime = "nodejs";

type AdminReportRouteContext = {
  params: Promise<{ reportId: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: AdminReportRouteContext,
) {
  try {
    const actorUid = await requireAdminUid(request);
    const { reportId } = await context.params;
    const payload = (await request.json()) as { resolved?: unknown };

    if (typeof payload.resolved !== "boolean") {
      throw new HttpError(400, "Valeur de signalement invalide.");
    }

    await setForumReportResolvedServer(reportId, actorUid, payload.resolved);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: AdminReportRouteContext,
) {
  try {
    await requireAdminUid(request);
    const { reportId } = await context.params;

    await deleteForumReportServer(reportId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
