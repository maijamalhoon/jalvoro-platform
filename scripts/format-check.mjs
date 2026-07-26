import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { spawnSync } from "node:child_process";

const tracked = spawnSync("git", ["ls-files", "-z"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});

if (tracked.error || tracked.status !== 0) {
  console.error("Could not enumerate tracked files for formatting checks.");
  process.exit(tracked.status ?? 1);
}

const checkedExtensions = new Set([
  ".cjs",
  ".css",
  ".js",
  ".json",
  ".jsx",
  ".mjs",
  ".sql",
  ".ts",
  ".tsx",
]);

const violations = [];
for (const path of tracked.stdout.split("\0").filter(Boolean)) {
  if (!checkedExtensions.has(extname(path))) continue;

  const content = readFileSync(path);
  if (content.includes(0)) continue;
  const text = content.toString("utf8");

  if (text.includes("\r")) {
    violations.push(`${path}: CRLF line endings`);
  }

  text.split("\n").forEach((line, index) => {
    if (/[ \t]+$/.test(line)) {
      violations.push(`${path}:${index + 1}: trailing whitespace`);
    }
  });
}

if (violations.length) {
  console.error("Formatting check failed:");
  violations.slice(0, 100).forEach((violation) => console.error(`- ${violation}`));
  if (violations.length > 100) {
    console.error(`- ...and ${violations.length - 100} more`);
  }
  process.exit(1);
}

console.log("Formatting check passed for tracked source and configuration files.");
