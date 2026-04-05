import { randomBytes, createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const targetFile = resolve("src/lib/generated/access-codes.ts");

function parseArgs(argv) {
  const result = {
    count: 3,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === "--count" && next) {
      result.count = Number.parseInt(next, 10) || result.count;
      index += 1;
    }
  }

  return result;
}

function canonicalizeAccessCode(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function hashAccessCode(value) {
  return createHash("sha256").update(canonicalizeAccessCode(value)).digest("hex");
}

function formatAccessCode(value) {
  return canonicalizeAccessCode(value).match(/.{1,4}/g)?.join("-") ?? value;
}

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  let output = "NEST";

  for (let index = 0; index < bytes.length; index += 1) {
    output += alphabet[bytes[index] % alphabet.length];
  }

  return formatAccessCode(output);
}

function readExistingHashes() {
  try {
    const file = readFileSync(targetFile, "utf8");
    const matches = [...file.matchAll(/"([a-f0-9]{64})"/g)];

    return matches.map((match) => match[1]);
  } catch {
    return [];
  }
}

function writeHashes(hashes) {
  mkdirSync(dirname(targetFile), { recursive: true });
  const uniqueHashes = Array.from(new Set(hashes));
  const content = [
    "export const accessCodeHashes = [",
    ...uniqueHashes.map((hash) => `  \"${hash}\",`),
    "] as const;",
    "",
  ].join("\n");

  writeFileSync(targetFile, content);
}

const args = parseArgs(process.argv.slice(2));
const existingHashes = readExistingHashes();
const generatedCodes = Array.from({ length: args.count }, () => generateCode());
const generatedHashes = generatedCodes.map(hashAccessCode);

writeHashes([...existingHashes, ...generatedHashes]);

console.log("Codes d’accès générés :");
generatedCodes.forEach((code) => {
  console.log(`- ${code}`);
});
console.log("");
console.log(`Fichier mis à jour : ${targetFile}`);
