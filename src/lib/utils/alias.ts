const handlePrefixes = [
  "Audit",
  "Bureau",
  "Cabinet",
  "Cellule",
  "Censeur",
  "Comite",
  "Comptable",
  "Controle",
  "DRH",
  "Greffier",
  "Huissier",
  "Mairie",
  "Notaire",
  "Parcmetre",
  "Prefet",
  "Procureur",
  "Recteur",
  "Service",
  "SousPrefet",
  "Stagiaire",
  "Syndicat",
  "Brigade",
  "Directoire",
  "Archiviste",
] as const;

const handleSuffixes = [
  "Apathique",
  "Binaire",
  "Carnivore",
  "Cafardeux",
  "Corpo",
  "Dechet",
  "DuVide",
  "Feral",
  "Funebre",
  "Morbide",
  "Nocturne",
  "Nucleaire",
  "Obese",
  "Radin",
  "Rance",
  "Routinier",
  "Rouille",
  "Sinistre",
  "Spectral",
  "Subtil",
  "Terminal",
  "Vermine",
  "Becane",
  "Deregule",
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
  const serial = String((hashed % 89) + 11).padStart(2, "0");

  for (let index = 0; index < handlePrefixes.length * 2; index += 1) {
    const prefix = pick(handlePrefixes, hashed + index);
    const suffix = pick(handleSuffixes, (hashed >>> 5) + index * 3);
    const alias = `${prefix}${suffix}_${serial}`;

    if (alias.length <= 24) {
      return alias;
    }
  }

  return `BureauRance_${serial}`;
}

export function generateAliasBundle(seed: string, count = 5) {
  const aliases = new Set<string>();

  for (let index = 0; aliases.size < count && index < count * 8; index += 1) {
    aliases.add(generateNodeAlias(`${seed}:${index}`));
  }

  return Array.from(aliases);
}

export function isAnonymousAlias(value: string) {
  return handlePrefixes.some((prefix) =>
    value.toLowerCase().startsWith(prefix.toLowerCase()),
  );
}
