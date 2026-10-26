import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { extname, join, resolve } from "node:path";

const workspace = resolve(process.env.GITHUB_WORKSPACE || process.cwd());
const nativeRoot = join(workspace, "native");
const gradle = "C:\\Gradle\\gradle-9.3.1\\bin\\gradle.bat";
const artifactLog = join(nativeRoot, "native-artifact-build.log");
const pathLog = join(nativeRoot, "native-artifact-paths.log");

function fail(message) {
  throw new Error(message);
}

function findArtifacts(root, extension) {
  if (!existsSync(root)) return [];

  const results = [];
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(fullPath);
      } else if (entry.isFile() && extname(entry.name).toLowerCase() === extension) {
        const stats = statSync(fullPath);
        if (stats.size > 0) results.push({ fullPath, stats });
      }
    }
  }

  return results.sort((left, right) => right.stats.mtimeMs - left.stats.mtimeMs);
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

try {
  if (!existsSync(nativeRoot) || !statSync(nativeRoot).isDirectory()) {
    fail(`Native workspace was not found: ${nativeRoot}`);
  }
  if (!existsSync(gradle) || !statSync(gradle).isFile()) {
    fail(`Gradle executable was not found: ${gradle}`);
  }

  const gradleArgs = [
    ":androidApp:prepareDebugApkForCi",
    ":androidApp:prepareReleaseBundleForCi",
    "--rerun-tasks",
    "--no-build-cache",
    "--stacktrace",
  ];
  const result = spawnSync(gradle, gradleArgs, {
    cwd: nativeRoot,
    encoding: "utf8",
    maxBuffer: 200 * 1024 * 1024,
    shell: true,
    windowsHide: true,
  });

  const buildOutput = `${result.stdout || ""}${result.stderr || ""}`;
  writeFileSync(artifactLog, buildOutput, "utf8");
  process.stdout.write(buildOutput);

  if (result.error) fail(`Unable to run Gradle: ${result.error.message}`);
  if (result.status !== 0) {
    fail(`Deterministic APK/AAB preparation failed with exit code ${result.status}.`);
  }

  const apkSourceRoot = join(nativeRoot, "androidApp", "build", "ci-artifacts", "debug");
  const aabSourceRoot = join(nativeRoot, "androidApp", "build", "ci-artifacts", "release");
  const apkCandidates = findArtifacts(apkSourceRoot, ".apk");
  const aabCandidates = findArtifacts(aabSourceRoot, ".aab");

  const pathRows = [...apkCandidates, ...aabCandidates].map(
    ({ fullPath, stats }) => `${stats.mtime.toISOString()}\t${stats.size}\t${fullPath}`,
  );
  writeFileSync(pathLog, `${pathRows.join("\n")}${pathRows.length ? "\n" : ""}`, "utf8");

  if (apkCandidates.length !== 1) {
    fail(`Expected exactly one debug APK under ${apkSourceRoot} but found ${apkCandidates.length}.`);
  }
  if (aabCandidates.length !== 1) {
    fail(`Expected exactly one release AAB under ${aabSourceRoot} but found ${aabCandidates.length}.`);
  }

  const shaValue = (process.env.PR_HEAD_SHA || process.env.GITHUB_SHA || "unknown").trim() || "unknown";
  const shortSha = shaValue.slice(0, 12);
  const deviceBuild = join(nativeRoot, "device-build");
  const releaseBuild = join(nativeRoot, "release-build");

  rmSync(deviceBuild, { recursive: true, force: true });
  rmSync(releaseBuild, { recursive: true, force: true });
  mkdirSync(deviceBuild, { recursive: true });
  mkdirSync(releaseBuild, { recursive: true });

  const apkTarget = join(deviceBuild, `jalvoro-personal-device-test-${shortSha}.apk`);
  const aabTarget = join(releaseBuild, `jalvoro-personal-release-${shortSha}.aab`);
  copyFileSync(apkCandidates[0].fullPath, apkTarget);
  copyFileSync(aabCandidates[0].fullPath, aabTarget);

  for (const target of [apkTarget, aabTarget]) {
    if (!existsSync(target) || !statSync(target).isFile()) fail(`Prepared artifact is missing: ${target}`);
    if (statSync(target).size <= 0) fail(`Prepared artifact is empty: ${target}`);
  }

  writeFileSync(
    join(deviceBuild, "SHA256SUMS.txt"),
    `${sha256(apkTarget)} *${apkTarget.split(/[\\/]/).pop()}\n`,
    "ascii",
  );
  writeFileSync(
    join(releaseBuild, "SHA256SUMS.txt"),
    `${sha256(aabTarget)} *${aabTarget.split(/[\\/]/).pop()}\n`,
    "ascii",
  );

  console.log(`Prepared APK: ${apkTarget}`);
  console.log(`Prepared AAB: ${aabTarget}`);
} catch (error) {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}
