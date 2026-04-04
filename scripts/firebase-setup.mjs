import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

function runFirebaseCommand(args) {
  return execFileSync("firebase", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function parseArgs(argv) {
  const result = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === "--projectId" && next) {
      result.projectId = next;
      index += 1;
      continue;
    }

    if (current === "--appName" && next) {
      result.appName = next;
      index += 1;
    }
  }

  return result;
}

const args = parseArgs(process.argv.slice(2));
const projectId = args.projectId ?? "forum-20260404";
const appName = args.appName ?? "forum-web";

const listedApps = JSON.parse(
  runFirebaseCommand(["--project", projectId, "apps:list", "WEB", "--json"]),
).result;

let app = listedApps[0];

if (!app) {
  app = JSON.parse(
    runFirebaseCommand([
      "--project",
      projectId,
      "apps:create",
      "WEB",
      appName,
      "--json",
    ]),
  ).result;
}

const sdkConfig = JSON.parse(
  runFirebaseCommand([
    "--project",
    projectId,
    "apps:sdkconfig",
    "WEB",
    app.appId,
    "--json",
  ]),
).result.sdkConfig;

const envFile = [
  `NEXT_PUBLIC_FIREBASE_API_KEY=${sdkConfig.apiKey}`,
  `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${sdkConfig.authDomain}`,
  `NEXT_PUBLIC_FIREBASE_PROJECT_ID=${sdkConfig.projectId}`,
  `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${sdkConfig.storageBucket}`,
  `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${sdkConfig.messagingSenderId}`,
  `NEXT_PUBLIC_FIREBASE_APP_ID=${sdkConfig.appId}`,
  `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=${sdkConfig.measurementId ?? ""}`,
  "",
].join("\n");

writeFileSync(resolve(".env.local"), envFile);
writeFileSync(
  resolve(".firebaserc"),
  `${JSON.stringify(
    {
      projects: {
        default: projectId,
      },
    },
    null,
    2,
  )}\n`,
);

console.log(`Projet Firebase configuré: ${projectId}`);
console.log("Fichier .env.local généré.");
console.log(
  "Pense aussi à activer Email/Password dans Firebase Authentication si ce n'est pas déjà fait.",
);
