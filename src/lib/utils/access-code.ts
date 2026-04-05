import { accessCodeHashes } from "@/lib/generated/access-codes";

const accessCodeHashSet = new Set<string>(accessCodeHashes);

export function canonicalizeAccessCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatAccessCode(value: string) {
  const normalized = canonicalizeAccessCode(value);
  const chunks = normalized.match(/.{1,4}/g);

  return chunks?.join("-") ?? normalized;
}

export async function hashAccessCode(value: string) {
  const normalized = canonicalizeAccessCode(value);
  const encoded = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", encoded);

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function buildAccessCodeIdentity(value: string) {
  const hash = await hashAccessCode(value);

  return {
    email: `${hash}@auth.nest.local`,
    hash,
    password: `NEST::${hash}::SIGNAL`,
  };
}

export function hasProvisionedAccessCodes() {
  return accessCodeHashSet.size > 0;
}

export function isAccessCodeProvisioned(hash: string) {
  return accessCodeHashSet.has(hash);
}
