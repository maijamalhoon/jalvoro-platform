import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.108.1";

type JsonRecord = Record<string, unknown>;
type ManagementAction =
  | "snapshot"
  | "enroll_device"
  | "revoke_device"
  | "issue_temporary_pin"
  | "revoke_credential"
  | "revoke_session"
  | "decide_approval";
type KioskAction =
  | "start_session"
  | "change_pin"
  | "end_session"
  | "terminal_snapshot"
  | "request_approval"
  | "post_sale"
  | "post_operation";
type Action = ManagementAction | KioskAction;

const MANAGEMENT_ACTIONS = new Set<ManagementAction>([
  "snapshot",
  "enroll_device",
  "revoke_device",
  "issue_temporary_pin",
  "revoke_credential",
  "revoke_session",
  "decide_approval",
]);
const KIOSK_ACTIONS = new Set<KioskAction>([
  "start_session",
  "change_pin",
  "end_session",
  "terminal_snapshot",
  "request_approval",
  "post_sale",
  "post_operation",
]);
const PIN_REJECT_LIST = new Set([
  "000000",
  "111111",
  "222222",
  "333333",
  "444444",
  "555555",
  "666666",
  "777777",
  "888888",
  "999999",
  "123456",
  "654321",
  "121212",
  "112233",
  "123123",
]);
const DEVICE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_REQUEST_BYTES = 128 * 1024;

function cleanAction(value: unknown): Action | null {
  if (typeof value !== "string") return null;
  if (MANAGEMENT_ACTIONS.has(value as ManagementAction)) return value as ManagementAction;
  if (KIOSK_ACTIONS.has(value as KioskAction)) return value as KioskAction;
  return null;
}

function text(value: unknown, max = 300): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= max ? normalized : null;
}

function uuid(value: unknown): string | null {
  return typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function hashValue(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value)
    ? value.toLowerCase()
    : null;
}

function numeric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dateValue(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : value;
}

type PosSaleLine = {
  product_id: string;
  quantity: number;
  discount_percent: number;
  tax_rate: number;
};

function saleLines(value: unknown): PosSaleLine[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) return null;
  const seen = new Set<string>();
  const normalized: PosSaleLine[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const line = candidate as Record<string, unknown>;
    const productId = uuid(line.productId ?? line.product_id);
    const quantity = numeric(line.quantity);
    const discountPercent = numeric(line.discountPercent ?? line.discount_percent) ?? 0;
    const taxRate = numeric(line.taxRate ?? line.tax_rate) ?? 0;
    if (
      !productId || seen.has(productId) || !quantity || quantity <= 0 || quantity > 1_000_000 ||
      discountPercent < 0 || discountPercent > 100 || taxRate < 0 || taxRate > 100
    ) return null;
    seen.add(productId);
    normalized.push({
      product_id: productId,
      quantity,
      discount_percent: discountPercent,
      tax_rate: taxRate,
    });
  }
  return normalized;
}


type PosOperationType = "purchase" | "expense" | "refund" | "void" | "cash_adjustment";

type PosPurchaseLine = {
  product_id: string;
  quantity: number;
  discount_percent: number;
  tax_rate: number;
};

type PosRefundLine = {
  invoice_line_id: string;
  quantity: number;
};

function cleanOperationType(value: unknown): PosOperationType | null {
  return value === "purchase" || value === "expense" || value === "refund" ||
      value === "void" || value === "cash_adjustment"
    ? value
    : null;
}

function optionalUuid(value: unknown): string | null | undefined {
  if (value == null || value === "") return null;
  return uuid(value) ?? undefined;
}

function optionalText(value: unknown, max: number): string | null | undefined {
  if (value == null || value === "") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return text(value, max) ?? undefined;
}

function purchaseLines(value: unknown): PosPurchaseLine[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) return null;
  const seen = new Set<string>();
  const normalized: PosPurchaseLine[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const line = candidate as Record<string, unknown>;
    const productId = uuid(line.productId ?? line.product_id);
    const quantity = numeric(line.quantity);
    const discountPercent = numeric(line.discountPercent ?? line.discount_percent) ?? 0;
    const taxRate = numeric(line.taxRate ?? line.tax_rate) ?? 0;
    if (
      !productId || seen.has(productId) || !quantity || quantity <= 0 || quantity > 1_000_000 ||
      discountPercent < 0 || discountPercent > 100 || taxRate < 0 || taxRate > 100
    ) return null;
    seen.add(productId);
    normalized.push({
      product_id: productId,
      quantity,
      discount_percent: discountPercent,
      tax_rate: taxRate,
    });
  }
  return normalized;
}

function refundLines(value: unknown): PosRefundLine[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) return null;
  const seen = new Set<string>();
  const normalized: PosRefundLine[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const line = candidate as Record<string, unknown>;
    const invoiceLineId = uuid(line.invoiceLineId ?? line.invoice_line_id);
    const quantity = numeric(line.quantity);
    if (!invoiceLineId || seen.has(invoiceLineId) || !quantity || quantity <= 0 || quantity > 1_000_000) {
      return null;
    }
    seen.add(invoiceLineId);
    normalized.push({ invoice_line_id: invoiceLineId, quantity });
  }
  return normalized;
}

function operationPayload(
  operationType: PosOperationType,
  value: unknown,
): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;

  if (operationType === "purchase") {
    const purchaseDate = dateValue(payload.purchaseDate ?? payload.purchase_date);
    const supplierId = optionalUuid(payload.supplierId ?? payload.supplier_id);
    const supplierDocumentNumber = optionalText(
      payload.supplierDocumentNumber ?? payload.supplier_document_number,
      120,
    );
    const notes = optionalText(payload.notes, 300);
    const lines = purchaseLines(payload.lines);
    const paidNow = payload.paidNow ?? payload.paid_now;
    if (
      !purchaseDate || supplierId === undefined || supplierDocumentNumber === undefined ||
      notes === undefined || !lines || (paidNow != null && typeof paidNow !== "boolean")
    ) return null;
    return {
      purchase_date: purchaseDate,
      supplier_id: supplierId,
      supplier_document_number: supplierDocumentNumber,
      paid_now: paidNow !== false,
      notes,
      lines,
    };
  }

  if (operationType === "expense") {
    const expenseDate = dateValue(payload.expenseDate ?? payload.expense_date);
    const description = text(payload.description, 300);
    const amount = numeric(payload.amount);
    const reference = optionalText(payload.reference, 120);
    if (
      !expenseDate || !description || description.length < 2 || !amount || amount <= 0 ||
      amount > 1_000_000_000_000 || reference === undefined
    ) {
      return null;
    }
    return { expense_date: expenseDate, description, amount, reference };
  }

  if (operationType === "refund") {
    const returnDate = dateValue(payload.returnDate ?? payload.return_date);
    const invoiceId = uuid(payload.invoiceId ?? payload.invoice_id);
    const notes = optionalText(payload.notes, 300);
    const lines = refundLines(payload.lines);
    const refundCash = payload.refundCash ?? payload.refund_cash;
    if (
      !returnDate || !invoiceId || notes === undefined || !lines ||
      (refundCash != null && typeof refundCash !== "boolean")
    ) return null;
    return {
      return_date: returnDate,
      invoice_id: invoiceId,
      notes,
      refund_cash: refundCash !== false,
      lines,
    };
  }

  if (operationType === "void") {
    const voidDate = dateValue(payload.voidDate ?? payload.void_date);
    const invoiceId = uuid(payload.invoiceId ?? payload.invoice_id);
    const reason = text(payload.reason, 300);
    if (!voidDate || !invoiceId || !reason || reason.length < 5) return null;
    return { void_date: voidDate, invoice_id: invoiceId, reason };
  }

  const adjustmentDate = dateValue(payload.adjustmentDate ?? payload.adjustment_date);
  const direction = payload.direction === "increase" || payload.direction === "decrease"
    ? payload.direction
    : null;
  const amount = numeric(payload.amount);
  const reason = text(payload.reason, 300);
  if (
    !adjustmentDate || !direction || !amount || amount <= 0 ||
    amount > 1_000_000_000_000 || !reason || reason.length < 5
  ) {
    return null;
  }
  return { adjustment_date: adjustmentDate, direction, amount, reason };
}

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function randomIndex(upperExclusive: number): number {
  if (
    !Number.isSafeInteger(upperExclusive) ||
    upperExclusive < 2 ||
    upperExclusive > 256
  ) {
    throw new Error("invalid_secure_random_range");
  }

  const bucketSize = Math.floor(256 / upperExclusive);
  const acceptedRange = bucketSize * upperExclusive;
  for (let attempt = 0; attempt < 128; attempt += 1) {
    const value = randomBytes(1)[0];
    if (value < acceptedRange) return Math.floor(value / bucketSize);
  }

  throw new Error("secure_random_generation_failed");
}

function randomCode(prefix: string, length = 6): string {
  let result = `${prefix}-`;
  for (let index = 0; index < length; index += 1) {
    result += DEVICE_ALPHABET[randomIndex(DEVICE_ALPHABET.length)];
  }
  return result;
}

function temporaryPin(): string {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const pin = Array.from(
      { length: 6 },
      () => String(randomIndex(10)),
    ).join("");
    if (!PIN_REJECT_LIST.has(pin)) return pin;
  }
  throw new Error("secure_pin_generation_failed");
}

function validPin(value: unknown): value is string {
  return typeof value === "string" && /^[0-9]{6}$/u.test(value) && !PIN_REJECT_LIST.has(value);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function allowedOrigins(): Set<string> {
  return new Set(
    (Deno.env.get("APP_ALLOWED_ORIGINS") ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function corsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin ?? "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function response(origin: string | null, payload: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function rpcFailure(error: { code?: string; message?: string } | null): string {
  const code = error?.code ?? "";
  if (code === "42501") return "permission_denied";
  if (code === "P0002") return "record_not_found";
  if (code === "23505") return "already_exists";
  if (code === "POS01") return "pos_authentication_failed";
  if (code === "POS02") return "pos_session_unavailable";
  if (code === "POS03") return "current_pin_incorrect";
  if (code === "POS04") return "approval_unavailable";
  if (code === "POS05") return "pos_branch_configuration_missing";
  if (code === "22023") return "invalid_request";
  return "pos_security_operation_failed";
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin");
  const origins = allowedOrigins();
  if (origins.size === 0) {
    return response(origin, { error: "pos_security_origin_configuration_unavailable" }, 503);
  }
  if (origin && !origins.has(origin)) {
    return response(null, { error: "origin_not_allowed" }, 403);
  }
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") {
    return response(origin, { error: "method_not_allowed" }, 405);
  }
  const contentLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return response(origin, { error: "payload_too_large" }, 413);
  }
  const contentType = request.headers.get("Content-Type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return response(origin, { error: "json_content_required" }, 415);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return response(origin, { error: "authentication_header_required" }, 401);
  }

  const body = await request.json().catch(() => null) as JsonRecord | null;
  const action = cleanAction(body?.action);
  if (!body || !action) return response(origin, { error: "invalid_pos_security_request" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  let publishableKeys: Record<string, string> = {};
  try {
    publishableKeys = JSON.parse(
      Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}",
    ) as Record<string, string>;
  } catch {
    return response(origin, { error: "pos_security_configuration_unavailable" }, 503);
  }
  const publishableKey = publishableKeys.default || Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return response(origin, { error: "pos_security_configuration_unavailable" }, 503);
  }

  const callerClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (MANAGEMENT_ACTIONS.has(action as ManagementAction)) {
    const token = authorization.slice("Bearer ".length);
    const userResult = await callerClient.auth.getUser(token);
    if (userResult.error || !userResult.data.user) {
      return response(origin, { error: "authenticated_business_user_required" }, 401);
    }
    const actorId = userResult.data.user.id;
    const businessId = uuid(body.businessId);
    if (!businessId) return response(origin, { error: "invalid_business" }, 400);

    if (action === "snapshot") {
      const result = await callerClient.rpc("get_business_pos_security_snapshot", {
        p_business_id: businessId,
      });
      return result.error
        ? response(origin, { error: rpcFailure(result.error) }, 403)
        : response(origin, { ok: true, snapshot: result.data });
    }

    if (action === "enroll_device") {
      const branchId = uuid(body.branchId);
      const deviceName = text(body.deviceName, 80);
      if (!branchId || !deviceName) {
        return response(origin, { error: "branch_and_device_name_required" }, 400);
      }
      const deviceSecret = base64Url(randomBytes(32));
      const secretHash = await sha256(deviceSecret);
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const deviceCode = randomCode("POS");
        const result = await serviceClient.rpc("register_business_pos_device", {
          p_actor_user_id: actorId,
          p_business_id: businessId,
          p_branch_id: branchId,
          p_device_name: deviceName,
          p_device_code: deviceCode,
          p_secret_hash: secretHash,
        });
        if (!result.error) {
          return response(origin, {
            ok: true,
            device: {
              id: result.data,
              deviceCode,
              deviceSecret,
              shownOnce: true,
            },
          });
        }
        if (result.error.code !== "23505") {
          return response(origin, { error: rpcFailure(result.error) }, 403);
        }
      }
      return response(origin, { error: "unique_device_code_unavailable" }, 503);
    }

    if (action === "revoke_device") {
      const deviceId = uuid(body.deviceId);
      const reason = text(body.reason, 240) ?? "Device access revoked";
      if (!deviceId) return response(origin, { error: "invalid_device" }, 400);
      const result = await serviceClient.rpc("revoke_business_pos_device", {
        p_actor_user_id: actorId,
        p_business_id: businessId,
        p_device_id: deviceId,
        p_reason: reason,
      });
      return result.error
        ? response(origin, { error: rpcFailure(result.error) }, 403)
        : response(origin, { ok: true });
    }

    if (action === "issue_temporary_pin") {
      const targetUserId = uuid(body.targetUserId);
      if (!targetUserId) return response(origin, { error: "invalid_team_member" }, 400);
      const pin = temporaryPin();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const staffCode = randomCode("EMP");
        const result = await serviceClient.rpc("issue_business_pos_temporary_pin", {
          p_actor_user_id: actorId,
          p_business_id: businessId,
          p_target_user_id: targetUserId,
          p_staff_code: staffCode,
          p_pin: pin,
        });
        if (!result.error) {
          return response(origin, {
            ok: true,
            credential: { staffCode, temporaryPin: pin, mustChangePin: true, shownOnce: true },
          });
        }
        if (result.error.code !== "23505") {
          return response(origin, { error: rpcFailure(result.error) }, 403);
        }
      }
      return response(origin, { error: "unique_staff_code_unavailable" }, 503);
    }

    if (action === "revoke_credential") {
      const targetUserId = uuid(body.targetUserId);
      const reason = text(body.reason, 240) ?? "POS credential revoked";
      if (!targetUserId) return response(origin, { error: "invalid_team_member" }, 400);
      const result = await serviceClient.rpc("revoke_business_pos_credential", {
        p_actor_user_id: actorId,
        p_business_id: businessId,
        p_target_user_id: targetUserId,
        p_reason: reason,
      });
      return result.error
        ? response(origin, { error: rpcFailure(result.error) }, 403)
        : response(origin, { ok: true });
    }

    if (action === "revoke_session") {
      const sessionId = uuid(body.sessionId);
      const reason = text(body.reason, 240) ?? "POS session revoked";
      if (!sessionId) return response(origin, { error: "invalid_session" }, 400);
      const result = await serviceClient.rpc("revoke_business_pos_session", {
        p_actor_user_id: actorId,
        p_business_id: businessId,
        p_session_id: sessionId,
        p_reason: reason,
      });
      return result.error
        ? response(origin, { error: rpcFailure(result.error) }, 403)
        : response(origin, { ok: true });
    }

    const approvalId = uuid(body.approvalId);
    const decision = body.decision === "approved" || body.decision === "denied"
      ? body.decision
      : null;
    const reason = text(body.reason, 300);
    if (!approvalId || !decision || !reason || reason.length < 3) {
      return response(origin, { error: "approval_decision_and_reason_required" }, 400);
    }
    const result = await serviceClient.rpc("decide_business_pos_approval", {
      p_actor_user_id: actorId,
      p_business_id: businessId,
      p_approval_id: approvalId,
      p_decision: decision,
      p_reason: reason,
    });
    return result.error
      ? response(origin, { error: rpcFailure(result.error) }, 403)
      : response(origin, { ok: true, approval: result.data });
  }

  if (action === "start_session") {
    const businessSlug = text(body.businessSlug, 120);
    const deviceCode = text(body.deviceCode, 32);
    const deviceSecret = text(body.deviceSecret, 200);
    const staffCode = text(body.staffCode, 32);
    const pin = typeof body.pin === "string" ? body.pin : null;
    if (!businessSlug || !deviceCode || !deviceSecret || !staffCode || !pin) {
      return response(origin, { error: "pos_authentication_failed" }, 401);
    }
    const sessionToken = base64Url(randomBytes(32));
    const result = await serviceClient.rpc("start_business_pos_session", {
      p_business_slug: businessSlug,
      p_device_code: deviceCode,
      p_device_secret_hash: await sha256(deviceSecret),
      p_staff_code: staffCode,
      p_pin: pin,
      p_session_token_hash: await sha256(sessionToken),
      p_token_prefix: sessionToken.slice(0, 10),
      p_user_agent_hash: await sha256(request.headers.get("User-Agent") ?? "unknown"),
      p_ip_hash: await sha256(
        request.headers.get("CF-Connecting-IP") ??
          request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
          "unknown",
      ),
    });
    const session = result.data as ({ ok?: boolean } & JsonRecord) | null;
    return result.error || !session?.ok
      ? response(origin, { error: "pos_authentication_failed" }, 401)
      : response(origin, { ok: true, sessionToken, session });
  }

  const sessionToken = text(body.sessionToken, 200);
  if (!sessionToken) return response(origin, { error: "pos_session_unavailable" }, 401);
  const sessionHash = await sha256(sessionToken);

  if (action === "end_session") {
    const result = await serviceClient.rpc("end_business_pos_session", {
      p_session_token_hash: sessionHash,
    });
    return result.error
      ? response(origin, { error: rpcFailure(result.error) }, 403)
      : response(origin, { ok: true });
  }

  if (action === "change_pin") {
    const currentPin = typeof body.currentPin === "string" ? body.currentPin : null;
    const newPin = typeof body.newPin === "string" ? body.newPin : null;
    if (!currentPin || !newPin || !validPin(newPin)) {
      return response(origin, { error: "invalid_pin" }, 400);
    }
    const result = await serviceClient.rpc("change_business_pos_pin", {
      p_session_token_hash: sessionHash,
      p_current_pin: currentPin,
      p_new_pin: newPin,
    });
    return result.error
      ? response(origin, { error: rpcFailure(result.error) }, 403)
      : response(origin, { ok: true });
  }

  if (action === "terminal_snapshot") {
    const result = await serviceClient.rpc("get_business_pos_terminal_snapshot", {
      p_session_token_hash: sessionHash,
    });
    return result.error
      ? response(origin, { error: rpcFailure(result.error) }, 403)
      : response(origin, { ok: true, snapshot: result.data });
  }

  if (action === "post_operation") {
    const operationType = cleanOperationType(body.operationType ?? body.operation_type);
    const requestKey = uuid(body.requestKey ?? body.request_key);
    const approvalIdValue = body.approvalId ?? body.approval_id;
    const approvalId = approvalIdValue == null || approvalIdValue === "" ? null : uuid(approvalIdValue);
    const payload = operationType ? operationPayload(operationType, body.payload) : null;
    if (
      !operationType || !requestKey || !payload ||
      (approvalIdValue != null && approvalIdValue !== "" && !approvalId)
    ) {
      return response(origin, { error: "invalid_pos_operation_request" }, 400);
    }

    const result = await serviceClient.rpc("post_business_pos_operation", {
      p_session_token_hash: sessionHash,
      p_operation_type: operationType,
      p_payload: payload,
      p_request_key: requestKey,
      p_approval_id: approvalId,
    });
    if (result.error) {
      return response(origin, { error: rpcFailure(result.error) }, 403);
    }
    const operation = result.data as JsonRecord | null;
    if (operation?.approval_required === true) {
      return response(origin, {
        ok: false,
        approvalRequired: true,
        operationType: operation.operation_type,
        payloadHash: operation.payload_hash,
        requestId: operation.request_id,
        amount: operation.amount,
      }, 409);
    }
    if (operation?.ok !== true) {
      return response(origin, {
        error: typeof operation?.error === "string" ? operation.error : "pos_operation_rejected",
      }, 422);
    }
    return response(origin, { ok: true, operation });
  }

  if (action === "post_sale") {
    const saleDate = dateValue(body.saleDate ?? body.sale_date);
    const requestKey = uuid(body.requestKey ?? body.request_key);
    const lines = saleLines(body.lines);
    const customerIdValue = body.customerId ?? body.customer_id;
    const customerId = customerIdValue == null || customerIdValue === "" ? null : uuid(customerIdValue);
    const approvalIdValue = body.approvalId ?? body.approval_id;
    const approvalId = approvalIdValue == null || approvalIdValue === "" ? null : uuid(approvalIdValue);
    const paidNow = body.paidNow ?? body.paid_now;
    const notesValue = body.notes == null || body.notes === "" ? null : text(body.notes, 300);
    if (
      !saleDate || !requestKey || !lines ||
      (customerIdValue != null && customerIdValue !== "" && !customerId) ||
      (approvalIdValue != null && approvalIdValue !== "" && !approvalId) ||
      (paidNow != null && typeof paidNow !== "boolean") ||
      (body.notes != null && body.notes !== "" && !notesValue)
    ) {
      return response(origin, { error: "invalid_pos_sale_request" }, 400);
    }

    const result = await serviceClient.rpc("post_business_pos_sale", {
      p_session_token_hash: sessionHash,
      p_sale_date: saleDate,
      p_customer_id: customerId,
      p_lines: lines,
      p_paid_now: paidNow !== false,
      p_notes: notesValue,
      p_request_key: requestKey,
      p_approval_id: approvalId,
    });
    if (result.error) {
      return response(origin, { error: rpcFailure(result.error) }, 403);
    }
    const sale = result.data as JsonRecord | null;
    if (sale?.approval_required === true) {
      return response(origin, {
        ok: false,
        approvalRequired: true,
        operationType: sale.operation_type,
        payloadHash: sale.payload_hash,
        requestId: sale.request_id,
        amount: sale.amount,
        discountPercent: sale.discount_percent,
      }, 409);
    }
    if (sale?.ok !== true) {
      return response(origin, { error: typeof sale?.error === "string" ? sale.error : "pos_sale_rejected" }, 422);
    }
    return response(origin, { ok: true, sale });
  }

  const operationType = text(body.operationType, 40);
  const payloadHash = hashValue(body.payloadHash);
  const reason = text(body.reason, 300);
  if (!operationType || !payloadHash || !reason || reason.length < 5) {
    return response(origin, { error: "invalid_approval_request" }, 400);
  }
  const result = await serviceClient.rpc("create_business_pos_approval_request", {
    p_session_token_hash: sessionHash,
    p_operation_type: operationType,
    p_payload_hash: payloadHash,
    p_reason: reason,
    p_amount: numeric(body.amount),
    p_discount_percent: numeric(body.discountPercent),
  });
  return result.error
    ? response(origin, { error: rpcFailure(result.error) }, 403)
    : response(origin, { ok: true, approval: result.data });
});
