import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { parseAdminComplianceAuditSnapshot } from "./compliance-audit";

const root = resolve(process.cwd());

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

function fixture() {
  return {
    complianceAudit: {
      operationsAllowed: true,
      mode: "review",
      appendOnlySources: true,
      sourceDigestVerification: true,
      rawIdentityReturned: false,
      financeContentReturned: false,
      rawLogsReturned: false,
      providerPayloadReturned: false,
      counts: {
        events30d: 2,
        pending30d: 1,
        reviewed30d: 1,
        flagged30d: 0,
        attentionPending: 1,
        integrityMismatches: 0,
        reviewTransitions30d: 1,
        expiredReviewsPending: 0,
        expiredReviewAuditPending: 0,
      },
      timeline: [
        {
          eventCode: "AUD-A1B2C3D4E5F6",
          domain: "access",
          action: "role_changed",
          subjectReference: "ADM-A1B2C3D4E5F6",
          occurredAt: "2026-07-24T08:00:00.000Z",
          previousState: "support",
          nextState: "admin",
          attentionRequired: true,
          reviewStatus: "pending",
          reviewedAt: null,
          integrityState: "unverified",
        },
        {
          eventCode: "AUD-B1C2D3E4F5A6",
          domain: "incident",
          action: "workflow_updated",
          subjectReference: "INC-B1C2D3E4F5A6",
          occurredAt: "2026-07-24T07:00:00.000Z",
          previousState: "open / high",
          nextState: "resolved / high / mitigated",
          attentionRequired: false,
          reviewStatus: "reviewed",
          reviewedAt: "2026-07-24T07:30:00.000Z",
          integrityState: "verified",
        },
      ],
    },
  };
}

describe("Admin compliance audit review", () => {
  it("parses a bounded structured audit timeline", () => {
    const parsed = parseAdminComplianceAuditSnapshot(fixture());

    expect(parsed).not.toBeNull();
    expect(parsed?.timeline).toHaveLength(2);
    expect(parsed?.counts.pending30d).toBe(1);
    expect(parsed?.timeline[0]?.eventCode).toBe("AUD-A1B2C3D4E5F6");
  });

  it("accepts canonical lowercase billing plan references", () => {
    const value = fixture();
    value.complianceAudit.timeline[0] = {
      eventCode: "AUD-A1B2C3D4E5F6",
      domain: "billing",
      action: "created",
      subjectReference: "global_business_monthly",
      occurredAt: "2026-07-24T08:00:00.000Z",
      previousState: "none",
      nextState: "month / USD / active",
      attentionRequired: false,
      reviewStatus: "pending",
      reviewedAt: null,
      integrityState: "unverified",
    };

    expect(parseAdminComplianceAuditSnapshot(value)).not.toBeNull();
  });

  it("fails closed on identity or finance output", () => {
    const identity = fixture() as Record<string, unknown>;
    (identity.complianceAudit as Record<string, unknown>).userId =
      "00000000-0000-0000-0000-000000000000";
    expect(parseAdminComplianceAuditSnapshot(identity)).toBeNull();

    const finance = fixture() as Record<string, unknown>;
    (finance.complianceAudit as Record<string, unknown>).balance = 100;
    expect(parseAdminComplianceAuditSnapshot(finance)).toBeNull();
  });

  it("rejects inconsistent review and integrity states", () => {
    const invalid = fixture();
    invalid.complianceAudit.timeline[0]!.integrityState = "verified";
    expect(parseAdminComplianceAuditSnapshot(invalid)).toBeNull();

    const inconsistentCounts = fixture();
    inconsistentCounts.complianceAudit.counts.pending30d = 0;
    expect(parseAdminComplianceAuditSnapshot(inconsistentCounts)).toBeNull();
  });

  it("keeps the Admin page on one aggregate RPC and server rendering", () => {
    const page = read("app/admin/page.tsx");
    const panel = read("components/admin/AdminComplianceAuditPanel.tsx");
    const actions = read("app/admin/compliance-actions.ts");

    expect(page.match(/\.rpc\(/g)).toHaveLength(1);
    expect(page).toContain("parseAdminComplianceAuditSnapshot");
    expect(page).toContain("AdminComplianceAuditPanel");
    expect(panel).not.toContain('"use client"');
    expect(panel).toContain("No additional database request or");
    expect(actions).toContain('"use server"');
    expect(actions).toContain("apply_admin_compliance_review");
  });

  it("makes source audits append-only and review digests mandatory", () => {
    const migration = read(
      "supabase/migrations/20260724090000_admin_compliance_audit_review_center.sql",
    );

    expect(migration).toContain("platform_audit_rows_are_append_only");
    expect(migration).toContain("privacy_request_audit_append_only");
    expect(migration).toContain("billing_plan_audit_append_only");
    expect(migration).toContain("platform_admin_access_audit_append_only");
    expect(migration).toContain("platform_security_incident_audit_append_only");
    expect(migration).toContain("octet_length(source_digest) = 32");
    expect(migration).toContain("integrityMismatches");
    expect(migration).toContain("limit 60");
  });

  it("does not introduce free-text audit review fields", () => {
    const migration = read(
      "supabase/migrations/20260724090000_admin_compliance_audit_review_center.sql",
    );
    const panel = read("components/admin/AdminComplianceAuditPanel.tsx");

    expect(migration).not.toMatch(/\b(description|notes|comment|raw_payload)\s+(text|jsonb)/i);
    expect(panel).not.toContain("textarea");
  });
});
