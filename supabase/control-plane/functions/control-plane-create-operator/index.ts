import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.108.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function randomToken(byteLength: number) {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function cleanEmail(value: unknown) {
  if (typeof value !== "string") return "";
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : "";
}

function cleanRole(value: unknown) {
  return value === "admin" || value === "analyst" || value === "support"
    ? value
    : null;
}

function cleanExpiry(value: unknown) {
  const hours = Number(value);
  return Number.isInteger(hours) && hours >= 1 && hours <= 168 ? hours : 72;
}

function isExistingUserError(message: string | undefined) {
  const value = message?.toLowerCase() ?? "";
  return value.includes("already") || value.includes("exists") || value.includes("registered");
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "authentication_required" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKeys = JSON.parse(
    Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}",
  ) as Record<string, string>;
  const publishableKey =
    publishableKeys.default || Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return json({ error: "control_plane_configuration_unavailable" }, 503);
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authorization.slice("Bearer ".length);
  const userResult = await userClient.auth.getUser(token);
  if (userResult.error || !userResult.data.user) {
    return json({ error: "authentication_required" }, 401);
  }

  const accessResult = await userClient.rpc("get_my_control_plane_access");
  const access = accessResult.data as
    | { role?: unknown; isRootOwner?: unknown; sessionAssurance?: unknown }
    | null;
  if (
    accessResult.error ||
    access?.role !== "owner" ||
    access?.isRootOwner !== true ||
    access?.sessionAssurance !== "aal2"
  ) {
    return json({ error: "root_owner_reauthentication_required" }, 403);
  }

  const body = await request.json().catch(() => null) as
    | Record<string, unknown>
    | null;
  const email = cleanEmail(body?.email);
  const role = cleanRole(body?.role);
  const expiresInHours = cleanExpiry(body?.expiresInHours);
  if (!email || !role) {
    return json({ error: "invalid_operator_invitation" }, 400);
  }

  const invitationToken = randomToken(32);
  const tokenSha256 = await sha256Hex(invitationToken);
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let existingUserId = "";
  const perPage = 100;
  for (let page = 1; page <= 10; page += 1) {
    const usersResult = await adminClient.auth.admin.listUsers({ page, perPage });
    if (usersResult.error) {
      return json({ error: "operator_directory_unavailable" }, 503);
    }
    const existingUser = usersResult.data.users.find(
      (candidate) => candidate.email?.trim().toLowerCase() === email,
    );
    if (existingUser) {
      existingUserId = existingUser.id;
      break;
    }
    if (usersResult.data.users.length < perPage) break;
    if (page === 10) {
      return json({ error: "operator_directory_limit_reached" }, 503);
    }
  }

  let accountCreated = false;
  let createdUserId = "";
  let authTokenHash = "";
  if (!existingUserId) {
    const authLinkResult = await adminClient.auth.admin.generateLink({
      type: "invite",
      email,
      options: { data: { control_plane_invited: true } },
    });

    if (authLinkResult.error) {
      if (!isExistingUserError(authLinkResult.error.message)) {
        return json({ error: "operator_account_creation_failed" }, 400);
      }
    } else {
      createdUserId = authLinkResult.data.user?.id ?? "";
      const properties = authLinkResult.data.properties as
        | { hashed_token?: unknown }
        | null;
      authTokenHash =
        typeof properties?.hashed_token === "string"
          ? properties.hashed_token
          : "";
      accountCreated = Boolean(createdUserId && authTokenHash);
      if (!accountCreated) {
        if (createdUserId) {
          await adminClient.auth.admin.deleteUser(createdUserId).catch(
            () => undefined,
          );
        }
        return json({ error: "operator_account_creation_failed" }, 500);
      }
    }
  }

  const invitationResult = await userClient.rpc(
    "create_control_plane_invitation",
    {
      p_email: email,
      p_role: role,
      p_token_sha256: tokenSha256,
      p_expires_in_hours: expiresInHours,
    },
  );

  if (invitationResult.error || !invitationResult.data) {
    if (accountCreated && createdUserId) {
      await adminClient.auth.admin.deleteUser(createdUserId).catch(
        () => undefined,
      );
    }
    return json({ error: "operator_invitation_creation_failed" }, 400);
  }

  return json({
    invitation: invitationResult.data,
    invitationToken,
    accountCreated,
    authTokenHash: accountCreated ? authTokenHash : null,
  });
});
