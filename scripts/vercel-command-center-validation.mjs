import { spawnSync } from "node:child_process";

const releaseCandidateBranches = new Set([
  "design/command-center-decision-first-overview",
  "release/global-command-center-freeze-20260725",
]);
const shouldRunReleaseChecks = releaseCandidateBranches.has(
  process.env.VERCEL_GIT_COMMIT_REF ?? "",
);
const commands = [
  ...(shouldRunReleaseChecks ? [["npm", ["run", "check"]]] : []),
  ["npm", ["run", "build"]],
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
