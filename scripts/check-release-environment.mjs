const production = process.env.VERCEL_ENV === "production";

if (!production) {
  console.log("Production environment identity gate skipped outside production.");
  process.exit(0);
}

const failures = [];
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
const release =
  process.env.SENTRY_RELEASE?.trim() ||
  process.env.NEXT_PUBLIC_SENTRY_RELEASE?.trim();
const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim();

let appHost = "";
try {
  const url = new URL(appUrl ?? "");
  appHost = url.hostname.toLowerCase();
  if (url.protocol !== "https:") failures.push("NEXT_PUBLIC_APP_URL must use HTTPS.");
} catch {
  failures.push("NEXT_PUBLIC_APP_URL must be a valid absolute URL.");
}

if (
  !appHost ||
  appHost === "localhost" ||
  appHost.endsWith(".invalid") ||
  appHost.endsWith(".vercel.app")
) {
  failures.push("NEXT_PUBLIC_APP_URL must use an owned production hostname.");
}

if (
  !supportEmail ||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail) ||
  supportEmail.endsWith("@example.invalid")
) {
  failures.push("NEXT_PUBLIC_SUPPORT_EMAIL must use a verified sender domain.");
}

for (const name of [
  "NEXT_PUBLIC_SENTRY_DSN",
  "SENTRY_AUTH_TOKEN",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
]) {
  if (!process.env[name]?.trim()) failures.push(`${name} is required in production.`);
}

if (!commitSha) failures.push("VERCEL_GIT_COMMIT_SHA is required in production.");
if (!release) failures.push("SENTRY_RELEASE is required in production.");
if (release && commitSha && release !== commitSha) {
  failures.push("SENTRY_RELEASE must equal VERCEL_GIT_COMMIT_SHA.");
}

if (failures.length) {
  console.error("Production environment identity gate failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Production environment identity gate passed.");
