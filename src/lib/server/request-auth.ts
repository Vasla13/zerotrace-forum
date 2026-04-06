import "server-only";

import type { NextRequest } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/server/firebase-admin";
import { HttpError } from "@/lib/server/http";

export async function requireAuthenticatedUid(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new HttpError(401, "Authentification requise.");
  }

  const idToken = authorization.slice("Bearer ".length).trim();

  if (!idToken) {
    throw new HttpError(401, "Session invalide.");
  }

  try {
    const decodedToken = await getFirebaseAdminAuth().verifyIdToken(idToken);

    return decodedToken.uid;
  } catch {
    throw new HttpError(401, "Session invalide.");
  }
}
