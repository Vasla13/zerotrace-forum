import { NextResponse, type NextRequest } from "next/server";
import { getUsernamesByUids, requireAdminUid } from "@/lib/server/admin";
import { createAccessCodes, listAccessCodeRecords } from "@/lib/server/access-code";
import { HttpError, toErrorResponse } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireAdminUid(request);
    const accessCodes = (await listAccessCodeRecords()).filter(
      (code) => code.source !== "legacy-file" && code.note !== "import legacy",
    );
    const usernames = await getUsernamesByUids(
      accessCodes.flatMap((code) => [
        code.createdByUid ?? "",
        code.usedByUid ?? "",
        code.revokedByUid ?? "",
      ]),
    );

    return NextResponse.json(
      accessCodes.map((code) => ({
        code: code.code,
        createdAt: code.createdAt?.toISOString() ?? null,
        createdByUsername: code.createdByUid
          ? usernames.get(code.createdByUid) ?? code.createdByUid
          : null,
        fingerprint: code.fingerprint,
        hash: code.hash,
        note: code.note,
        revoked: Boolean(code.revokedAt),
        revokedAt: code.revokedAt?.toISOString() ?? null,
        source: code.source,
        usedAt: code.usedAt?.toISOString() ?? null,
        usedByUsername: code.usedByUid
          ? usernames.get(code.usedByUid) ?? code.usedByUid
          : null,
      })),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actorUid = await requireAdminUid(request);
    const payload = (await request.json()) as {
      count?: unknown;
      note?: unknown;
    };
    const count =
      typeof payload.count === "number" && Number.isInteger(payload.count)
        ? payload.count
        : Number.parseInt(String(payload.count ?? ""), 10);

    if (!Number.isInteger(count) || count < 1 || count > 50) {
      throw new HttpError(400, "Le nombre de codes doit être compris entre 1 et 50.");
    }

    const note =
      typeof payload.note === "string" && payload.note.trim()
        ? payload.note.trim().slice(0, 80)
        : null;

    const createdCodes = await createAccessCodes({
      count,
      createdByUid: actorUid,
      note,
      source: "panel",
    });

    return NextResponse.json(createdCodes);
  } catch (error) {
    return toErrorResponse(error);
  }
}
