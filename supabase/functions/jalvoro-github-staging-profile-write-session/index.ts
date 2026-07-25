import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import postgres from "postgres";

const EXPECTED_ISSUER = "https://token.actions.githubusercontent.com";
const EXPECTED_AUDIENCE = "jalvoro-staging-profile-write-smoke";
const EXPECTED_REPOSITORY = "maijamalhoon/jalvoro-platform";
const EXPECTED_SUBJECT = "repo:maijamalhoon@150429791/jalvoro-platform@1269849875:environment:staging";
const EXPECTED_REF = "refs/heads/agent/idempotent-organization-profile-command";
const EXPECTED_WORKFLOW_REF = `${EXPECTED_REPOSITORY}/.github/workflows/dotnet-staging-organization-profile-write-smoke.yml@${EXPECTED_REF}`;
const EXPECTED_ACTOR = "maijamalhoon";
const EXPECTED_EVENT = "workflow_dispatch";
const EMAIL_SECRET_NAME = "jalvoro_staging_smoke_email";
const PASSWORD_SECRET_NAME = "jalvoro_staging_smoke_password";
const MAX_TOKEN_LIFETIME_SECONDS = 600;
const githubJwks = createRemoteJWKSet(
  new URL("https://token.actions.githubusercontent.com/.well-known/jwks"),
);

function json(
  status: number,
  code: string,
  payload: Record<string, unknown> = {},
) {
  return Response.json({ code, ...payload }, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function claim(payload: JWTPayload, name: string): string {
  const value = payload[name];
  return typeof value === "string" ? value : "";
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json(405, "method_not_allowed");

  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return json(401, "missing_github_oidc_token");
  }

  const token = authorization.slice(7).trim();
  if (!token) return json(401, "missing_github_oidc_token");

  let payload: JWTPayload;
  try {
    payload = (await jwtVerify(token, githubJwks, {
      issuer: EXPECTED_ISSUER,
      audience: EXPECTED_AUDIENCE,
      algorithms: ["RS256"],
    })).payload;
  } catch {
    return json(401, "invalid_github_oidc_token");
  }

  const now = Math.floor(Date.now() / 1000);
  const workflowRef = claim(payload, "workflow_ref") ||
    claim(payload, "job_workflow_ref");
  const jti = claim(payload, "jti");
  const runId = claim(payload, "run_id");

  if (
    payload.sub !== EXPECTED_SUBJECT ||
    claim(payload, "repository") !== EXPECTED_REPOSITORY ||
    claim(payload, "environment") !== "staging" ||
    claim(payload, "ref") !== EXPECTED_REF ||
    workflowRef !== EXPECTED_WORKFLOW_REF ||
    claim(payload, "actor") !== EXPECTED_ACTOR ||
    claim(payload, "event_name") !== EXPECTED_EVENT ||
    !jti ||
    !runId ||
    typeof payload.exp !== "number" ||
    payload.exp <= now ||
    payload.exp > now + MAX_TOKEN_LIFETIME_SECONDS
  ) {
    return json(403, "github_oidc_claims_rejected");
  }

  const databaseUrl = Deno.env.get("SUPABASE_DB_URL");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKeysJson = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (!databaseUrl || !supabaseUrl || !publishableKeysJson) {
    return json(503, "staging_runtime_not_configured");
  }

  let publishableKey = "";
  try {
    const keys = JSON.parse(publishableKeysJson) as Record<string, unknown>;
    publishableKey = typeof keys.default === "string" ? keys.default : "";
  } catch {
    return json(503, "publishable_key_configuration_invalid");
  }

  if (!publishableKey.startsWith("sb_publishable_")) {
    return json(503, "publishable_key_configuration_invalid");
  }

  const sql = postgres(databaseUrl, {
    prepare: false,
    max: 1,
    connect_timeout: 5,
    idle_timeout: 2,
  });

  try {
    await sql`
      delete from private.github_oidc_staging_smoke_replays
      where expires_at <= now()
    `;

    const replay = await sql<{ jti: string }[]>`
      insert into private.github_oidc_staging_smoke_replays (
        jti,
        expires_at,
        repository,
        workflow_ref,
        run_id
      ) values (
        ${jti},
        to_timestamp(${payload.exp}),
        ${EXPECTED_REPOSITORY},
        ${workflowRef},
        ${runId}
      )
      on conflict (jti) do nothing
      returning jti
    `;
    if (replay.length !== 1) return json(409, "github_oidc_token_replayed");

    const secrets = await sql<{ name: string; decrypted_secret: string }[]>`
      select name, decrypted_secret
      from vault.decrypted_secrets
      where name in (${EMAIL_SECRET_NAME}, ${PASSWORD_SECRET_NAME})
    `;
    const values = new Map(
      secrets.map((row) => [row.name, row.decrypted_secret]),
    );
    const email = values.get(EMAIL_SECRET_NAME) ?? "";
    const password = values.get(PASSWORD_SECRET_NAME) ?? "";
    if (!email || !password) return json(503, "staging_identity_secret_missing");

    const identities = await sql<{ user_id: string; tenant_id: string }[]>`
      select u.id::text as user_id, bm.business_id::text as tenant_id
      from auth.users u
      join public.business_members bm on bm.user_id = u.id
      where u.email = ${email}
        and bm.role = 'owner'
        and bm.status = 'active'
      order by bm.created_at asc
      limit 2
    `;
    if (identities.length !== 1) {
      return json(503, "staging_identity_membership_invalid");
    }

    const authResponse = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          apikey: publishableKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      },
    );
    if (!authResponse.ok) return json(502, "staging_authentication_failed");

    const body = await authResponse.json() as {
      access_token?: unknown;
      expires_in?: unknown;
      token_type?: unknown;
      user?: { id?: unknown };
    };
    const accessToken = typeof body.access_token === "string"
      ? body.access_token
      : "";
    const expiresIn = typeof body.expires_in === "number"
      ? body.expires_in
      : 0;
    const tokenType = typeof body.token_type === "string"
      ? body.token_type
      : "";
    const userId = typeof body.user?.id === "string" ? body.user.id : "";

    if (
      !accessToken ||
      expiresIn < 60 ||
      expiresIn > 3600 ||
      tokenType.toLowerCase() !== "bearer" ||
      userId !== identities[0].user_id
    ) {
      return json(502, "staging_session_contract_invalid");
    }

    return json(200, "session_issued", {
      access_token: accessToken,
      expires_in: expiresIn,
      token_type: "bearer",
      user_id: identities[0].user_id,
      tenant_id: identities[0].tenant_id,
      publishable_key: publishableKey,
    });
  } catch {
    return json(503, "staging_session_broker_unavailable");
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
});
