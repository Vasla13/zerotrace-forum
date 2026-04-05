import { isAnonymousAlias } from "@/lib/utils/alias";

export function getNodeBadge(username: string) {
  if (isAnonymousAlias(username)) {
    return "ANONYMOUS NODE";
  }

  if (/corp|proxy|signal/i.test(username)) {
    return "TRUSTED SIGNAL";
  }

  return "ROGUE PACKET";
}

export function getNodeFingerprint(value: string) {
  return `NODE//${value.slice(0, 6).toUpperCase()}`;
}
