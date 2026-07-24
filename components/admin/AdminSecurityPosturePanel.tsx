import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatAdminCount } from "@/lib/admin/control-center";
import type {
  AdminSecurityPosture,
  SecurityPostureFinding,
  SecurityPostureLevel,
} from "@/lib/admin/security-posture";
import { cn } from "@/lib/utils";

function levelLabel(level: SecurityPostureLevel) {
  if (level === "critical") return "Critical";
  if (level === "attention") return "Attention";
  return "Healthy";
}

function LevelPill({ level }: { level: SecurityPostureLevel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        level === "healthy" &&
          "border-success/25 bg-success/5 text-success",
        level === "attention" &&
          "border-warning/25 bg-warning/5 text-warning",
        level === "critical" &&
          "border-destructive/25 bg-destructive/5 text-destructive",
      )}
    >
      {levelLabel(level)}
    </span>
  );
}

function Metric({
  label,
  value,
  detail,
  level,
}: {
  label: string;
  value: number | string;
  detail: string;
  level: SecurityPostureLevel;
}) {
  return (
    <Card className="border-border/70 bg-card/88 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardDescription className="text-xs font-semibold uppercase tracking-[0.14em]">
            {label}
          </CardDescription>
          <LevelPill level={level} />
        </div>
        <CardTitle className="font-mono text-3xl tracking-[-0.04em]">
          {typeof value === "number" ? formatAdminCount(value) : value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function FindingRow({ finding }: { finding: SecurityPostureFinding }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <code className="font-mono text-xs text-muted-foreground">
            {finding.code}
          </code>
          <LevelPill level={finding.level} />
        </div>
        <p className="mt-2 font-medium text-foreground">{finding.label}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {finding.detail}
        </p>
      </div>
      <div className="shrink-0 font-mono text-xl font-semibold text-foreground">
        {typeof finding.value === "number"
          ? formatAdminCount(finding.value)
          : finding.value}
      </div>
    </div>
  );
}

export default function AdminSecurityPosturePanel({
  posture,
}: {
  posture: AdminSecurityPosture;
}) {
  return (
    <section
      id="admin-security"
      className="mx-auto w-full max-w-[1500px] scroll-mt-24 px-4 pb-12 sm:px-6 lg:px-8"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-info">
              Security and risk posture
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Admin Security Posture Center
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              One aggregate view of access governance, privacy deadlines,
              provider-neutral billing queues, retention health and enforced
              data boundaries. No additional database request or client polling
              is used.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LevelPill level={posture.overall} />
            <span className="inline-flex items-center rounded-full border border-info/25 bg-info/5 px-2.5 py-1 text-xs font-semibold text-info">
              Aggregate signals only
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Critical findings"
            value={posture.criticalFindings}
            detail="Signals that require immediate owner or admin review."
            level={posture.criticalFindings > 0 ? "critical" : "healthy"}
          />
          <Metric
            label="Attention findings"
            value={posture.attentionFindings}
            detail="Non-critical operational or governance follow-up."
            level={posture.attentionFindings > 0 ? "attention" : "healthy"}
          />
          <Metric
            label="Healthy controls"
            value={posture.healthyControls}
            detail="Monitored controls currently returning a healthy state."
            level="healthy"
          />
          <Metric
            label="Boundary checks passed"
            value={`${posture.boundaryChecksPassed}/13`}
            detail="Privacy, identity, provider and browser-secret boundaries."
            level={posture.boundaryChecksPassed === 13 ? "healthy" : "critical"}
          />
        </div>

        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <CardTitle>Current findings</CardTitle>
            <CardDescription>
              These findings are derived only from already validated Admin Panel
              snapshots. They do not expose raw authentication logs, IP
              addresses, user UUIDs, finance content or provider payloads.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {posture.findings.map((finding) => (
              <FindingRow key={finding.code} finding={finding} />
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <CardTitle>Security boundary contract</CardTitle>
            <CardDescription>
              The posture view remains safe even when an upstream integration is
              unavailable.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Raw IP addresses", "Not stored"],
              ["Session replay", "Disabled"],
              ["Finance content in telemetry", "Excluded"],
              ["Raw invitation tokens", "Not stored"],
              ["Editable user metadata authorization", "Disabled"],
              ["Service-role secret in browser", "Not exposed"],
              ["Raw provider webhook payload", "Not stored"],
              ["Full user identities", "Not returned"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 font-medium text-success">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
