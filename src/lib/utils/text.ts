export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function normalizeUsername(value: string) {
  return normalizeText(value).replace(/[^a-z0-9_]/g, "");
}

export function buildSearchKeywords(...values: string[]) {
  const baseWords = values
    .map((value) => normalizeText(value))
    .join(" ")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 2);

  const tokens = new Set<string>();

  for (const word of baseWords) {
    tokens.add(word);

    const maxPrefixLength = Math.min(word.length, 12);
    for (let index = 2; index <= maxPrefixLength; index += 1) {
      tokens.add(word.slice(0, index));
    }
  }

  return Array.from(tokens).slice(0, 120);
}

export function excerpt(value: string, limit = 180) {
  const compact = value.replace(/\s+/g, " ").trim();

  if (compact.length <= limit) {
    return compact;
  }

  return `${compact.slice(0, limit).trim()}…`;
}
