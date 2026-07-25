import type { AdminAccessSnapshot } from "./access-operations";
import type { BillingOperationsSnapshot } from "./billing-operations";
import type {
  AdminControlCenterSnapshot,
  AdminCountBreakdown,
} from "./control-center";
import type { AdminIncidentOperationsSnapshot } from "./incident-operations";
import type {
  AdminSecurityPosture,
  SecurityPostureLevel,
} from "./security-posture";

export type CommandCenterDecisionTone =
  | "healthy"
  | "info"
  | "attention"
  | "critical"
  | "neutral";

export type CommandCenterActionItem = {
  key: string;
  label: string;
  detail: string;
  value: number;
  valueLabel?: string;
  tone: CommandCenterDecisionTone;
  href: string;
  priority: number;
};

export type CommandCenterEvidenceRow = {
  label: string;
  value: string;
  tone: CommandCenterDecisionTone;
};

export type CommandCenterFreshness = {
  value: "Live" | "Delayed" | "Stale" | "Unknown";
  detail: string;
  tone: CommandCenterDecisionTone;
  ageMinutes: number | null;
};

export type CommandCenterDecisionOverview = {
  openIncidents: number;
  securityFindings: number;
  pendingReviews: number;
  pendingReviewsHref: "#admin-access" | "#admin-privacy";
  systemTone: CommandCenterDecisionTone;
  systemValue: "Healthy" | "Attention" | "Critical";
  freshness: CommandCenterFreshness;
  actions: CommandCenterActionItem[];
  evidence: CommandCenterEvidenceRow[];
  countries: AdminCountBreakdown[];
  totalCountries: number;
};

export function mapSecurityPostureTone(
  level: SecurityPostureLevel,
): CommandCenterDecisionTone {
  if (level === "critical") return "critical";
  if (level === "attention") return "attention";
  return "healthy";
}

export function deriveCommandCenterFreshness(
  generatedAt: string,
  nowMs = Date.now(),
): CommandCenterFreshness {
  const generatedTime = Date.parse(generatedAt);
  if (Number.isNaN(generatedTime)) {
    return {
      value: "Unknown",
      detail: "Snapshot timestamp could not be verified.",
      tone: "neutral",
      ageMinutes: null,
    };
  }

  const rawAgeMinutes = Math.floor((nowMs - generatedTime) / 60_000);
  if (rawAgeMinutes < -5) {
    return {
      value: "Unknown",
      detail: "Snapshot timestamp is ahead of the operator clock.",
      tone: "attention",
      ageMinutes: rawAgeMinutes,
    };
  }

  const ageMinutes = Math.max(0, rawAgeMinutes);
  if (ageMinutes <= 15) {
    return {
      value: "Live",
      detail:
        ageMinutes <= 1
          ? "Snapshot generated just now."
          : `Snapshot generated ${ageMinutes} minutes ago.`,
      tone: "healthy",
      ageMinutes,
    };
  }

  if (ageMinutes <= 60) {
    return {
      value: "Delayed",
      detail: `Snapshot is ${ageMinutes} minutes old; refresh before acting on time-sensitive signals.`,
      tone: "attention",
      ageMinutes,
    };
  }

  return {
    value: "Stale",
    detail: `Snapshot is ${ageMinutes} minutes old and must be refreshed.`,
    tone: "critical",
    ageMinutes,
  };
}

export function deriveCommandCenterDecisionOverview({
  snapshot,
  posture,
  incidents,
  access,
  billing,
  nowMs = Date.now(),
}: {
  snapshot: AdminControlCenterSnapshot;
  posture: AdminSecurityPosture;
  incidents: AdminIncidentOperationsSnapshot;
  access: AdminAccessSnapshot;
  billing: BillingOperationsSnapshot;
  nowMs?: number;
}): CommandCenterDecisionOverview {
  const openIncidents =
    incidents.counts.open +
    incidents.counts.acknowledged +
    incidents.counts.investigating +
    incidents.counts.monitoring;
  const securityFindings =
    posture.criticalFindings + posture.attentionFindings;
  const pendingReviews =
    access.counts.pendingInvitations + snapshot.privacy.openRequests;
  const pendingReviewsHref =
    access.counts.pendingInvitations > 0 ? "#admin-access" : "#admin-privacy";
  const freshness = deriveCommandCenterFreshness(snapshot.generatedAt, nowMs);

  const hasCriticalSignal =
    incidents.counts.criticalOpen > 0 ||
    posture.overall === "critical" ||
    snapshot.privacy.overdueRequests > 0 ||
    freshness.tone === "critical";
  const hasAttentionSignal =
    openIncidents > 0 ||
    posture.overall === "attention" ||
    snapshot.telemetry.failedOperations7d > 0 ||
    snapshot.telemetry.poorPerformanceSignals7d > 0 ||
    pendingReviews > 0 ||
    snapshot.billing.pastDueUsers > 0 ||
    freshness.tone === "attention";

  const systemTone: CommandCenterDecisionTone = hasCriticalSignal
    ? "critical"
    : hasAttentionSignal
      ? "attention"
      : "healthy";
  const systemValue =
    systemTone === "critical"
      ? "Critical"
      : systemTone === "attention"
        ? "Attention"
        : "Healthy";

  const actions: Array<CommandCenterActionItem | null> = [
    freshness.tone === "critical"
      ? {
          key: "stale-snapshot",
          label: "Operational snapshot is stale",
          detail: freshness.detail,
          value: freshness.ageMinutes ?? 0,
          valueLabel:
            freshness.ageMinutes === null ? "?" : `${freshness.ageMinutes}m`,
          tone: "critical",
          href: "#admin-product-health",
          priority: 5,
        }
      : null,
    incidents.counts.criticalOpen > 0
      ? {
          key: "critical-incidents",
          label: "Critical incidents require ownership",
          detail: "Assign and investigate open critical incidents before lower-risk work.",
          value: incidents.counts.criticalOpen,
          tone: "critical",
          href: "#admin-incidents",
          priority: 10,
        }
      : openIncidents > 0
        ? {
            key: "open-incidents",
            label: "Incident queue is active",
            detail: "Review open, acknowledged, investigating, and monitoring incidents.",
            value: openIncidents,
            tone: "attention",
            href: "#admin-incidents",
            priority: 40,
          }
        : null,
    snapshot.privacy.overdueRequests > 0
      ? {
          key: "privacy-overdue",
          label: "Privacy deadlines are overdue",
          detail: "Structured privacy requests have passed their review deadline.",
          value: snapshot.privacy.overdueRequests,
          tone: "critical",
          href: "#admin-privacy",
          priority: 15,
        }
      : null,
    securityFindings > 0
      ? {
          key: "security-findings",
          label: "Security posture needs review",
          detail: "Critical and attention findings are derived from verified control signals.",
          value: securityFindings,
          tone: mapSecurityPostureTone(posture.overall),
          href: "#admin-security",
          priority: posture.overall === "critical" ? 20 : 45,
        }
      : null,
    snapshot.billing.pastDueUsers > 0
      ? {
          key: "past-due",
          label: "Payment recovery queue",
          detail: billing.providerConnected
            ? "Connected-provider past-due records require commercial review."
            : "Past-due records exist while collection is dormant; verify their lifecycle state.",
          value: snapshot.billing.pastDueUsers,
          tone: billing.providerConnected ? "critical" : "attention",
          href: "#admin-billing",
          priority: billing.providerConnected ? 25 : 55,
        }
      : null,
    snapshot.telemetry.failedOperations7d > 0
      ? {
          key: "failed-operations",
          label: "Failed operations detected",
          detail: "Review safe failure-code trends recorded over the last seven days.",
          value: snapshot.telemetry.failedOperations7d,
          tone: "attention",
          href: "#admin-product-health",
          priority: 50,
        }
      : null,
    snapshot.telemetry.poorPerformanceSignals7d > 0
      ? {
          key: "slow-signals",
          label: "Performance signals need review",
          detail: "Poor Web Vitals or long-task signals were recorded over seven days.",
          value: snapshot.telemetry.poorPerformanceSignals7d,
          tone: "attention",
          href: "#admin-product-health",
          priority: 60,
        }
      : null,
    access.counts.pendingInvitations > 0
      ? {
          key: "access-invitations",
          label: "Administrator invitations are pending",
          detail: "Accept or revoke one-time access invitations before expiry.",
          value: access.counts.pendingInvitations,
          tone: "attention",
          href: "#admin-access",
          priority: 70,
        }
      : null,
    snapshot.privacy.openRequests > snapshot.privacy.overdueRequests
      ? {
          key: "privacy-open",
          label: "Privacy requests await review",
          detail: "Open structured requests remain inside their current deadline.",
          value:
            snapshot.privacy.openRequests - snapshot.privacy.overdueRequests,
          tone: "attention",
          href: "#admin-privacy",
          priority: 80,
        }
      : null,
    freshness.tone === "attention"
      ? {
          key: "delayed-snapshot",
          label: "Refresh before time-sensitive action",
          detail: freshness.detail,
          value: Math.abs(freshness.ageMinutes ?? 0),
          valueLabel:
            freshness.ageMinutes === null
              ? "?"
              : `${Math.abs(freshness.ageMinutes)}m`,
          tone: "attention",
          href: "#admin-product-health",
          priority: 35,
        }
      : null,
  ];

  const evidence: CommandCenterEvidenceRow[] = [
    {
      label: "Admin snapshot contract",
      value: "Operational",
      tone: "healthy",
    },
    {
      label: "Access operations",
      value: access.operationsAllowed ? "Authorized" : "Read only",
      tone: access.operationsAllowed ? "healthy" : "neutral",
    },
    {
      label: "Incident operations",
      value: incidents.operationsAllowed ? "Authorized" : "Read only",
      tone: incidents.operationsAllowed ? "healthy" : "neutral",
    },
    {
      label: "Billing provider",
      value: billing.providerConnected ? "Connected" : "Dormant",
      tone: billing.providerConnected ? "healthy" : "neutral",
    },
    {
      label: "Privacy deadline queue",
      value: snapshot.privacy.overdueRequests > 0 ? "Overdue" : "Clear",
      tone:
        snapshot.privacy.overdueRequests > 0 ? "critical" : "healthy",
    },
    {
      label: "Telemetry failure signal",
      value:
        snapshot.telemetry.failedOperations7d > 0 ? "Review" : "Clear",
      tone:
        snapshot.telemetry.failedOperations7d > 0 ? "attention" : "healthy",
    },
  ];

  const countries = [...snapshot.telemetry.countries]
    .sort((left, right) => right.users - left.users)
    .slice(0, 8);

  return {
    openIncidents,
    securityFindings,
    pendingReviews,
    pendingReviewsHref,
    systemTone,
    systemValue,
    freshness,
    actions: actions
      .filter((item): item is CommandCenterActionItem => item !== null)
      .sort((left, right) => left.priority - right.priority),
    evidence,
    countries,
    totalCountries: snapshot.telemetry.countries.length,
  };
}
