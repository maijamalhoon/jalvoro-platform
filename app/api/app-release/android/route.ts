import { NextResponse } from "next/server";

import {
  ANDROID_RELEASE_FALLBACK,
  type AndroidRelease,
} from "@/lib/app-release";

type GitHubReleaseAsset = {
  name: string;
  browser_download_url: string;
  size: number;
};

type GitHubRelease = {
  tag_name: string;
  html_url: string;
  published_at: string | null;
  draft: boolean;
  prerelease: boolean;
  assets: GitHubReleaseAsset[];
};

const RELEASES_API =
  "https://api.github.com/repos/maijamalhoon/jalvoro-platform/releases?per_page=20";

function normalizeVersion(tagName: string) {
  return tagName.trim().replace(/^v/i, "");
}

function pickApkAsset(release: GitHubRelease, version: string) {
  const assets = release.assets.filter((asset) =>
    asset.name.toLowerCase().endsWith(".apk"),
  );

  return (
    assets.find(
      (asset) => asset.name.toLowerCase() === "jamals-finance-latest.apk",
    ) ??
    assets.find(
      (asset) =>
        asset.name.toLowerCase() ===
        `jamals-finance-v${version}.apk`.toLowerCase(),
    ) ??
    assets[0]
  );
}

function responseFor(release: AndroidRelease, source: "github" | "fallback") {
  return NextResponse.json(
    { ...release, source },
    {
      headers: {
        "Cache-Control":
          "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function GET() {
  try {
    const response = await fetch(RELEASES_API, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "JALVORO-App-Release-Resolver",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return responseFor(ANDROID_RELEASE_FALLBACK, "fallback");
    }

    const releases = (await response.json()) as GitHubRelease[];
    const selected = releases.find((release) => {
      if (release.draft || release.prerelease) return false;
      const version = normalizeVersion(release.tag_name);
      return Boolean(version && pickApkAsset(release, version));
    });

    if (!selected) {
      return responseFor(ANDROID_RELEASE_FALLBACK, "fallback");
    }

    const version = normalizeVersion(selected.tag_name);
    const apk = pickApkAsset(selected, version);

    if (!version || !apk?.browser_download_url) {
      return responseFor(ANDROID_RELEASE_FALLBACK, "fallback");
    }

    const isKnownFallbackVersion =
      version === ANDROID_RELEASE_FALLBACK.version;

    const release: AndroidRelease = {
      version,
      versionCode: isKnownFallbackVersion
        ? ANDROID_RELEASE_FALLBACK.versionCode
        : 0,
      apkUrl: apk.browser_download_url,
      releaseUrl: selected.html_url,
      sha256: isKnownFallbackVersion
        ? ANDROID_RELEASE_FALLBACK.sha256
        : "",
      fileSizeBytes: apk.size,
      minimumAndroid: ANDROID_RELEASE_FALLBACK.minimumAndroid,
      publishedAt:
        selected.published_at?.slice(0, 10) ??
        ANDROID_RELEASE_FALLBACK.publishedAt,
    };

    return responseFor(release, "github");
  } catch {
    return responseFor(ANDROID_RELEASE_FALLBACK, "fallback");
  }
}
