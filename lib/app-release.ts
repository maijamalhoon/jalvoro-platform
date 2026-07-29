export type AndroidRelease = {
  version: string;
  versionCode: number;
  apkUrl: string;
  releaseUrl: string;
  sha256: string;
  fileSizeBytes: number;
  minimumAndroid: string;
  publishedAt: string;
};

export const ANDROID_RELEASE_FALLBACK: AndroidRelease = {
  version: "1.0.1",
  versionCode: 2,
  apkUrl:
    "https://github.com/maijamalhoon/jalvoro-platform/releases/download/v1.0.1/jamals-finance-v1.0.1.apk",
  releaseUrl:
    "https://github.com/maijamalhoon/jalvoro-platform/releases/tag/v1.0.1",
  sha256: "80da1813b6d787ba37b58f9d76395f6d6eb036e84c8518934ec8b219cc0fd8f3",
  fileSizeBytes: 1084893,
  minimumAndroid: "Android 6",
  publishedAt: "2026-07-21",
};

export function compareVersions(left: string, right: string) {
  const leftParts = left.split(".").map((part) => Number(part) || 0);
  const rightParts = right.split(".").map((part) => Number(part) || 0);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;

    if (leftPart > rightPart) return 1;
    if (leftPart < rightPart) return -1;
  }

  return 0;
}
