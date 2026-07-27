import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const migration = read(
  "../supabase/migrations/20260727060000_pos_sale_transaction_bridge.sql",
);
const edgeFunction = read(
  "../supabase/functions/business-pos-security/index.ts",
);
const regression = read("../supabase/tests/business_pos_sale_bridge.sql");

describe("Retail POS sale transaction bridge contract", () => {
  it("keeps register configuration and sale request state service-role-only", () => {
    expect(migration).toContain("business_pos_branch_settings");
    expect(migration).toContain("business_pos_sale_requests");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke all on table public.business_pos_sale_requests from public,anon,authenticated");
    expect(migration).toContain("grant all on table public.business_pos_sale_requests to service_role");
  });

  it("normalizes price, warehouse, description, and revenue account in the database", () => {
    expect(migration).toContain("private.normalize_business_pos_sale_lines");
    expect(migration).toContain("target_product.sales_price");
    expect(migration).toContain("'warehouse_id',p_warehouse_id");
    expect(migration).toContain("'description',target_product.name");
    expect(migration).toContain("'revenue_account_id',target_product.revenue_account_id");
    expect(migration).toContain("contains unsupported fields");
    expect(migration).toContain("if p_lines is null");
    expect(migration).toContain("if not (item ? 'quantity')");
    expect(edgeFunction).not.toContain("unit_price:");
    expect(edgeFunction).not.toContain("warehouse_id:");
    expect(edgeFunction).not.toContain("revenue_account_id:");
  });

  it("binds idempotency and approval to the validated POS session payload", () => {
    expect(migration).toContain("unique (business_id, request_key)");
    expect(migration).toContain("existing_request.payload_hash<>payload_hash");
    expect(migration).toContain("existing_request.session_id<>target_session.id");
    expect(migration).toContain("existing_request.status='approval_required' and p_approval_id is null");
    expect(migration).toContain("public.consume_business_pos_approval(");
    expect(migration).toContain("'high_discount',payload_hash");
    expect(migration).toContain("approval_required");
    expect(migration).toContain("sale_replayed");
  });

  it("attributes the existing accounting and stock engine to the cashier", () => {
    expect(migration).toContain("set_config('request.jwt.claim.sub',target_session.user_id::text,true)");
    expect(migration).toContain("private.create_business_simple_shop_sale_internal(");
    expect(migration).toContain("case when coalesce(p_paid_now,true) then branch_settings.cash_account_id else null end");
    expect(migration).toContain("perform set_config('request.jwt.claim.sub',coalesce(previous_sub,''),true)");
  });

  it("accepts only constrained sale inputs at the Edge Function", () => {
    expect(edgeFunction).toContain('"post_sale"');
    expect(edgeFunction).toContain("function saleLines(value: unknown)");
    expect(edgeFunction).toContain("value.length > 100");
    expect(edgeFunction).toContain('serviceClient.rpc("post_business_pos_sale"');
    expect(edgeFunction).toContain("approvalRequired: true");
  });

  it("ships a rollback-only accounting, idempotency, and approval regression", () => {
    expect(regression).toContain("POS sale invoice was not attributed to the cashier");
    expect(regression).toContain("POS sale replay created a second invoice");
    expect(regression).toContain("POS idempotency key accepted a different payload");
    expect(regression).toContain("High discount POS sale posted without approval");
    expect(regression).toContain("Waiting for approval incremented the POS posting retry counter");
    expect(regression).toContain("rollback;");
  });
});
