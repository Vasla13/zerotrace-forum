import type { User } from "firebase/auth";
import type {
  AdminAccessCodeSummary,
  AdminSession,
  AdminUserSummary,
  GeneratedAdminAccessCode,
} from "@/lib/types/admin";
import { getResponseErrorMessage } from "@/lib/utils/errors";

async function buildAuthorizedHeaders(user: User) {
  return {
    Authorization: `Bearer ${await user.getIdToken()}`,
    "Content-Type": "application/json",
  };
}

export async function fetchAdminSession(user: User) {
  const response = await fetch("/api/admin/session", {
    headers: await buildAuthorizedHeaders(user),
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response));
  }

  return (await response.json()) as AdminSession;
}

export async function fetchOptionalAdminSession(user: User) {
  const response = await fetch("/api/admin/session", {
    headers: await buildAuthorizedHeaders(user),
    method: "GET",
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response));
  }

  return (await response.json()) as AdminSession;
}

export async function fetchAdminUsers(user: User, search = "") {
  const query = search ? `?q=${encodeURIComponent(search)}` : "";
  const response = await fetch(`/api/admin/users${query}`, {
    headers: await buildAuthorizedHeaders(user),
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response));
  }

  return (await response.json()) as AdminUserSummary[];
}

export async function setAdminUserRole(
  user: User,
  targetUid: string,
  isAdmin: boolean,
) {
  const response = await fetch(`/api/admin/users/${targetUid}`, {
    body: JSON.stringify({ isAdmin }),
    headers: await buildAuthorizedHeaders(user),
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response));
  }
}

export async function deleteAdminUser(user: User, targetUid: string) {
  const response = await fetch(`/api/admin/users/${targetUid}`, {
    headers: await buildAuthorizedHeaders(user),
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response));
  }
}

export async function fetchAdminAccessCodes(user: User) {
  const response = await fetch("/api/admin/access-codes", {
    headers: await buildAuthorizedHeaders(user),
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response));
  }

  return (await response.json()) as AdminAccessCodeSummary[];
}

export async function generateAdminAccessCodes(
  user: User,
  input: { count: number; note: string },
) {
  const response = await fetch("/api/admin/access-codes", {
    body: JSON.stringify(input),
    headers: await buildAuthorizedHeaders(user),
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response));
  }

  return (await response.json()) as GeneratedAdminAccessCode[];
}

export async function setAdminAccessCodeRevoked(
  user: User,
  hash: string,
  revoked: boolean,
) {
  const response = await fetch(`/api/admin/access-codes/${hash}`, {
    body: JSON.stringify({ revoked }),
    headers: await buildAuthorizedHeaders(user),
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response));
  }
}

export async function deleteAdminAccessCode(user: User, hash: string) {
  const response = await fetch(`/api/admin/access-codes/${hash}`, {
    headers: await buildAuthorizedHeaders(user),
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response));
  }
}
