import "server-only";

import { getFirebaseAdminStorage } from "@/lib/server/firebase-admin";

export async function deleteStoragePrefix(prefix: string) {
  const bucket = getFirebaseAdminStorage().bucket();

  await bucket.deleteFiles({
    force: true,
    prefix,
  }).catch((error: unknown) => {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 404
    ) {
      return;
    }

    throw error;
  });
}
