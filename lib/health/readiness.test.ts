import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as getHealth } from "@/app/api/health/route";
import { GET as getReadiness } from "@/app/api/readiness/route";

import {
  checkDataLayerReadiness,
  getReleaseVersion,
} from "./readiness";

const environment = {
  NEXT_PUBLIC_APP_VERSION: undefined,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  VERCEL_GIT_COMMIT_SHA: "release-sha",
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("release health", () => {
  it("reports the immutable deployment SHA when available", () => {
    expect(getReleaseVersion(environment)).toBe("release-sha");
    expect(
      getReleaseVersion({
        ...environment,
        NEXT_PUBLIC_APP_VERSION: "fallback-version",
        VERCEL_GIT_COMMIT_SHA: " ",
      }),
    ).toBe("fallback-version");
  });

  it("fails closed without a secure data-layer configuration", async () => {
    const fetcher = vi.fn<typeof fetch>();

    await expect(
      checkDataLayerReadiness({
        environment: {
          ...environment,
          NEXT_PUBLIC_SUPABASE_URL: "http://project.supabase.co",
        },
        fetcher,
      }),
    ).resolves.toBe(false);

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("performs a bounded, non-cached Supabase gateway probe", async () => {
    const cancel = vi.fn().mockResolvedValue(undefined);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue({
      body: { cancel },
      ok: true,
    } as unknown as Response);

    await expect(
      checkDataLayerReadiness({ environment, fetcher }),
    ).resolves.toBe(true);

    expect(fetcher).toHaveBeenCalledOnce();

    const [endpoint, init] = fetcher.mock.calls[0];
    expect(endpoint.toString()).toBe("https://project.supabase.co/rest/v1/");
    expect(init).toMatchObject({
      cache: "no-store",
      headers: {
        Accept: "application/openapi+json",
        Authorization: "Bearer public-anon-key",
        apikey: "public-anon-key",
      },
      method: "GET",
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("reports provider rejection and network failure as unavailable", async () => {
    const rejectedResponse = vi.fn<typeof fetch>().mockResolvedValue({
      body: null,
      ok: false,
    } as Response);
    const failedRequest = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("provider unavailable"));

    await expect(
      checkDataLayerReadiness({
        environment,
        fetcher: rejectedResponse,
      }),
    ).resolves.toBe(false);
    await expect(
      checkDataLayerReadiness({
        environment,
        fetcher: failedRequest,
      }),
    ).resolves.toBe(false);
  });

  it("serves independent liveness with immutable release visibility", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "deployed-sha");

    const response = await getHealth();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "no-store, max-age=0",
    );
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      version: "deployed-sha",
    });
  });

  it("returns sanitized readiness and a failure status when data is unavailable", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "deployed-sha");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "must-not-leak");
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockRejectedValue(new Error("private failure")),
    );

    const response = await getReadiness();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      checks: {
        application: "ok",
        dataLayer: "unavailable",
      },
      status: "unavailable",
      version: "deployed-sha",
    });
    expect(JSON.stringify(body)).not.toContain("must-not-leak");
    expect(JSON.stringify(body)).not.toContain("private failure");
  });
});
