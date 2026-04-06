export function canonicalizeAccessCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatAccessCode(value: string) {
  const normalized = canonicalizeAccessCode(value);
  const chunks = normalized.match(/.{1,4}/g);

  return chunks?.join("-") ?? normalized;
}
