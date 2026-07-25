import {
  JalvoroGlobeIcon,
} from "@/components/icons/jalvoro/components/communication";
import {
  JalvoroCardIcon,
  JalvoroShieldMoneyIcon,
  JalvoroTrendUpIcon,
  JalvoroWalletIcon,
} from "@/components/icons/jalvoro/components/finance";
import { JalvoroUsersIcon } from "@/components/icons/jalvoro/components/identity";
import {
  JalvoroAnalyticsIcon,
  JalvoroDashboardIcon,
} from "@/components/icons/jalvoro/components/navigation";
import {
  JalvoroClockIcon,
  JalvoroLockIcon,
} from "@/components/icons/jalvoro/components/objects";
import {
  JalvoroInfoIcon,
  JalvoroPendingIcon,
  JalvoroSuccessIcon,
  JalvoroWarningIcon,
} from "@/components/icons/jalvoro/components/status";
import type { JalvoroIconComponent } from "@/components/icons/jalvoro/types";
import type { AdminAccessSnapshot } from "@/lib/admin/access-operations";
import type { BillingOperationsSnapshot } from "@/lib/admin/billing-operations";
import {
  formatAdminCount,
  formatAdminGeneratedAt,
  type AdminControlCenterSnapshot,
} from "@/lib/admin/control-center";
import type { AdminIncidentOperationsSnapshot } from "@/lib/admin/incident-operations";
import type {
  AdminSecurityPosture,
  SecurityPostureLevel,
} from "@/lib/admin/security-posture";
import { cn } from "@/lib/utils";

type Tone = "healthy" | "info" | "attention" | "critical" | "neutral";

const toneClasses: Record<Tone, string> = {
  healthy:
    "border-success/25 bg-success/8 text-success dark:border-success/30 dark:bg-success/10",
  info: "border-info/25 bg-info/8 text-info dark:border-info/30 dark:bg-info/10",
  attention:
    "border-warning/25 bg-warning/8 text-warning dark:border-warning/30 dark:bg-warning/10",
  critical:
    "border-destructive/25 bg-destructive/8 text-destructive dark:border-destructive/30 dark:bg-destructive/10",
  neutral: "border-border/70 bg-surface-secondary/55 text-muted-foreground",
};

const toneDots: Record<Tone, string> = {
  healthy: "bg-success",
  info: "bg-info",
  attention: "bg-warning",
  critical: "bg-destructive",
  neutral: "bg-muted-foreground",
};

type StatusMetricProps = {
  label: string;
  value: string;
  detail: string;
  tone: Tone;
  icon: JalvoroIconComponent;
  href: string;
};

function StatusMetric({
  label,
  value,
  detail,
  tone,
  icon: Icon,
  href,
}: StatusMetricProps) {
  return (
    <a
      href={href}
      className="group min-w-0 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-info/35 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/60"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl border",
            toneClasses[tone],
          )}
        >
          <Icon size={18} context="compact" aria-hidden="true" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors group-hover:text-foreground">
          Open
        </span>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-2xl font-semibold tracking-[-0.04em] text-foreground">
        {value}
      </p>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
        {detail}
      </p>
    </a>
  );
}

type ActionItem = {
  key: string;
  label: string;
  detail: string;
  value: number;
  tone: Tone;
  href: string;
};

function ActionCenter({ items }: { items: ActionItem[] }) {
  return (
    <section
      aria-labelledby="decision-action-center"
      className="rounded-[1.5rem] border border-border/70 bg-card/82 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4 border-b border-divider/70 px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-info">
            Decision queue
          </p>
          <h2
            id="decision-action-center"
            className="mt-1 text-lg font-semibold tracking-tight text-foreground"
          >
            Action Center
          </h2>
        </div>
        <span className="rounded-full border border-border/70 bg-surface-secondary/60 px-2.5 py-1 font-mono text-xs text-muted-foreground">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-2xl border border-success/25 bg-success/8 text-success">
            <JalvoroSuccessIcon size={22} context="content" aria-hidden="true" />
          </span>
          <p className="mt-3 font-medium text-foreground">No active action signal</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Current incident, access, billing, privacy, and telemetry queues are clear.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-divider/70">
          {items.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-4 transition-colors hover:bg-surface-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-info/60"
            >
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-xl border",
                  toneClasses[item.tone],
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn("size-2 rounded-full", toneDots[item.tone])}
                />
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-sm font-medium text-foreground">
                  {item.label}
                </strong>
                <small className="mt-0.5 block line-clamp-1 text-xs leading-5 text-muted-foreground">
                  {item.detail}
                </small>
              </span>
              <span className="rounded-lg border border-border/70 bg-background/60 px-2 py-1 font-mono text-xs font-semibold text-foreground">
                {formatAdminCount(item.value)}
              </span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

type EvidenceRow = {
  label: string;
  value: string;
  tone: Tone;
};

function ControlEvidence({ rows }: { rows: EvidenceRow[] }) {
  return (
    <section
      aria-labelledby="decision-control-evidence"
      className="rounded-[1.5rem] border border-border/70 bg-card/82 shadow-sm"
    >
      <div className="border-b border-divider/70 px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-info">
          Verified signals
        </p>
        <h2
          id="decision-control-evidence"
          className="mt-1 text-lg font-semibold tracking-tight text-foreground"
        >
          Control evidence
        </h2>
      </div>
      <div className="divide-y divide-divider/70 px-5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 py-3.5 text-sm"
          >
            <span className="min-w-0 truncate text-muted-foreground">
              {row.label}
            </span>
            <span className="inline-flex shrink-0 items-center gap-2 font-medium text-foreground">
              <span
                aria-hidden="true"
                className={cn("size-2 rounded-full", toneDots[row.tone])}
              />
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footprint({ snapshot }: { snapshot: AdminControlCenterSnapshot }) {
  const countries = [...snapshot.telemetry.countries]
    .sort((left, right) => right.users - left.users)
    .slice(0, 8);
  const maximum = Math.max(...countries.map((country) => country.users), 1);

  return (
    <section
      aria-labelledby="decision-footprint"
      className="relative overflow-hidden rounded-[1.5rem] border border-border/70 bg-card/82 shadow-sm"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-surface-secondary/15"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-info/10 blur-3xl"
      />
      <div className="relative border-b border-divider/70 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-info">
              Global footprint
            </p>
            <h2
              id="decision-footprint"
              className="mt-1 text-lg font-semibold tracking-tight text-foreground"
            >
              Active ecosystem coverage
            </h2>
          </div>
          <span className="grid size-10 place-items-center rounded-2xl border border-info/25 bg-info/8 text-info">
            <JalvoroGlobeIcon size={21} context="heading" aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="relative grid gap-5 p-5 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
            <p className="text-xs text-muted-foreground">Active users · 30d</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
              {formatAdminCount(snapshot.telemetry.activeUsers30d)}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
            <p className="text-xs text-muted-foreground">Observed countries</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
              {formatAdminCount(countries.length)}
            </p>
          </div>
          <div className="col-span-2 rounded-2xl border border-border/70 bg-background/55 p-4 lg:col-span-1">
            <p className="text-xs text-muted-foreground">Registered identities</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
              {formatAdminCount(snapshot.users.total)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
          {countries.length === 0 ? (
            <div className="grid min-h-52 place-items-center text-center">
              <div>
                <JalvoroGlobeIcon
                  size={34}
                  context="heading"
                  className="mx-auto text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="mt-3 font-medium text-foreground">
                  Geographic telemetry is not active
                </p>
                <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                  No decorative map is rendered until real privacy-safe country signals exist.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {countries.map((country) => {
                const width = Math.max(
                  4,
                  Math.round((country.users / maximum) * 100),
                );
                return (
                  <div key={country.label}>
                    <div className="mb-1.5 flex items-center justify-between gap-4 text-xs">
                      <span className="truncate font-medium text-foreground">
                        {country.label}
                      </span>
                      <span className="shrink-0 font-mono text-muted-foreground">
                        {formatAdminCount(country.users)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary">
                      <div
                        className="h-full rounded-full bg-info/75"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SnapshotPanel({
  title,
  eyebrow,
  icon: Icon,
  items,
}: {
  title: string;
  eyebrow: string;
  icon: JalvoroIconComponent;
  items: Array<{ label: string; value: number; tone?: Tone }>;
}) {
  const maximum = Math.max(...items.map((item) => item.value), 1);

  return (
    <section className="rounded-[1.5rem] border border-border/70 bg-card/82 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-info">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
        </div>
        <span className="grid size-10 place-items-center rounded-2xl border border-border/70 bg-surface-secondary/60 text-muted-foreground">
          <Icon size={20} context="heading" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const width = Math.max(3, Math.round((item.value / maximum) * 100));
          return (
            <div
              key={item.label}
              className="rounded-2xl border border-border/70 bg-background/55 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 rounded-full",
                    toneDots[item.tone ?? "info"],
                  )}
                />
              </div>
              <p className="mt-2 font-mono text-xl font-semibold text-foreground">
                {formatAdminCount(item.value)}
              </p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-secondary">
                <div
                  className={cn(
                    "h-full rounded-full",
                    item.tone === "critical"
                      ? "bg-destructive"
                      : item.tone === "attention"
                        ? "bg-warning"
                        : item.tone === "healthy"
                          ? "bg-success"
                          : "bg-info",
                  )}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function mapPostureTone(level: SecurityPostureLevel): Tone {
  if (level === "critical") return "critical";
  if (level === "attention") return "attention";
  return "healthy";
}

function freshnessState(generatedAt: string) {
  const generatedTime = Date.parse(generatedAt);
  if (Number.isNaN(generatedTime)) {
    return {
      value: "Unknown",
      detail: "Snapshot timestamp could not be verified.",
      tone: "neutral" as Tone,
    };
  }

  const ageMinutes = Math.max(
    0,
    Math.floor((Date.now() - generatedTime) / 60_000),
  );

  if (ageMinutes <= 15) {
    return {
      value: "Live",
      detail:
        ageMinutes <= 1
          ? "Snapshot generated just now."
          : `Snapshot generated ${ageMinutes} minutes ago.`,
      tone: "healthy" as Tone,
    };
  }

  return {
    value: "Stale",
    detail: `Snapshot is ${ageMinutes} minutes old and should be refreshed.`,
    tone: "attention" as Tone,
  };
}

export default function AdminDecisionOverview({
  snapshot,
  posture,
  incidents,
  access,
  billing,
}: {
  snapshot: AdminControlCenterSnapshot;
  posture: AdminSecurityPosture;
  incidents: AdminIncidentOperationsSnapshot;
  access: AdminAccessSnapshot;
  billing: BillingOperationsSnapshot;
}) {
  const openIncidents =
    incidents.counts.open +
    incidents.counts.acknowledged +
    incidents.counts.investigating +
    incidents.counts.monitoring;
  const securityFindings =
    posture.criticalFindings + posture.attentionFindings;
  const pendingReviews =
    access.counts.pendingInvitations + snapshot.privacy.openRequests;
  const freshness = freshnessState(snapshot.generatedAt);
  const systemTone: Tone =
    incidents.counts.criticalOpen > 0 || posture.overall === "critical"
      ? "critical"
      : openIncidents > 0 ||
          posture.overall === "attention" ||
          snapshot.telemetry.failedOperations7d > 0
        ? "attention"
        : "healthy";
  const systemValue =
    systemTone === "critical"
      ? "Critical"
      : systemTone === "attention"
        ? "Attention"
        : "Healthy";

  const actions = ([
    incidents.counts.criticalOpen > 0
      ? {
          key: "critical-incidents",
          label: "Critical incidents require ownership",
          detail: "Open critical incidents should be assigned and investigated first.",
          value: incidents.counts.criticalOpen,
          tone: "critical" as Tone,
          href: "#admin-incidents",
        }
      : openIncidents > 0
        ? {
            key: "open-incidents",
            label: "Incident queue is active",
            detail: "Review open, acknowledged, investigating, and monitoring incidents.",
            value: openIncidents,
            tone: "attention" as Tone,
            href: "#admin-incidents",
          }
        : null,
    securityFindings > 0
      ? {
          key: "security-findings",
          label: "Security posture needs review",
          detail: "Critical and attention findings are derived from verified control signals.",
          value: securityFindings,
          tone: mapPostureTone(posture.overall),
          href: "#admin-security",
        }
      : null,
    snapshot.billing.pastDueUsers > 0
      ? {
          key: "past-due",
          label: "Payment recovery queue",
          detail: "Past-due subscription records require commercial review.",
          value: snapshot.billing.pastDueUsers,
          tone: "critical" as Tone,
          href: "#admin-billing",
        }
      : null,
    access.counts.pendingInvitations > 0
      ? {
          key: "access-invitations",
          label: "Pending administrator invitations",
          detail: "Accept or revoke one-time access invitations before expiry.",
          value: access.counts.pendingInvitations,
          tone: "attention" as Tone,
          href: "#admin-access",
        }
      : null,
    snapshot.privacy.overdueRequests > 0
      ? {
          key: "privacy-overdue",
          label: "Overdue privacy requests",
          detail: "Structured privacy requests have passed their review deadline.",
          value: snapshot.privacy.overdueRequests,
          tone: "critical" as Tone,
          href: "#admin-privacy",
        }
      : null,
    snapshot.telemetry.failedOperations7d > 0
      ? {
          key: "failed-operations",
          label: "Failed operations detected",
          detail: "Review safe failure-code trends recorded over the last seven days.",
          value: snapshot.telemetry.failedOperations7d,
          tone: "attention" as Tone,
          href: "#admin-product-health",
        }
      : null,
  ] satisfies Array<ActionItem | null>).filter(
    (item): item is ActionItem => item !== null,
  );

  const evidence: EvidenceRow[] = [
    {
      label: "Admin snapshot contract",
      value: "Operational",
      tone: "healthy",
    },
    {
      label: "Control-plane access operations",
      value: access.operationsAllowed ? "Authorized" : "Read only",
      tone: access.operationsAllowed ? "healthy" : "neutral",
    },
    {
      label: "Incident response operations",
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
      value: snapshot.privacy.overdueRequests > 0 ? "Attention" : "Clear",
      tone:
        snapshot.privacy.overdueRequests > 0 ? "attention" : "healthy",
    },
    {
      label: "Telemetry failure signal",
      value:
        snapshot.telemetry.failedOperations7d > 0 ? "Review" : "Clear",
      tone:
        snapshot.telemetry.failedOperations7d > 0 ? "attention" : "healthy",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 pb-10">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/86 px-5 py-6 shadow-sm sm:px-7 sm:py-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-info/10 blur-3xl"
        />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                  toneClasses[systemTone],
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn("size-2 rounded-full", toneDots[systemTone])}
                />
                {systemValue}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
                <JalvoroLockIcon size={13} context="compact" aria-hidden="true" />
                {snapshot.adminRole}
              </span>
              <span className="rounded-full border border-info/25 bg-info/8 px-3 py-1 text-xs font-semibold text-info">
                Decision-first overview
              </span>
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-info">
              JALVORO Global Command Center
            </p>
            <h1 className="mt-2 text-balance text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-4xl lg:text-5xl">
              See what is broken, risky, and waiting for action.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              A privacy-minimised operational overview built only from verified
              server-side counts, incident queues, access state, billing state,
              and product-health signals.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
            <span className="grid size-10 place-items-center rounded-xl border border-info/25 bg-info/8 text-info">
              <JalvoroClockIcon size={19} context="compact" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Snapshot generated
              </p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
                {formatAdminGeneratedAt(snapshot.generatedAt)} UTC
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="Critical operating status"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6"
      >
        <StatusMetric
          label="System status"
          value={systemValue}
          detail={
            systemTone === "healthy"
              ? "No critical operational signal is active."
              : "Open signals require operator review."
          }
          tone={systemTone}
          icon={JalvoroDashboardIcon}
          href="#admin-product-health"
        />
        <StatusMetric
          label="Critical incidents"
          value={formatAdminCount(incidents.counts.criticalOpen)}
          detail={`${formatAdminCount(openIncidents)} total active incident states.`}
          tone={incidents.counts.criticalOpen > 0 ? "critical" : "healthy"}
          icon={JalvoroWarningIcon}
          href="#admin-incidents"
        />
        <StatusMetric
          label="Security findings"
          value={formatAdminCount(securityFindings)}
          detail={`${formatAdminCount(posture.boundaryChecksPassed)} privacy and security boundaries passed.`}
          tone={mapPostureTone(posture.overall)}
          icon={JalvoroShieldMoneyIcon}
          href="#admin-security"
        />
        <StatusMetric
          label="Past-due accounts"
          value={formatAdminCount(snapshot.billing.pastDueUsers)}
          detail={
            billing.providerConnected
              ? "Connected-provider payment recovery signal."
              : "Provider is dormant; no live collection is active."
          }
          tone={
            snapshot.billing.pastDueUsers > 0
              ? "critical"
              : billing.providerConnected
                ? "healthy"
                : "neutral"
          }
          icon={JalvoroCardIcon}
          href="#admin-billing"
        />
        <StatusMetric
          label="Pending reviews"
          value={formatAdminCount(pendingReviews)}
          detail="Access invitations plus open structured privacy requests."
          tone={pendingReviews > 0 ? "attention" : "healthy"}
          icon={JalvoroPendingIcon}
          href="#admin-access"
        />
        <StatusMetric
          label="Data freshness"
          value={freshness.value}
          detail={freshness.detail}
          tone={freshness.tone}
          icon={JalvoroClockIcon}
          href="#admin-product-health"
        />
      </section>

      <div className="grid gap-5 2xl:grid-cols-[1.35fr_1fr_0.75fr]">
        <Footprint snapshot={snapshot} />
        <ActionCenter items={actions.slice(0, 6)} />
        <ControlEvidence rows={evidence} />
      </div>

      <section
        id="admin-product-health"
        aria-label="Usage and commercial pulse"
        className="grid scroll-mt-24 gap-5 xl:grid-cols-2"
      >
        <SnapshotPanel
          title="Audience and product usage"
          eyebrow="Operational pulse"
          icon={JalvoroAnalyticsIcon}
          items={[
            {
              label: "Registered users",
              value: snapshot.users.total,
              tone: "info",
            },
            {
              label: "New users · 7d",
              value: snapshot.users.new7d,
              tone: "healthy",
            },
            {
              label: "Active users · 24h",
              value: snapshot.telemetry.activeUsers24h,
              tone: "info",
            },
            {
              label: "Events · 24h",
              value: snapshot.telemetry.events24h,
              tone: "neutral",
            },
          ]}
        />
        <SnapshotPanel
          title="Commercial state"
          eyebrow="Provider-neutral"
          icon={JalvoroWalletIcon}
          items={[
            {
              label: "Free users",
              value: snapshot.billing.freeUsers,
              tone: "info",
            },
            {
              label: "Trial users",
              value: snapshot.billing.trialUsers,
              tone: "attention",
            },
            {
              label: "Paid users",
              value: snapshot.billing.paidUsers,
              tone: "healthy",
            },
            {
              label: "Past due",
              value: snapshot.billing.pastDueUsers,
              tone:
                snapshot.billing.pastDueUsers > 0 ? "critical" : "healthy",
            },
          ]}
        />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="flex items-start gap-3 rounded-2xl border border-success/20 bg-success/5 p-4">
          <JalvoroSuccessIcon
            size={20}
            context="content"
            className="mt-0.5 shrink-0 text-success"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium text-foreground">
              Server-rendered truth
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              No client polling, session replay, or fabricated health values.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-info/20 bg-info/5 p-4">
          <JalvoroInfoIcon
            size={20}
            context="content"
            className="mt-0.5 shrink-0 text-info"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium text-foreground">
              Privacy-minimised
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Aggregated counts only; raw IP, finance content, and card data stay out.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-warning/20 bg-warning/5 p-4">
          <JalvoroTrendUpIcon
            size={20}
            context="content"
            className="mt-0.5 shrink-0 text-warning"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium text-foreground">
              Drill-down preserved
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Every status routes to an existing authorized operational section.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
