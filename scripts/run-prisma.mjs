import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";

const cwd = process.cwd();
const envFiles = [".env", ".env.local"];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex < 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

for (const envFile of envFiles) {
  loadEnvFile(path.join(cwd, envFile));
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required. Add it to .env.local or your shell environment.");
  process.exit(1);
}

const command =
  process.platform === "win32"
    ? path.join(cwd, "node_modules", ".bin", "prisma.cmd")
    : path.join(cwd, "node_modules", ".bin", "prisma");
const result = spawnSync(command, process.argv.slice(2), {
  cwd,
  env: process.env,
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
