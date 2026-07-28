import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const migration = read(
  "../supabase/migrations/20260727070000_pos_operations_transaction_bridge.sql",
);
const edgeFunction = read("../supabase/functions/business-pos-security/index.ts");
const terminal = read("../components/business/BusinessPosTerminal.tsx");
const proxy = read("../lib/supabase/proxy.ts");
const regression = read("../supabase/tests/business_pos_operations_bridge.sql");

describe("Retail POS operations transaction bridge contract", () => {
  it("keeps operation request, payout, and cash-adjustment state service-role-only", () => {
    expect(migration).toContain("business_pos_operation_requests");
    expect(migration).toContain("business_pos_refund_payouts");
    expect(migration).toContain("business_pos_cash_adjustments");
    expect(migration).toContain(
      "revoke all on table public.business_pos_operation_requests from public,anon,authenticated",
    );
    expect(migration).toContain("grant all on table public.business_pos_operation_requests to service_role");
    expect(migration).toContain("enable row level security");
  });

  it("normalizes purchases and refunds from database-owned records", () => {
    expect(migration).toContain("private.normalize_business_pos_purchase_lines");
    expect(migration).toContain("target_product.purchase_cost_hint");
    expect(migration).toContain("'warehouse_id',p_warehouse_id");
    expect(migration).toContain("'allocation_account_id',target_product.inventory_account_id");
    expect(migration).toContain("private.normalize_business_pos_return_lines");
    expect(migration).toContain("Branch POS invoice not found.");
    expect(migration).toContain("return_quantity>remaining_quantity");
    expect(edgeFunction).not.toContain("unit_cost:");
    expect(edgeFunction).not.toContain("allocation_account_id:");
    expect(edgeFunction).not.toContain("cash_account_id:");
  });

  it("requires one-time approvals for refunds, voids, and cash adjustments", () => {
    expect(migration).toContain("approval_operation:='refund'");
    expect(migration).toContain("approval_operation:='void'");
    expect(migration).toContain("approval_operation:='cash_adjustment'");
    expect(migration).toContain("public.consume_business_pos_approval(");
    expect(migration).toContain("existing_request.status='approval_required' and p_approval_id is null");
    expect(migration).toContain("existing_request.payload_hash<>payload_hash");
    expect(migration).toContain("existing_request.session_id<>target_session.id");
  });

  it("attributes existing accounting engines to the validated cashier identity", () => {
    expect(migration).toContain("private.get_business_pos_session_internal");
    expect(migration).toContain("private.business_pos_user_can_shop_operation");
    expect(migration).toContain("public.end_business_pos_session");
    expect(migration).toContain("private.current_business_pos_claim_valid");
    expect(migration).toContain("set_config('request.jwt.claim.sub',target_session.user_id::text,true)");
    expect(migration).toContain("private.create_business_simple_shop_purchase_internal(");
    expect(migration).toContain("private.create_business_simple_shop_expense_internal(");
    expect(migration).toContain("private.create_business_sales_return_internal(");
    expect(migration).toContain("perform set_config('request.jwt.claim.sub',coalesce(previous_sub,''),true)");
  });

  it("exposes only constrained kiosk actions through the Edge Function", () => {
    expect(edgeFunction).toContain('"end_session"');
    expect(edgeFunction).toContain('"terminal_snapshot"');
    expect(edgeFunction).toContain('"post_operation"');
    expect(edgeFunction).toContain("function operationPayload(");
    expect(edgeFunction).toContain("function purchaseLines(value: unknown)");
    expect(edgeFunction).toContain("function refundLines(value: unknown)");
    expect(edgeFunction).toContain('serviceClient.rpc("post_business_pos_operation"');
    expect(edgeFunction).toContain("approvalRequired: true");
    expect(edgeFunction).toContain("APP_ALLOWED_ORIGINS");
  });

  it("provides a public self-protected terminal without website authentication", () => {
    expect(proxy).toContain('"/pos"');
    expect(terminal).toContain('sessionStorage.setItem(storageKey, token)');
    expect(terminal).toContain('sessionStorage.removeItem(storageKey)');
    expect(terminal).not.toContain("localStorage");
    expect(terminal).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(terminal).not.toContain("secret_hash");
    expect(terminal).not.toContain("pin_hash");
    expect(terminal).toContain('action: "end_session"');
    expect(terminal).toContain('action: "post_sale"');
    expect(terminal).toContain('action: "post_operation"');
    expect(terminal).toContain('action: "request_approval"');
  });

  it("ships rollback-only accounting, approval, replay, and attribution regression coverage", () => {
    expect(regression).toContain("POS purchase was not attributed to the cashier");
    expect(regression).toContain("POS expense was not attributed to the cashier");
    expect(regression).toContain("POS refund posted without approval");
    expect(regression).toContain("POS cash adjustment posted without approval");
    expect(regression).toContain("POS operation replay created a second accounting record");
    expect(regression).toContain("rollback;");
  });
});
