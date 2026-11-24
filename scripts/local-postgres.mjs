#!/usr/bin/env node
/**
 * Runs a private PostgreSQL instance just for CookAI, using the PostgreSQL
 * binaries already installed on this machine. No password: it only accepts
 * connections from this computer (trust auth on localhost).
 *
 *   node scripts/local-postgres.mjs start | stop | status
 *
 * Settings (from .env or the environment):
 *   DATABASE_URL    port and user are taken from here (e.g. postgres://postgres@localhost:5433/cookai)
 *   PG_BIN          folder containing pg_ctl/initdb; auto-detected if empty
 *   PG_LOCAL_DATA   data folder, default ./.pgdata (relative to the repo root)
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const envFile = join(root, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const command = process.argv[2] ?? "status";
const exe = process.platform === "win32" ? ".exe" : "";

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

/** Finds the PostgreSQL bin folder: PG_BIN, then PATH, then the usual install folders (newest version first). */
function findBin() {
  if (process.env.PG_BIN?.trim()) {
    const dir = process.env.PG_BIN.trim();
    if (!existsSync(join(dir, `pg_ctl${exe}`))) fail(`PG_BIN is set to "${dir}" but pg_ctl isn't in it.`);
    return dir;
  }
  const which = spawnSync(process.platform === "win32" ? "where" : "which", ["pg_ctl"], { encoding: "utf8" });
  if (which.status === 0 && which.stdout.trim()) return resolve(which.stdout.trim().split(/\r?\n/)[0], "..");

  const candidates = [];
  if (process.platform === "win32") {
    for (const base of [process.env.ProgramFiles, process.env["ProgramFiles(x86)"]].filter(Boolean)) {
      const pgRoot = join(base, "PostgreSQL");
      if (existsSync(pgRoot)) for (const v of readdirSync(pgRoot)) candidates.push([Number.parseFloat(v), join(pgRoot, v, "bin")]);
    }
  } else {
    for (const base of ["/usr/lib/postgresql", "/opt/homebrew/opt", "/usr/local/opt"]) {
      if (!existsSync(base)) continue;
      for (const v of readdirSync(base)) {
        const m = v.match(/(\d+(?:\.\d+)?)/);
        if (m) candidates.push([Number(m[1]), join(base, v, "bin")]);
      }
    }
  }
  const found = candidates.filter(([, dir]) => existsSync(join(dir, `pg_ctl${exe}`))).sort((a, b) => b[0] - a[0])[0];
  if (!found) fail("Couldn't find PostgreSQL's pg_ctl. Install PostgreSQL or set PG_BIN in .env to its bin folder.");
  return found[1];
}

const url = (() => {
  try {
    return new URL(process.env.DATABASE_URL ?? "");
  } catch {
    return fail("DATABASE_URL in .env isn't a valid postgres:// URL.");
  }
})();
const port = url.port || "5432";
const user = decodeURIComponent(url.username || "postgres");
if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)) {
  fail(`DATABASE_URL points at ${url.hostname}; the local instance only runs on localhost.`);
}

const bin = findBin();
const dataDir = resolve(root, process.env.PG_LOCAL_DATA?.trim() || ".pgdata");
const logFile = join(dataDir, "server.log");
const pgCtl = join(bin, `pg_ctl${exe}`);

/** Runs a PostgreSQL tool with no stdio pipes (the server would otherwise hold them open). */
const run = (file, args) => spawnSync(file, args, { stdio: "ignore", windowsHide: true }).status;

const isRunning = () => existsSync(join(dataDir, "PG_VERSION")) && run(pgCtl, ["status", "-D", dataDir]) === 0;

switch (command) {
  case "start": {
    if (!existsSync(join(dataDir, "PG_VERSION"))) {
      console.log(`Creating a new PostgreSQL data folder in ${dataDir} …`);
      const status = run(join(bin, `initdb${exe}`), ["-D", dataDir, "-U", user, "--auth=trust", "-E", "UTF8", "--no-instructions"]);
      if (status !== 0) fail("initdb failed. Is the folder writable?");
    }
    if (isRunning()) {
      console.log(`Local PostgreSQL is already running on port ${port}.`);
      break;
    }
    const status = run(pgCtl, ["start", "-D", dataDir, "-l", logFile, "-w", "-t", "30", "-o", `-p ${port} -c listen_addresses=localhost`]);
    if (status !== 0) fail(`PostgreSQL didn't start. See ${logFile} (is port ${port} already in use?).`);
    console.log(`Local PostgreSQL is running on port ${port} (data: ${dataDir}).`);
    break;
  }
  case "stop": {
    if (!isRunning()) {
      console.log("Local PostgreSQL isn't running.");
      break;
    }
    if (run(pgCtl, ["stop", "-D", dataDir, "-m", "fast", "-w"]) !== 0) fail("pg_ctl stop failed.");
    console.log("Local PostgreSQL stopped.");
    break;
  }
  case "status":
    console.log(isRunning() ? `Local PostgreSQL is running on port ${port}.` : "Local PostgreSQL isn't running.");
    break;
  default:
    fail(`Unknown command "${command}". Use start, stop or status.`);
}
