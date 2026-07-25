import Link from "next/link";
import type { ReactNode } from "react";

import { JalvoroGlobeIcon } from "@/components/icons/jalvoro/components/communication";
import {
  JalvoroCardIcon,
  JalvoroWalletIcon,
} from "@/components/icons/jalvoro/components/finance";
import { JalvoroUsersIcon } from "@/components/icons/jalvoro/components/identity";
import {
  JalvoroArrowRightIcon,
} from "@/components/icons/jalvoro/components/interface";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatAdminCount,
  formatAdminGeneratedAt,
} from "@/lib/admin/control-center";
import type { AuditedAdminGlobalOperationsSnapshot } from "@/lib/admin/global-operations-audit";
import type { AdminGlobalOperationsSignal } from "@/lib/admin/global-operations";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "info" | "healthy" | "attention" | "critical";

const toneClasses: Record<Tone, string> = {
  neutral: "border-border/70 bg-card text-foreground",
  info: "border-info/25 bg-info/7 text-info",
  healthy: "border-success/25 bg-success/7 text-success",
  attention: "border-warning/25 bg-warning/7 text-warning",
  critical: "border-destructive/25 bg-destructive/7 text-destructive",
};

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}

function CountCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: number;
  detail: string;
  icon: JalvoroIconComponent;
  tone?: Tone;
}) {
  return (
    <Card className="min-h-36 border-border/70 bg-card/88 shadow-sm">
      <CardHeader className="grid grid-cols-[1fr_auto] items-start gap-3">
        <div>
          <CardDescription className="text-xs font-semibold uppercase tracking-[0.14em]">
            {label}
          </CardDescription>
          <CardTitle className="mt-3 font-mono text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {formatAdminCount(value)}
          </CardTitle>
        </div>
        <span
          className={cn(
            "grid size-10 place-items-center rounded-2xl border",
            toneClasses[tone],
          )}
        >
          <Icon size={20} context="heading" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/80 bg-surface-secondary/35 px-4 py-7 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function SignalList({
  items,
  emptyLabel,
}: {
  items: AdminGlobalOperationsSignal[];
  emptyLabel: string;
}) {
  if (items.length === 0) return <EmptyState>{emptyLabel}</EmptyState>;

  return (
    <div className="divide-y divide-divider/70">
      {items.map((item) => (
        <div
          key={item.key}
          className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-3 first:pt-0 last:pb-0"
        >
          <span className="truncate text-sm font-medium text-foreground">
            {item.key}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {formatAdminCount(item.activeUsers)} users
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {formatAdminCount(item.events)} events
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AdminGlobalOperationsDecisionPanel({
  operations,
}: {
  operations: AuditedAdminGlobalOperationsSnapshot;
}) {
  const organizations =
    operations.organizations.sourceStatus === "registered"
      ? operations.organizations
      : null;
  const inactiveRegions = operations.regionalOperations.configuredRegions.filter(
    (region) => !region.active,
  ).length;
  const attentionSignals = [
    operations.products.suspended > 0
      ? `${formatAdminCount(operations.products.suspended)} suspended product records`
      : null,
    organizations && organizations.suspended > 0
      ? `${formatAdminCount(organizations.suspended)} suspended organizations`
      : null,
    operations.subscriptions.pastDue > 0
      ? `${formatAdminCount(operations.subscriptions.pastDue)} past-due subscriptions`
      : null,
    inactiveRegions > 0
      ? `${formatAdminCount(inactiveRegions)} inactive configured regions`
      : null,
    !organizations ? "Organization summary activation is pending" : null,
  ].filter((item): item is string => item !== null);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 pb-12">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/90 p-5 shadow-sm sm:p-7 lg:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-info/10 blur-3xl"
        />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={attentionSignals.length ? "attention" : "healthy"}>
                {attentionSignals.length ? (
                  <JalvoroWarningIcon size={14} context="compact" aria-hidden="true" />
                ) : (
                  <JalvoroSuccessIcon size={14} context="compact" aria-hidden="true" />
                )}
                {attentionSignals.length ? "Review required" : "Operational"}
              </StatusPill>
              <StatusPill>
                <JalvoroLockIcon size={14} context="compact" aria-hidden="true" />
                {operations.adminRole}
              </StatusPill>
              <StatusPill tone="info">Aggregate-only</StatusPill>
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-info">
              JALVORO Global Operations
            </p>
            <h1 className="mt-2 text-balance text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-4xl lg:text-5xl">
              Product, organization, commercial, and regional posture.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Registry-backed topology and privacy-minimised operating signals for
              the worldwide JALVORO ecosystem. Unknown or deferred sources are never
              presented as healthy adoption.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/65 px-4 py-3">
            <JalvoroClockIcon
              size={19}
              context="content"
              className="text-muted-foreground"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Snapshot generated
              </p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
                {formatAdminGeneratedAt(operations.generatedAt)} UTC
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Global operating status" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <CountCard
          label="Products"
          value={operations.products.total}
          detail={`${formatAdminCount(operations.products.active)} active registry products.`}
          icon={JalvoroDashboardIcon}
          tone="info"
        />
        <CountCard
          label="Applications"
          value={operations.products.enabledApplications}
          detail={`${formatAdminCount(operations.products.applications)} total application records.`}
          icon={JalvoroAnalyticsIcon}
          tone="healthy"
        />
        <CountCard
          label="Organizations"
          value={organizations?.total ?? 0}
          detail={
            organizations
              ? `${formatAdminCount(organizations.active)} active; source registered.`
              : "Source remains deferred; zero is not treated as adoption."
          }
          icon={JalvoroUsersIcon}
          tone={organizations ? "info" : "attention"}
        />
        <CountCard
          label="Memberships"
          value={organizations?.memberships ?? 0}
          detail={
            organizations
              ? `${formatAdminCount(organizations.activeMemberships)} active memberships.`
              : "Unavailable until the aggregate organization summary is active."
          }
          icon={JalvoroUsersIcon}
          tone={organizations ? "neutral" : "attention"}
        />
        <CountCard
          label="Subscriptions"
          value={operations.subscriptions.total}
          detail={`${formatAdminCount(operations.subscriptions.activePaid)} active paid records.`}
          icon={JalvoroCardIcon}
        />
        <CountCard
          label="Past due"
          value={operations.subscriptions.pastDue}
          detail="Connected commercial records requiring recovery review."
          icon={JalvoroWarningIcon}
          tone={operations.subscriptions.pastDue > 0 ? "critical" : "healthy"}
        />
      </section>

      {attentionSignals.length ? (
        <section className="rounded-[1.4rem] border border-warning/25 bg-warning/7 p-5" aria-labelledby="global-attention-heading">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-warning/25 bg-background/60 text-warning">
              <JalvoroPendingIcon size={20} context="heading" aria-hidden="true" />
            </span>
            <div>
              <h2 id="global-attention-heading" className="font-semibold text-foreground">
                Operating attention
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {attentionSignals.map((signal) => (
                  <StatusPill key={signal} tone="attention">
                    {signal}
                  </StatusPill>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 2xl:grid-cols-[1.45fr_0.75fr]">
        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <CardTitle>Product registry</CardTitle>
            <CardDescription>
              Lifecycle, application, module, deployment, and governance coverage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {operations.products.items.length === 0 ? (
              <EmptyState>No products are registered.</EmptyState>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border/70">
                <table className="w-full min-w-[880px] text-left text-sm">
                  <thead className="bg-surface-secondary/70 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Product</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Apps / modules</th>
                      <th className="px-4 py-3 font-semibold">Coverage</th>
                      <th className="px-4 py-3 font-semibold">Governance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider/70">
                    {operations.products.items.map((product) => (
                      <tr key={product.productKey}>
                        <td className="px-4 py-4 align-top">
                          <p className="font-medium text-foreground">{product.name}</p>
                          <code className="font-mono text-xs text-muted-foreground">
                            {product.productKey}
                          </code>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {product.familyName}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <StatusPill
                            tone={
                              product.registrationStatus === "active"
                                ? "healthy"
                                : product.registrationStatus === "suspended"
                                  ? "critical"
                                  : "attention"
                            }
                          >
                            {product.registrationStatus.replaceAll("_", " ")}
                          </StatusPill>
                          <p className="mt-2 text-xs capitalize text-muted-foreground">
                            {product.lifecycleStatus.replaceAll("_", " ")}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top font-mono text-xs text-muted-foreground">
                          <p>{formatAdminCount(product.enabledApplications)} / {formatAdminCount(product.applications)} apps</p>
                          <p className="mt-1">{formatAdminCount(product.enabledModules)} / {formatAdminCount(product.modules)} modules</p>
                        </td>
                        <td className="px-4 py-4 align-top text-xs text-muted-foreground">
                          <p>{product.environments.join(", ") || "No environments"}</p>
                          <p className="mt-1">{product.regions.join(", ") || "No regions"}</p>
                          <p className="mt-1">{product.platforms.join(", ") || "No platforms"}</p>
                        </td>
                        <td className="px-4 py-4 align-top text-xs text-muted-foreground">
                          <p className="capitalize">{product.dataClassification}</p>
                          <p className="mt-1 font-mono">{formatAdminCount(product.retentionDays)} days</p>
                          <p className="mt-1 font-mono">{formatAdminCount(product.services)} services</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Organization control</CardTitle>
                <CardDescription className="mt-1">
                  Registered lifecycle and tenant-authority aggregates.
                </CardDescription>
              </div>
              <JalvoroUsersIcon size={22} context="heading" className="text-info" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent>
            {organizations ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Draft", organizations.draft],
                    ["Active", organizations.active],
                    ["Suspended", organizations.suspended],
                    ["Closed", organizations.closed],
                    ["Active memberships", organizations.activeMemberships],
                    ["Active admin grants", organizations.activeAdminGrants],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-2xl border border-border/70 bg-background/55 p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-1 font-mono text-xl font-semibold text-foreground">
                        {formatAdminCount(Number(value))}
                      </p>
                    </div>
                  ))}
                </div>
                <Link
                  href="/admin/organizations"
                  className="finance-focus inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-info/30 bg-info/8 px-4 py-2.5 text-sm font-semibold text-info transition hover:bg-info/12"
                >
                  Open Organization Operations
                  <JalvoroArrowRightIcon size={17} context="compact" aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <EmptyState>
                The private organization registry exists, but its aggregate summary
                has not yet been activated in this snapshot contract.
              </EmptyState>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="commercial-state-heading" className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-info">
              Commercial operations
            </p>
            <h2 id="commercial-state-heading" className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Subscription state
            </h2>
          </div>
          <StatusPill tone="info">Provider identifiers excluded</StatusPill>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          {[
            ["Total", operations.subscriptions.total, JalvoroCardIcon, "neutral"],
            ["Free", operations.subscriptions.free, JalvoroWalletIcon, "info"],
            ["Trialing", operations.subscriptions.trialing, JalvoroPendingIcon, "attention"],
            ["Active paid", operations.subscriptions.activePaid, JalvoroSuccessIcon, "healthy"],
            ["Past due", operations.subscriptions.pastDue, JalvoroWarningIcon, operations.subscriptions.pastDue > 0 ? "critical" : "healthy"],
            ["Cancelled", operations.subscriptions.cancelled, JalvoroInfoIcon, "neutral"],
            ["Ending", operations.subscriptions.cancelAtPeriodEnd, JalvoroClockIcon, "attention"],
          ].map(([label, value, Icon, tone]) => (
            <CountCard
              key={String(label)}
              label={String(label)}
              value={Number(value)}
              detail="Controlled subscription status count."
              icon={Icon as JalvoroIconComponent}
              tone={tone as Tone}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <JalvoroGlobeIcon size={22} context="heading" className="text-info" aria-hidden="true" />
              <div>
                <CardTitle>Configured regions</CardTitle>
                <CardDescription>Registry-backed operating regions.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {operations.regionalOperations.configuredRegions.length ? (
              <div className="divide-y divide-divider/70">
                {operations.regionalOperations.configuredRegions.map((region) => (
                  <div key={region.regionKey} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{region.name}</p>
                      <code className="font-mono text-xs text-muted-foreground">{region.regionKey}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill tone={region.active ? "healthy" : "attention"}>{region.active ? "Active" : "Inactive"}</StatusPill>
                      <span className="font-mono text-xs text-muted-foreground">{formatAdminCount(region.products)} products</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>No regions are registered.</EmptyState>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <CardTitle>Countries — 30 days</CardTitle>
            <CardDescription>Approximate country codes without raw IP storage.</CardDescription>
          </CardHeader>
          <CardContent>
            {operations.regionalOperations.countries30d.length ? (
              <div className="divide-y divide-divider/70">
                {operations.regionalOperations.countries30d.map((country) => (
                  <div key={country.countryCode} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <code className="font-mono text-sm font-semibold text-foreground">{country.countryCode}</code>
                    <span className="font-mono text-xs text-muted-foreground">{formatAdminCount(country.activeUsers)} users</span>
                    <span className="font-mono text-xs text-muted-foreground">{formatAdminCount(country.events)} events</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>No country telemetry has been recorded in 30 days.</EmptyState>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <CardTitle>Device distribution</CardTitle>
            <CardDescription>Broad privacy-safe device classes over 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <SignalList items={operations.platformAnalytics.devices30d} emptyLabel="Device telemetry is not active yet." />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-success/20 bg-success/5 shadow-sm">
          <CardHeader><CardTitle>Server resolved</CardTitle></CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            One authenticated aggregate RPC resolves topology, commercial, organization, and regional state.
          </CardContent>
        </Card>
        <Card className="border-info/20 bg-info/5 shadow-sm">
          <CardHeader><CardTitle>Privacy minimised</CardTitle></CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            No emails, raw user IDs, session IDs, provider identifiers, finance content, raw IP addresses, or city data.
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader><CardTitle>Runtime analytics</CardTitle></CardHeader>
          <CardContent>
            <SignalList items={operations.platformAnalytics.applicationVersions30d} emptyLabel="Application-version telemetry is not active yet." />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
