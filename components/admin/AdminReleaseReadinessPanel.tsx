import {
  approveCurrentAdminReleaseAction,
  revokeAdminReleaseAction,
} from "@/app/admin/release-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AdminReleaseReadiness,
  AdminReleaseReadinessSnapshot,
  ReleaseReadinessLevel,
} from "@/lib/admin/release-readiness";
import { cn } from "@/lib/utils";

export type ReleaseActionResult =
  | "approved"
  | "revoked"
  | "blocked"
  | "invalid"
  | "forbidden"
  | "missing"
  | "unavailable";

function levelLabel(level: ReleaseReadinessLevel) {
  if (level === "blocked") return "Blocked";
  if (level === "attention") return "Attention";
  return "Ready";
}

function LevelPill({ level }: { level: ReleaseReadinessLevel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        level === "ready" && "border-success/25 bg-success/5 text-success",
        level === "attention" && "border-warning/25 bg-warning/5 text-warning",
        level === "blocked" &&
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
  level: ReleaseReadinessLevel;
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
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function actionMessage(result: ReleaseActionResult | null) {
  if (result === "approved") return "Current deployment revision approved for 24 hours.";
  if (result === "revoked") return "Release approval revoked.";
  if (result === "blocked") return "Release approval blocked by one or more readiness controls.";
  if (result === "invalid") return "Runtime or release approval input was invalid.";
  if (result === "forbidden") return "Only an active Owner can approve or revoke a release.";
  if (result === "missing") return "The selected active release approval no longer exists.";
  if (result === "unavailable") return "Release approval service is temporarily unavailable.";
  return null;
}

export default function AdminReleaseReadinessPanel({
  readiness,
  release,
  actionResult,
}: {
  readiness: AdminReleaseReadiness;
  release: AdminReleaseReadinessSnapshot;
  actionResult: ReleaseActionResult | null;
}) {
  const message = actionMessage(actionResult);
  const runtimeCanBeApproved =
    readiness.runtime.vercel &&
    (readiness.runtime.environment === "production" ||
      readiness.runtime.environment === "preview") &&
    readiness.runtime.revisionSha !== null &&
    readiness.runtime.deploymentId !== null;
  const activeApproval = readiness.matchingApproval?.status === "active"
    ? readiness.matchingApproval
    : null;

  return (
    <section
      id="admin-release-readiness"
      className="mx-auto w-full max-w-[1500px] scroll-mt-24 px-4 pb-12 sm:px-6 lg:px-8"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-info">
              Controlled production release gate
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Admin Release Readiness Center
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              One server-rendered release gate for database migrations, RLS,
              audit integrity, privacy deadlines, incidents, billing queues,
              access resilience and actual Vercel deployment evidence. No
              additional client polling is used.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LevelPill level={readiness.overall} />
            <span className="inline-flex items-center rounded-full border border-info/25 bg-info/5 px-2.5 py-1 text-xs font-semibold text-info">
              {readiness.score}% readiness
            </span>
          </div>
        </div>

        {message ? (
          <div
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm",
              actionResult === "approved" || actionResult === "revoked"
                ? "border-success/25 bg-success/5 text-success"
                : "border-destructive/25 bg-destructive/5 text-destructive",
            )}
          >
            {message}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Readiness score"
            value={`${readiness.score}%`}
            detail="Weighted across every release control below."
            level={readiness.overall}
          />
          <Metric
            label="Blocked checks"
            value={readiness.blockedChecks}
            detail="Any blocked check prevents Owner approval."
            level={readiness.blockedChecks > 0 ? "blocked" : "ready"}
          />
          <Metric
            label="Attention checks"
            value={readiness.attentionChecks}
            detail="Non-blocking review items before a controlled release."
            level={readiness.attentionChecks > 0 ? "attention" : "ready"}
          />
          <Metric
            label="Ready checks"
            value={readiness.readyChecks}
            detail="Controls currently returning a release-ready state."
            level="ready"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-border/70 bg-card/88 shadow-sm">
            <CardHeader>
              <CardTitle>Deployment evidence</CardTitle>
              <CardDescription>
                Vercel system environment variables are read only on the server.
                No deployment token or runtime secret is stored in the database.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {[
                ["Platform", readiness.runtime.vercel ? "Vercel" : "Local / unknown"],
                ["Environment", readiness.runtime.environment],
                [
                  "Git revision",
                  readiness.runtime.revisionSha
                    ? `${readiness.runtime.revisionSha.slice(0, 12)}…`
                    : "Unavailable",
                ],
                [
                  "Deployment ID",
                  readiness.runtime.deploymentId
                    ? `${readiness.runtime.deploymentId.slice(0, 18)}…`
                    : "Unavailable",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 break-all font-mono text-sm font-medium text-foreground">
                    {value}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/88 shadow-sm">
            <CardHeader>
              <CardTitle>Owner approval</CardTitle>
              <CardDescription>
                Approval is valid for 24 hours and bound to the exact runtime
                revision plus current database readiness digest.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Current approval
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                  {activeApproval?.releaseCode ?? "Not approved"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeApproval
                    ? activeApproval.databaseState === "verified"
                      ? `Active until ${new Date(activeApproval.expiresAt).toLocaleString()}`
                      : "Active approval is stale because release state changed."
                    : "No active approval matches this runtime revision."}
                </p>
              </div>

              {release.approvalAllowed ? (
                activeApproval ? (
                  <form action={revokeAdminReleaseAction}>
                    <input
                      type="hidden"
                      name="releaseCode"
                      value={activeApproval.releaseCode}
                    />
                    <Button type="submit" variant="outline" className="w-full">
                      Revoke current approval
                    </Button>
                  </form>
                ) : runtimeCanBeApproved ? (
                  <form action={approveCurrentAdminReleaseAction}>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={readiness.blockedChecks > 0}
                    >
                      Approve current revision
                    </Button>
                  </form>
                ) : (
                  <p className="text-sm leading-6 text-muted-foreground">
                    Approval becomes available on a Vercel production or preview
                    runtime with valid Git revision and deployment evidence.
                  </p>
                )
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  This role has read-only release visibility. Only an active Owner
                  can approve or revoke a revision.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <CardTitle>Database release controls</CardTitle>
            <CardDescription>
              Migration, RLS, direct-access, append-only audit, function and RPC
              permission controls are computed inside PostgreSQL.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              [
                "Required migrations",
                release.database.requiredMigrationsApplied,
                release.database.requiredMigrationsTotal,
              ],
              [
                "RLS tables protected",
                release.database.rlsTablesProtected,
                release.database.rlsTablesTotal,
              ],
              [
                "Direct access denied",
                release.database.directAccessDenied,
                release.database.directAccessChecksTotal,
              ],
              [
                "Append-only triggers",
                release.database.appendOnlyTriggers,
                release.database.appendOnlyTriggersExpected,
              ],
              [
                "Required functions",
                release.database.requiredFunctionsPresent,
                release.database.requiredFunctionsTotal,
              ],
              [
                "Permission checks",
                release.database.permissionChecksPassed,
                release.database.permissionChecksTotal,
              ],
            ].map(([label, complete, total]) => {
              const passed = complete === total;
              return (
                <div
                  key={String(label)}
                  className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {label}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="font-mono text-xl font-semibold text-foreground">
                      {complete}/{total}
                    </p>
                    <LevelPill level={passed ? "ready" : "blocked"} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <CardTitle>Release gate checks</CardTitle>
            <CardDescription>
              Ready means clear, Attention requires review, and Blocked prevents
              Owner approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {readiness.checks.map((check) => (
              <div
                key={check.code}
                className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="font-mono text-xs text-muted-foreground">
                      {check.code}
                    </code>
                    <LevelPill level={check.level} />
                  </div>
                  <p className="mt-2 font-medium text-foreground">{check.label}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {check.detail}
                  </p>
                </div>
                <div className="shrink-0 font-mono text-lg font-semibold text-foreground">
                  {check.value}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <CardTitle>Release data boundary</CardTitle>
            <CardDescription>
              Release governance remains separate from user and finance data.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["User identities", "Not returned"],
              ["Finance content", "Excluded"],
              ["Runtime secrets", "Not stored"],
              ["Free-text approvals", "Disabled"],
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
