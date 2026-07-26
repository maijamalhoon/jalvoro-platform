import { describe, expect, it } from "vitest";

import {
  MUTATION_ROUTE_CONTRACTS,
  validateMutationRequest,
} from "./request-guard";

function request(
  pathname: string,
  overrides: Partial<Parameters<typeof validateMutationRequest>[0]> = {},
) {
  return {
    method: "POST",
    pathname,
    origin: "https://jalvoro.example",
    expectedOrigin: "https://jalvoro.example",
    fetchSite: "same-origin",
    contentType: "application/json; charset=utf-8",
    contentLength: "128",
    ...overrides,
  };
}

describe("mutation request security contract", () => {
  it.each(MUTATION_ROUTE_CONTRACTS)(
    "blocks cross-origin requests for $prefix",
    ({ prefix }) => {
      expect(
        validateMutationRequest(
          request(prefix, { origin: "https://attacker.example" }),
        ),
      ).toMatchObject({ status: 403, code: "invalid_origin" });
    },
  );

  it.each(MUTATION_ROUTE_CONTRACTS)(
    "blocks cross-site browser requests for $prefix",
    ({ prefix }) => {
      expect(
        validateMutationRequest(request(prefix, { fetchSite: "cross-site" })),
      ).toMatchObject({ status: 403, code: "cross_site_request_blocked" });
    },
  );

  it.each(MUTATION_ROUTE_CONTRACTS)(
    "requires JSON for $prefix",
    ({ prefix }) => {
      expect(
        validateMutationRequest(request(prefix, { contentType: "text/plain" })),
      ).toMatchObject({ status: 415, code: "unsupported_media_type" });
    },
  );

  it.each(MUTATION_ROUTE_CONTRACTS)(
    "enforces request size for $prefix",
    ({ prefix, maxBytes }) => {
      expect(
        validateMutationRequest(
          request(prefix, { contentLength: String(maxBytes + 1) }),
        ),
      ).toMatchObject({ status: 413, code: "payload_too_large" });
    },
  );

  it("allows bodyless DELETE requests and non-browser authenticated clients", () => {
    expect(
      validateMutationRequest(
        request("/api/ai-insights/saved", {
          method: "DELETE",
          origin: null,
          fetchSite: null,
          contentType: null,
          contentLength: null,
        }),
      ),
    ).toBeNull();
  });

  it("does not apply API mutation rules to reads or pages", () => {
    expect(validateMutationRequest(request("/api/categories", { method: "GET" }))).toBeNull();
    expect(validateMutationRequest(request("/settings", { method: "POST" }))).toBeNull();
  });
});
