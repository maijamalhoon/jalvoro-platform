import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { parseAdminIncidentOperationsSnapshot } from "./incident-operations";

const root = resolve(process.cwd());

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

function validSnapshot() {
  return {
    incidents: {
      operationsAllowed: true,
      freeTextStored: false,
      rawIpStored: false,
      sessionReplayStored: false,
      userIdentityReturned: false,
      financeContentStored: false,
      providerPayloadStored: false,
      counts: {
        open: 1,
        acknowledged: 0,
        investigating: 1,
        monitoring: 0,
        criticalOpen: 1,
        overdueOpen: 1,
        resolved30d: 2,
        auditEvents30d: 5,
        expiredAuditPending: 0,
        expiredIncidentsPending: 0,
      },
      queue: [
        {
          incidentCode: "INC-A1B2C3D4E5F6",
          category: "data_boundary",
          severity: "critical",
          status: "investigating",
          source: "posture",
          sourceReference: null,
          createdAt: "2026-07-24T06:00:00.000Z",
          dueAt: "2026-07-24T07:00:00.000Z",
          assigned: true,
          assignedToMe: true,
          overdue: true,
          manageable: true,
        },
        {
          incidentCode: "INC-0A1B2C3D4E5F",
          category: "privacy_deadline",
          severity: "medium",
          status: "open",
          source: "privacy",
          sourceReference: "PRV-A1B2C3D4E5F6",
          createdAt: "2026-07-24T06:30:00.000Z",
          dueAt: null,
          assigned: false,
          assignedToMe: false,
          overdue: false,
          manageable: true,
        },
      ],
    },
  };
}

describe("admin incident operations", () => {
  it("parses a bounded opaque incident queue", () => {
    const parsed = parseAdminIncidentOperationsSnapshot(validSnapshot());

    expect(parsed?.counts.criticalOpen).toBe(1);
    expect(parsed?.queue).toHaveLength(2);
    expect(parsed?.queue[0]?.incidentCode).toBe("INC-A1B2C3D4E5F6");
    expect(parsed?.queue[1]?.sourceReference).toBe("PRV-A1B2C3D4E5F6");
  });

  it("fails closed on free text, identity, raw evidence or finance keys", () => {
    for (const unsafe of [
      { description: "sensitive incident narrative" },
      { email: "full@example.com" },
      { userId: "00000000-0000-0000-0000-000000000000" },
      { rawIp: "203.0.113.1" },
      { sessionReplay: "video-reference" },
      { transaction: { amount: 100 } },
      { providerPayload: { event: "private" } },
    ]) {
      const snapshot = validSnapshot();
      Object.assign(snapshot.incidents.queue[0]!, unsafe);
      expect(parseAdminIncidentOperationsSnapshot(snapshot)).toBeNull();
    }
  });

  it("rejects unsafe references and inconsistent active counts", () => {
    const exposed = validSnapshot();
    exposed.incidents.queue[1]!.sourceReference =
      "00000000-0000-0000-0000-000000000000";
    expect(parseAdminIncidentOperationsSnapshot(exposed)).toBeNull();

    const inconsistent = validSnapshot();
    inconsistent.incidents.counts.criticalOpen = 3;
    expect(parseAdminIncidentOperationsSnapshot(inconsistent)).toBeNull();
  });

  it("keeps incident storage structured, private and retention-bound", () => {
    const migration = read(
      "supabase/migrations/20260724073000_admin_incident_alert_operations.sql",
    );

    expect(migration).toContain("private.platform_security_incidents");
    expect(migration).toContain("private.platform_security_incident_audit");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("using (false)");
    expect(migration).toContain("'freeTextStored', false");
    expect(migration).toContain("'rawIpStored', false");
    expect(migration).toContain("'sessionReplayStored', false");
    expect(migration).toContain("'financeContentStored', false");
    expect(migration).toContain("'providerPayloadStored', false");
    expect(migration).toContain("limit 40");
    expect(migration).toContain("interval '24 months'");
    expect(migration).not.toMatch(/\b(description|notes|raw_payload)\s+(text|jsonb)/i);
  });

  it("requires a non-null controlled resolution code", () => {
    const migration = read(
      "supabase/migrations/20260724073200_require_incident_resolution_code.sql",
    );

    expect(migration).toContain("and resolution_code is not null");
    expect(migration).toContain("v_resolution_code is null or v_resolution_code not in");
    expect(migration).toContain("incident_resolution_invalid");
    expect(migration).toContain("critical_incident_owner_required");
  });

  it("indexes every incident workflow foreign key flagged by advisors", () => {
    const migration = read(
      "supabase/migrations/20260724073300_index_incident_foreign_keys.sql",
    );

    expect(migration).toContain("platform_security_incidents_acknowledged_by_idx");
    expect(migration).toContain("platform_security_incidents_resolved_by_idx");
    expect(migration).toContain(
      "platform_security_incident_audit_previous_assignment_idx",
    );
    expect(migration).toContain(
      "platform_security_incident_audit_next_assignment_idx",
    );
  });

  it("preserves one Admin snapshot RPC and server-only workflow actions", () => {
    const page = read("app/admin/page.tsx");
    const actions = read("app/admin/incident-actions.ts");
    const panel = read("components/admin/AdminIncidentOperationsPanel.tsx");

    expect(page.match(/\.rpc\(/g)).toHaveLength(1);
    expect(page).toContain("parseAdminIncidentOperationsSnapshot");
    expect(page).toContain("AdminIncidentOperationsPanel");
    expect(actions).toContain('"use server"');
    expect(actions).toContain("create_platform_security_incident");
    expect(actions).toContain("apply_platform_security_incident_workflow");
    expect(panel).toContain(
      "No title, description, notes, raw evidence or attachment is accepted.",
    );
    expect(panel).not.toContain("textarea");
  });
});
