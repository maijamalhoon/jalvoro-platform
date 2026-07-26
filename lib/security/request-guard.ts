export const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const MUTATION_ROUTE_CONTRACTS = [
  { prefix: "/api/ai-insights", format: "json", maxBytes: 64 * 1024 },
  { prefix: "/api/business/team/invite", format: "json", maxBytes: 64 * 1024 },
  { prefix: "/api/categories", format: "json", maxBytes: 64 * 1024 },
  { prefix: "/api/native/ai-insights", format: "json", maxBytes: 64 * 1024 },
  { prefix: "/api/security/password-check", format: "json", maxBytes: 16 * 1024 },
  { prefix: "/api/telemetry", format: "json", maxBytes: 16 * 1024 },
] as const;

const DEFAULT_MUTATION_MAX_BYTES = 10 * 1024 * 1024;

export type MutationRequestMetadata = {
  method: string;
  pathname: string;
  origin: string | null;
  expectedOrigin: string;
  fetchSite: string | null;
  contentType: string | null;
  contentLength: string | null;
};

export type MutationRequestViolation = {
  status: 400 | 403 | 413 | 415;
  error: string;
  code:
    | "invalid_content_length"
    | "invalid_origin"
    | "cross_site_request_blocked"
    | "unsupported_media_type"
    | "payload_too_large";
};

function routeContract(pathname: string) {
  return MUTATION_ROUTE_CONTRACTS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function validateMutationRequest(
  request: MutationRequestMetadata,
): MutationRequestViolation | null {
  if (
    !request.pathname.startsWith("/api/") ||
    !STATE_CHANGING_METHODS.has(request.method.toUpperCase())
  ) {
    return null;
  }

  if (request.origin && request.origin !== request.expectedOrigin) {
    return {
      status: 403,
      error: "Request origin is not allowed",
      code: "invalid_origin",
    };
  }

  if (
    request.fetchSite &&
    request.fetchSite !== "same-origin" &&
    request.fetchSite !== "none"
  ) {
    return {
      status: 403,
      error: "Cross-site request blocked",
      code: "cross_site_request_blocked",
    };
  }

  let contentLength: number | null = null;
  if (request.contentLength !== null) {
    contentLength = Number(request.contentLength);
    if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
      return {
        status: 400,
        error: "Content length is invalid",
        code: "invalid_content_length",
      };
    }
  }

  const contract = routeContract(request.pathname);
  const maxBytes = contract?.maxBytes ?? DEFAULT_MUTATION_MAX_BYTES;
  if (contentLength !== null && contentLength > maxBytes) {
    return {
      status: 413,
      error: "Request is too large",
      code: "payload_too_large",
    };
  }

  const carriesBody =
    request.method !== "DELETE" || (contentLength !== null && contentLength > 0);
  if (
    contract?.format === "json" &&
    carriesBody &&
    !request.contentType?.toLowerCase().startsWith("application/json")
  ) {
    return {
      status: 415,
      error: "JSON content is required",
      code: "unsupported_media_type",
    };
  }

  return null;
}
