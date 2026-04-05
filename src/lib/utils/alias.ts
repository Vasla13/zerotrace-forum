const handlePrefixes = [
  "Data",
  "Neon",
  "Null",
  "Rogue",
  "Corp",
  "Static",
  "Signal",
  "Proxy",
  "Ghost",
  "Bio",
  "Rust",
  "Chrome",
  "Cipher",
  "Wire",
  "Black",
  "Toxic",
  "Shard",
  "Void",
  "Park",
  "Rat",
] as const;

const handleSuffixes = [
  "Ghost",
  "Slayer",
  "Rat",
  "Citizen",
  "Packet",
  "Kid",
  "Waste",
  "Node",
  "Leak",
  "Drift",
  "Proxy",
  "Crawler",
  "Noise",
  "Nomad",
  "Signal",
  "Spark",
  "Thread",
  "Vandal",
  "Splice",
  "Echo",
] as const;

function hashSeed(seed: string) {
  let value = 2166136261;

  for (const character of seed) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }

  return value >>> 0;
}

function pick<T>(values: readonly T[], seed: number) {
  return values[seed % values.length];
}

export function generateNodeAlias(seed = `${Date.now()}-${Math.random()}`) {
  const hashed = hashSeed(seed);
  const prefix = pick(handlePrefixes, hashed);
  const suffix = pick(handleSuffixes, hashed >>> 5);
  const serial = String((hashed % 89) + 11).padStart(2, "0");

  return `${prefix}${suffix}_${serial}`;
}

export function generateAliasBundle(seed: string, count = 5) {
  const aliases = new Set<string>();

  for (let index = 0; aliases.size < count && index < count * 6; index += 1) {
    aliases.add(generateNodeAlias(`${seed}:${index}`));
  }

  return Array.from(aliases);
}

export function isAnonymousAlias(value: string) {
  return /^(null|anon|ghost|void|proxy|signal|data|rogue|neon)/i.test(value);
}
