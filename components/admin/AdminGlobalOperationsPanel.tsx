import type { ReactNode } from "react";

import { JalvoroGlobeIcon } from "@/components/icons/jalvoro/components/communication";
import {
  JalvoroCardIcon,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatAdminCount, formatAdminGeneratedAt } from "@/lib/admin/control-center";
import type {
  AdminGlobalOperationsConfiguredRegion,
  AdminGlobalOperationsCountrySignal,
  AdminGlobalOperationsRegionSignal,
  AdminGlobalOperationsSignal,
  AdminGlobalOperationsSnapshot,
} from "@/lib/admin/global-operations";
import { cn } from "@/lib/utils";

const toneClasses = {
  neutral: "border-border/70 bg-card text-foreground",
  info: "border-info/20 bg-info/5 text-info",
  positive: "border-success/20 bg-success/5 text-success",
  warning: "border-warning/20 bg-warning/5 text-warning",
  danger: "border-destructive/20 bg-destructive/5 text-destructive",
} as const;

type Tone = keyof typeof toneClasses;

type MetricCardProps = {
  label: string;
  value: number;
  detail: string;
  icon: JalvoroIconComponent;
  tone?: Tone;
};

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
}: MetricCardProps) {
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
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
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

function CountryList({
  items,
}: {
  items: AdminGlobalOperationsCountrySignal[];
}) {
  if (items.length === 0) {
    return <EmptyState>No country telemetry has been recorded in 30 days.</EmptyState>;
  }

  return (
    <div className="divide-y divide-divider/70">
      {items.map((item) => (
        <div
          key={item.countryCode}
          className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-3 first:pt-0 last:pb-0"
        >
          <code className="font-mono text-sm font-semibold text-foreground">
            {item.countryCode}
          </code>
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

function RegionSignalList({
  items,
}: {
  items: AdminGlobalOperationsRegionSignal[];
}) {
  if (items.length === 0) {
    return <EmptyState>No regional telemetry has been recorded in 30 days.</EmptyState>;
  }

  return (
    <div className="divide-y divide-divider/70">
      {items.map((item) => (
        <div
          key={item.regionCode}
          className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-3 first:pt-0 last:pb-0"
        >
          <code className="truncate font-mono text-sm font-semibold text-foreground">
            {item.regionCode}
          </code>
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

function ConfiguredRegionList({
  items,
}: {
  items: AdminGlobalOperationsConfiguredRegion[];
}) {
  if (items.length === 0) {
    return <EmptyState>No product regions are registered.</EmptyState>;
  }

  return (
    <div className="divide-y divide-divider/70">
      {items.map((item) => (
        <div
          key={item.regionKey}
          className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
            <code className="font-mono text-xs text-muted-foreground">
              {item.regionKey}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill tone={item.active ? "positive" : "warning"}>
              {item.active ? "Active" : "Inactive"}
            </StatusPill>
            <span className="font-mono text-xs text-muted-foreground">
              {formatAdminCount(item.products)} products
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminGlobalOperationsPanel({
  operations,
}: {
  operations: AdminGlobalOperationsSnapshot;
}) {
  const organizationsUnavailable =
    operations.organizations.sourceStatus === "not_registered";

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/92 p-5 shadow-sm sm:p-7 lg:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-info/8 blur-3xl"
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone="positive">
                <JalvoroLockIcon
                  size={14}
                  context="compact"
                  className="mr-1.5"
                  aria-hidden="true"
                />
                Private operations surface
              </StatusPill>
              <StatusPill>{operations.adminRole}</StatusPill>
              <StatusPill tone="info">Aggregate-only</StatusPill>
            </div>
            <h1 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl lg:text-5xl">
              Global Operations
            </h1>
            <p className="mt-3 max-w-2xl text-pretty text-sm leading-7 text-muted-foreground sm:text-base">
              Registered product topology, subscription state, regional reach and
              platform distribution for the worldwide JALVORO control plane.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm">
            <JalvoroClockIcon
              size={18}
              context="content"
              className="text-muted-foreground"
              aria-hidden="true"
            />
            <div>
              <p className="font-medium text-foreground">Snapshot generated</p>
              <p className="font-mono text-xs text-muted-foreground">
                {formatAdminGeneratedAt(operations.generatedAt)} UTC
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="global-operations-overview" className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-info">
            Ecosystem
          </p>
          <h2
            id="global-operations-overview"
            className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          >
            Worldwide operating posture
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard
            label="Products"
            value={operations.products.total}
            detail="Registered products in the controlled Product Registry."
            icon={JalvoroDashboardIcon}
            tone="info"
          />
          <MetricCard
            label="Active products"
            value={operations.products.active}
            detail="Products with an activated, validated manifest."
            icon={JalvoroSuccessIcon}
            tone="positive"
          />
          <MetricCard
            label="Applications"
            value={operations.products.enabledApplications}
            detail={`${formatAdminCount(operations.products.applications)} registered application records.`}
            icon={JalvoroAnalyticsIcon}
          />
          <MetricCard
            label="Modules"
            value={operations.products.enabledModules}
            detail={`${formatAdminCount(operations.products.modules)} registered module records.`}
            icon={JalvoroDashboardIcon}
          />
          <MetricCard
            label="Subscriptions"
            value={operations.subscriptions.total}
            detail="Commercial subscription state without provider identifiers."
            icon={JalvoroCardIcon}
          />
          <MetricCard
            label="Organizations"
            value={operations.organizations.total}
            detail="Unavailable until an organization source is registered."
            icon={JalvoroUsersIcon}
            tone={organizationsUnavailable ? "warning" : "positive"}
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Product overview</CardTitle>
                <CardDescription className="mt-1">
                  Registry-backed lifecycle, coverage and platform topology.
                </CardDescription>
              </div>
              <StatusPill tone="info">
                {formatAdminCount(operations.products.families)} families
              </StatusPill>
            </div>
          </CardHeader>
          <CardContent>
            {operations.products.items.length === 0 ? (
              <EmptyState>No products are registered.</EmptyState>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border/70">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-surface-secondary/70 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Product</th>
                      <th className="px-4 py-3 font-semibold">Lifecycle</th>
                      <th className="px-4 py-3 font-semibold">Applications</th>
                      <th className="px-4 py-3 font-semibold">Modules</th>
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
                                ? "positive"
                                : product.registrationStatus === "suspended"
                                  ? "danger"
                                  : "warning"
                            }
                          >
                            {product.registrationStatus.replaceAll("_", " ")}
                          </StatusPill>
                          <p className="mt-2 text-xs capitalize text-muted-foreground">
                            {product.lifecycleStatus.replaceAll("_", " ")}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top font-mono text-xs text-muted-foreground">
                          {formatAdminCount(product.enabledApplications)} enabled /{" "}
                          {formatAdminCount(product.applications)} total
                        </td>
                        <td className="px-4 py-4 align-top font-mono text-xs text-muted-foreground">
                          {formatAdminCount(product.enabledModules)} enabled /{" "}
                          {formatAdminCount(product.modules)} total
                        </td>
                        <td className="px-4 py-4 align-top text-xs text-muted-foreground">
                          <p>{product.environments.join(", ") || "No environments"}</p>
                          <p className="mt-1">{product.regions.join(", ") || "No regions"}</p>
                          <p className="mt-1">{product.platforms.join(", ") || "No platforms"}</p>
                        </td>
                        <td className="px-4 py-4 align-top text-xs text-muted-foreground">
                          <p className="capitalize">{product.dataClassification}</p>
                          <p className="mt-1 font-mono">
                            {formatAdminCount(product.retentionDays)} days
                          </p>
                          <p className="mt-1 font-mono">
                            {formatAdminCount(product.services)} services
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-warning/20 bg-warning/5 shadow-sm">
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-warning/20 bg-background/70 text-warning">
                  <JalvoroPendingIcon size={21} context="heading" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Organization operations</CardTitle>
                  <CardDescription className="mt-1 leading-6">
                    The source is intentionally marked unavailable.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>No organization or membership model is registered in this data plane.</p>
              <p>No zero-valued organization count is represented as production adoption.</p>
              <p>Management actions remain disabled until scoped organization entities exist.</p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/88 shadow-sm">
            <CardHeader>
              <CardTitle>Environments</CardTitle>
              <CardDescription>Registered product deployment coverage.</CardDescription>
            </CardHeader>
            <CardContent>
              {operations.products.environments.length === 0 ? (
                <EmptyState>No environments are registered.</EmptyState>
              ) : (
                <div className="divide-y divide-divider/70">
                  {operations.products.environments.map((environment) => (
                    <div
                      key={environment.environmentKey}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {environment.name}
                        </p>
                        <code className="font-mono text-xs text-muted-foreground">
                          {environment.environmentKey}
                        </code>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill tone={environment.active ? "positive" : "warning"}>
                          {environment.active ? "Active" : "Inactive"}
                        </StatusPill>
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatAdminCount(environment.products)} products
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section aria-labelledby="subscription-operations-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-info">
              Commercial operations
            </p>
            <h2
              id="subscription-operations-heading"
              className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
            >
              Subscription visibility
            </h2>
          </div>
          <StatusPill tone="info">Provider identifiers excluded</StatusPill>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
          <MetricCard
            label="Total"
            value={operations.subscriptions.total}
            detail="Subscription records across all statuses."
            icon={JalvoroCardIcon}
          />
          <MetricCard
            label="Free"
            value={operations.subscriptions.free}
            detail="Free commercial status records."
            icon={JalvoroWalletIcon}
            tone="info"
          />
          <MetricCard
            label="Trialing"
            value={operations.subscriptions.trialing}
            detail="Trials currently in progress."
            icon={JalvoroPendingIcon}
            tone="warning"
          />
          <MetricCard
            label="Active paid"
            value={operations.subscriptions.activePaid}
            detail="Paid plans with active status."
            icon={JalvoroSuccessIcon}
            tone="positive"
          />
          <MetricCard
            label="Past due"
            value={operations.subscriptions.pastDue}
            detail="Payment recovery is required."
            icon={JalvoroWarningIcon}
            tone={operations.subscriptions.pastDue > 0 ? "danger" : "positive"}
          />
          <MetricCard
            label="Cancelled"
            value={operations.subscriptions.cancelled}
            detail="Cancelled or expired records."
            icon={JalvoroInfoIcon}
          />
          <MetricCard
            label="Ending"
            value={operations.subscriptions.cancelAtPeriodEnd}
            detail="Scheduled to cancel at period end."
            icon={JalvoroClockIcon}
            tone="warning"
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <JalvoroGlobeIcon
                size={22}
                context="heading"
                className="text-info"
                aria-hidden="true"
              />
              <div>
                <CardTitle>Configured regions</CardTitle>
                <CardDescription>Registry-backed operating regions.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ConfiguredRegionList items={operations.regionalOperations.configuredRegions} />
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <CardTitle>Countries — 30 days</CardTitle>
            <CardDescription>
              Approximate country codes without raw IP storage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CountryList items={operations.regionalOperations.countries30d} />
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <CardTitle>Regional signals — 30 days</CardTitle>
            <CardDescription>Coarse regional codes from approved telemetry.</CardDescription>
          </CardHeader>
          <CardContent>
            <RegionSignalList items={operations.regionalOperations.regionCodes30d} />
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="platform-analytics-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-info">
              Platform analytics
            </p>
            <h2
              id="platform-analytics-heading"
              className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
            >
              Device and runtime distribution
            </h2>
          </div>
          <StatusPill tone="positive">Session replay disabled</StatusPill>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border/70 bg-card/88 shadow-sm">
            <CardHeader>
              <CardTitle>Devices</CardTitle>
              <CardDescription>Broad device classes over 30 days.</CardDescription>
            </CardHeader>
            <CardContent>
              <SignalList
                items={operations.platformAnalytics.devices30d}
                emptyLabel="Device telemetry is not active yet."
              />
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-card/88 shadow-sm">
            <CardHeader>
              <CardTitle>Operating systems</CardTitle>
              <CardDescription>OS families over 30 days.</CardDescription>
            </CardHeader>
            <CardContent>
              <SignalList
                items={operations.platformAnalytics.operatingSystems30d}
                emptyLabel="Operating-system telemetry is not active yet."
              />
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-card/88 shadow-sm">
            <CardHeader>
              <CardTitle>Browsers</CardTitle>
              <CardDescription>Browser families over 30 days.</CardDescription>
            </CardHeader>
            <CardContent>
              <SignalList
                items={operations.platformAnalytics.browsers30d}
                emptyLabel="Browser telemetry is not active yet."
              />
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-card/88 shadow-sm">
            <CardHeader>
              <CardTitle>Application versions</CardTitle>
              <CardDescription>Approved version labels over 30 days.</CardDescription>
            </CardHeader>
            <CardContent>
              <SignalList
                items={operations.platformAnalytics.applicationVersions30d}
                emptyLabel="Application-version telemetry is not active yet."
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-success/20 bg-success/5 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <JalvoroSuccessIcon
                size={22}
                context="heading"
                className="text-success"
                aria-hidden="true"
              />
              <CardTitle>Server resolved</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            One authenticated aggregate RPC resolves the operational contract. No
            client-side database query or permission calculation is used.
          </CardContent>
        </Card>
        <Card className="border-info/20 bg-info/5 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <JalvoroInfoIcon
                size={22}
                context="heading"
                className="text-info"
                aria-hidden="true"
              />
              <CardTitle>Privacy minimised</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            The response excludes emails, user IDs, subject IDs, session IDs,
            provider identifiers, finance content, raw IP addresses and city data.
          </CardContent>
        </Card>
        <Card className="border-warning/20 bg-warning/5 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <JalvoroWarningIcon
                size={22}
                context="heading"
                className="text-warning"
                aria-hidden="true"
              />
              <CardTitle>Organization source pending</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            Organization management remains deliberately unavailable until a
            multi-tenant organization and membership source is registered.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
