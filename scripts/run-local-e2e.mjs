import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const repositoryRoot = process.cwd();
const configPath = path.join(repositoryRoot, "supabase", "config.toml");
const supabaseCli = path.join(
  repositoryRoot,
  "node_modules",
  "supabase",
  "dist",
  "supabase.js",
);
const playwrightCli = path.join(
  repositoryRoot,
  "node_modules",
  "@playwright",
  "test",
  "cli.js",
);
const nextCli = path.join(
  repositoryRoot,
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);
const excludedServices = [
  "realtime",
  "storage-api",
  "imgproxy",
  "mailpit",
  "postgres-meta",
  "studio",
  "edge-runtime",
  "logflare",
  "vector",
  "supavisor",
].join(",");
let generatedConfig = false;
let localStackStarted = false;

function runNodeScript(script, args, options = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
  if (result.error) throw result.error;
  return result;
}

function requireSuccess(result, label) {
  if (result.status === 0) return;
  throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}.`);
}

function createIsolatedConfig() {
  if (fs.existsSync(configPath)) {
    throw new Error(
      "Refusing to replace an existing supabase/config.toml. The E2E harness is local-only.",
    );
  }

  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "jalvoro-local-e2e-"),
  );
  try {
    const init = runNodeScript(supabaseCli, ["init", "--workdir", temporaryRoot]);
    requireSuccess(init, "Supabase config initialization");
    const generatedPath = path.join(temporaryRoot, "supabase", "config.toml");
    let config = fs.readFileSync(generatedPath, "utf8");
    config = config
      .replace(/^project_id\s*=\s*"[^"]+"/m, 'project_id = "jalvoro-local-e2e"')
      .replace(/5432([0-9])/g, "5632$1")
      .replace(
        /^site_url\s*=\s*"[^"]+"/m,
        'site_url = "http://127.0.0.1:3100"',
      )
      .replace(
        /^additional_redirect_urls\s*=\s*\[[^\]]*\]/m,
        'additional_redirect_urls = ["http://127.0.0.1:3100/**"]',
      );
    fs.writeFileSync(configPath, config, { encoding: "utf8", flag: "wx" });
    generatedConfig = true;
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function startLocalStack() {
  const start = runNodeScript(supabaseCli, [
    "start",
    "--exclude",
    excludedServices,
  ]);
  localStackStarted = true;
  requireSuccess(start, "Supabase local start");
}

function stopLocalStack({ preserveData = false } = {}) {
  if (!localStackStarted) return;
  runNodeScript(
    supabaseCli,
    preserveData ? ["stop"] : ["stop", "--no-backup"],
  );
  localStackStarted = false;
}

function removeGeneratedConfig() {
  if (generatedConfig && fs.existsSync(configPath)) {
    fs.rmSync(configPath);
  }
  generatedConfig = false;
}

function localEnvironment() {
  const status = runNodeScript(supabaseCli, ["status", "--output", "json"]);
  requireSuccess(status, "Supabase local status");
  const values = JSON.parse(status.stdout);
  const apiUrl = values.API_URL;
  const anonKey = values.ANON_KEY;
  const serviceRoleKey = values.SERVICE_ROLE_KEY;
  if (!apiUrl || !anonKey || !serviceRoleKey) {
    throw new Error("Supabase local status omitted required runtime values.");
  }

  return {
    ...process.env,
    E2E_BASE_URL: "http://127.0.0.1:3100",
    AUDIT_SUPABASE_URL: apiUrl,
    AUDIT_SUPABASE_ANON_KEY: anonKey,
    NEXT_PUBLIC_SUPABASE_URL: apiUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3100",
    NEXT_PUBLIC_ENABLE_GOOGLE_AUTH: "false",
    NEXT_PUBLIC_SENTRY_DSN: "",
    SENTRY_DSN: "",
    SENTRY_AUTH_TOKEN: "",
    SENTRY_ORG: "",
    SENTRY_PROJECT: "",
  };
}

try {
  process.stdout.write("Preparing isolated local Supabase E2E environment...\n");
  createIsolatedConfig();

  startLocalStack();
  const environment = localEnvironment();

  if (process.env.E2E_REUSE_LOCAL_BUILD !== "true") {
    process.stdout.write("Building the app with isolated local public configuration...\n");
    stopLocalStack({ preserveData: true });
    const build = runNodeScript(nextCli, ["build"], { env: environment });
    requireSuccess(build, "Local E2E production build");
    startLocalStack();
  }

  process.stdout.write("Running Playwright journeys against local services only...\n");
  const result = runNodeScript(playwrightCli, ["test"], {
    env: environment,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
  }
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Local E2E execution failed."}\n`,
  );
  process.exitCode = 1;
} finally {
  stopLocalStack();
  removeGeneratedConfig();
}
