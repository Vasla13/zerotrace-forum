const aliasLeads = [
  "Audit",
  "Backdoor",
  "Benne",
  "Bureau",
  "Caniveau",
  "Cellule",
  "Comite",
  "Crachat",
  "Daemon",
  "DRH",
  "Fantome",
  "Fuite",
  "Greffier",
  "Greve",
  "Huissier",
  "Kernel",
  "Miette",
  "Module",
  "Parcmetre",
  "Prefet",
  "Proxy",
  "Raclure",
  "Rootkit",
  "Service",
  "Signal",
  "SousSol",
  "Spectre",
  "Stagiaire",
  "Taule",
  "Virus",
  "Verrou",
  "Zone",
] as const;

const aliasMoods = [
  "Acide",
  "Apathique",
  "Binaire",
  "Brutal",
  "Corrompu",
  "Crasse",
  "Cynique",
  "Feral",
  "Fiscal",
  "Funebre",
  "Glitch",
  "Gris",
  "Honteux",
  "Louche",
  "Morbide",
  "Nerveux",
  "Nocif",
  "Noir",
  "Parano",
  "Pirate",
  "Radin",
  "Rance",
  "Rural",
  "Sale",
  "Spectral",
  "Toxique",
  "Viral",
  "Zero",
] as const;

const aliasTargets = [
  "Bled",
  "Bunker",
  "Cadavre",
  "Canard",
  "Caniveau",
  "Carnage",
  "Cendrier",
  "Circuit",
  "Clodo",
  "Corbillard",
  "Crash",
  "Detritus",
  "Dossier",
  "Dump",
  "Egout",
  "Fiasco",
  "Fuite",
  "Matos",
  "Neant",
  "Proxy",
  "Racket",
  "Rongeur",
  "Ruine",
  "Signal",
  "Squelette",
  "Taule",
  "Terminal",
  "Tuyau",
  "Virus",
  "Zone",
] as const;

const aliasTitles = [
  "Agent",
  "Caporal",
  "Clerc",
  "Docteur",
  "Gardien",
  "Maire",
  "Ministre",
  "Notaire",
  "Recteur",
  "Tonton",
] as const;

const aliasDuTargets = [
  "Bled",
  "Bunker",
  "Chaos",
  "Crash",
  "Dump",
  "Neant",
  "Racket",
  "Signal",
  "Vide",
  "Vice",
] as const;

const aliasSignatures = [
  "13",
  "17",
  "35",
  "77",
  "404",
  "451",
  "666",
  "808",
  "909",
  "1312",
  "2035",
  "MK2",
  "OS",
  "VX",
] as const;

const anonymousRoots = [
  ...aliasLeads,
  ...aliasTitles,
  ...aliasTargets,
  "Du",
] as const;

type AliasRandomSource = () => number;

function hashSeed(seed: string) {
  let value = 2166136261;

  for (const character of seed) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }

  return value >>> 0;
}

function createRandomSource(seed: string): AliasRandomSource {
  let state = hashSeed(seed) || 1;

  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function pick<T>(values: readonly T[], random: AliasRandomSource) {
  const index = Math.floor(random() * values.length);
  return values[index] ?? values[0];
}

function maybeAddSignature(alias: string, random: AliasRandomSource) {
  if (random() > 0.38) {
    return alias;
  }

  const signature = pick(aliasSignatures, random);
  const separator = random() > 0.52 ? "_" : "";
  const nextAlias = `${alias}${separator}${signature}`;

  if (nextAlias.length > 24) {
    return alias;
  }

  return nextAlias;
}

function buildAliasVariant(random: AliasRandomSource) {
  const variant = Math.floor(random() * 10);

  switch (variant) {
    case 0:
      return `${pick(aliasLeads, random)}${pick(aliasMoods, random)}`;
    case 1:
      return `${pick(aliasLeads, random)}${pick(aliasTargets, random)}`;
    case 2:
      return `${pick(aliasTargets, random)}${pick(aliasMoods, random)}`;
    case 3:
      return `${pick(aliasLeads, random)}Du${pick(aliasDuTargets, random)}`;
    case 4:
      return `${pick(aliasTitles, random)}${pick(aliasMoods, random)}`;
    case 5:
      return `${pick(aliasLeads, random)}_${pick(aliasMoods, random)}`;
    case 6:
      return `${pick(aliasTitles, random)}_${pick(aliasTargets, random)}`;
    case 7:
      return `${pick(aliasTargets, random)}_${pick(aliasSignatures, random)}`;
    case 8:
      return `${pick(aliasLeads, random)}${pick(aliasTargets, random)}${pick(aliasSignatures, random)}`;
    default:
      return `${pick(aliasMoods, random)}${pick(aliasTargets, random)}`;
  }
}

function normalizeAliasLength(alias: string) {
  return alias.replace(/__+/g, "_").slice(0, 24).replace(/_+$/g, "");
}

export function generateNodeAlias(seed = `${Date.now()}-${Math.random()}`) {
  const random = createRandomSource(seed);

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const baseAlias = buildAliasVariant(random);
    const candidate = normalizeAliasLength(maybeAddSignature(baseAlias, random));

    if (candidate.length >= 3 && candidate.length <= 24) {
      return candidate;
    }
  }

  return "CaniveauRance_2035";
}

export function generateAliasBundle(seed: string, count = 5) {
  const aliases = new Set<string>();

  for (let index = 0; aliases.size < count && index < count * 12; index += 1) {
    aliases.add(generateNodeAlias(`${seed}:${index}`));
  }

  return Array.from(aliases);
}

export function isAnonymousAlias(value: string) {
  const normalizedValue = value.trim().toLowerCase();

  return anonymousRoots.some((root) =>
    normalizedValue.startsWith(root.toLowerCase()),
  );
}
