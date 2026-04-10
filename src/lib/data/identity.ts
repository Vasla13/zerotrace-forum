import { signInWithCustomToken } from "firebase/auth";
import { getFirebaseAuth, prepareFirebaseAuth } from "@/lib/firebase/client";
import { getResponseErrorMessage } from "@/lib/utils/errors";
import type { IdentityAuthValues } from "@/lib/validation/identity";
import { identityAuthSchema } from "@/lib/validation/identity";

export type IdentityAuthResult = {
  created: boolean;
  kind: "authenticated";
  username: string;
};

export async function authenticateIdentity(values: IdentityAuthValues) {
  const parsed = identityAuthSchema.parse(values);
  const response = await fetch("/api/auth/identity", {
    body: JSON.stringify(parsed),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response));
  }

  const payload = (await response.json()) as IdentityAuthResult & {
    token: string;
  };

  await prepareFirebaseAuth();
  await signInWithCustomToken(getFirebaseAuth(), payload.token);

  return {
    created: payload.created,
    kind: "authenticated" as const,
    username: payload.username,
  };
}
