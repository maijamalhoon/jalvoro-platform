const DEFAULT_READINESS_TIMEOUT_MS = 2_500;

type ReadinessEnvironment = {
  NEXT_PUBLIC_APP_VERSION?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  VERCEL_GIT_COMMIT_SHA?: string;
};

type ReadinessOptions = {
  environment?: ReadinessEnvironment;
  fetcher?: typeof fetch;
  timeoutMs?: number;
};

export function getReleaseVersion(
  environment: ReadinessEnvironment = process.env as ReadinessEnvironment,
) {
  return (
    environment.VERCEL_GIT_COMMIT_SHA?.trim() ||
    environment.NEXT_PUBLIC_APP_VERSION?.trim() ||
    "development"
  );
}

export async function checkDataLayerReadiness({
  environment = process.env as ReadinessEnvironment,
  fetcher = fetch,
  timeoutMs = DEFAULT_READINESS_TIMEOUT_MS,
}: ReadinessOptions = {}) {
  const supabaseUrl = environment.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey =
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey || timeoutMs <= 0) {
    return false;
  }

  let endpoint: URL;

  try {
    const configuredUrl = new URL(supabaseUrl);

    if (
      configuredUrl.protocol !== "https:" ||
      configuredUrl.username ||
      configuredUrl.password
    ) {
      return false;
    }

    endpoint = new URL("/rest/v1/", configuredUrl);
  } catch {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/openapi+json",
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    await response.body?.cancel().catch(() => undefined);

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
