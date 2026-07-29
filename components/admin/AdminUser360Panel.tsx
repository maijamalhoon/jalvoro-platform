import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatAdminGeneratedAt } from "@/lib/admin/control-center";
import type { CommandCenterUser360 } from "@/lib/admin/user-360";
import { cn } from "@/lib/utils";

function date(value: string | null) {
  return value ? formatAdminGeneratedAt(value) : "Not recorded";
}

function sentence(value: string) {
  return value.replaceAll("_", " ");
}

function Status({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "positive" | "warning" | "danger" | "info";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize",
        tone === "neutral" && "border-border/70 bg-background text-muted-foreground",
        tone === "positive" && "border-success/25 bg-success/5 text-success",
        tone === "warning" && "border-warning/25 bg-warning/5 text-warning",
        tone === "danger" && "border-destructive/25 bg-destructive/5 text-destructive",
        tone === "info" && "border-info/25 bg-info/5 text-info",
      )}
    >
      {children}
    </span>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="cc360-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function EmptyEvidence({ children }: { children: React.ReactNode }) {
  return (
    <div className="cc360-empty">
      <strong>No fabricated data</strong>
      <p>{children}</p>
    </div>
  );
}

function locationLabel(user: CommandCenterUser360) {
  const device = user.latestDevice;
  if (!device) return "Not observed";
  return [device.city, device.regionCode, device.countryCode]
    .filter(Boolean)
    .join(", ") || "Unknown";
}

function accountTone(status: CommandCenterUser360["identity"]["accountStatus"]) {
  if (status === "active") return "positive" as const;
  if (status === "banned") return "danger" as const;
  return "warning" as const;
}

function billingTone(status: CommandCenterUser360["billing"]["status"]) {
  if (status === "active") return "positive" as const;
  if (status === "past_due" || status === "incomplete") return "danger" as const;
  if (status === "trialing") return "info" as const;
  if (status === "paused") return "warning" as const;
  return "neutral" as const;
}

export default function AdminUser360Panel({
  user,
  selectedReference,
  lookupState,
}: {
  user: CommandCenterUser360 | null;
  selectedReference: string | null;
  lookupState: "idle" | "invalid" | "missing" | "forbidden" | "unavailable" | "loaded";
}) {
  return (
    <section className="cc360-workspace" aria-labelledby="cc360-title">
      <header className="cc360-head">
        <div>
          <p className="cc-workspace-kicker">Identity intelligence</p>
          <h1 id="cc360-title">User 360 investigation</h1>
          <p>
            Audited account, access, subscription, organization, device,
            approximate location and product-activity context. Raw IP, exact GPS,
            finance values and replay are excluded.
          </p>
        </div>
        <Status tone="info">Every lookup is audited</Status>
      </header>

      <Card className="cc360-search-card">
        <CardHeader>
          <CardTitle>Locate an account</CardTitle>
          <CardDescription>
            Use the opaque USR reference from the live account directory. This
            avoids exposing identities in URLs or broad search results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" action="/admin" className="cc360-search-form">
            <input type="hidden" name="view" value="users" />
            <label>
              <span>User reference</span>
              <input
                name="user"
                defaultValue={selectedReference ?? ""}
                pattern="USR-[A-Fa-f0-9]{12}"
                maxLength={16}
                placeholder="USR-A1B2C3D4E5F6"
                autoComplete="off"
                spellCheck={false}
                required
              />
            </label>
            <button type="submit">Open audited profile</button>
            {selectedReference ? (
              <Link href="/admin?view=users">Clear</Link>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {lookupState === "idle" ? (
        <EmptyEvidence>
          Select a real account from the directory below to open its complete
          authorized profile.
        </EmptyEvidence>
      ) : null}
      {lookupState === "invalid" ? (
        <div className="cc360-alert" data-tone="danger">
          The reference is invalid. Use the exact USR-XXXXXXXXXXXX format.
        </div>
      ) : null}
      {lookupState === "missing" ? (
        <div className="cc360-alert" data-tone="warning">
          That account does not exist or is no longer active in the platform directory.
        </div>
      ) : null}
      {lookupState === "forbidden" ? (
        <div className="cc360-alert" data-tone="danger">
          Your current Command Center role cannot open this profile.
        </div>
      ) : null}
      {lookupState === "unavailable" ? (
        <div className="cc360-alert" data-tone="danger">
          User intelligence could not be loaded. The lookup was not replaced with
          placeholder information.
        </div>
      ) : null}

      {user ? (
        <div className="cc360-profile">
          <section className="cc360-identity-banner">
            <div>
              <div className="cc360-badges">
                <Status tone={accountTone(user.identity.accountStatus)}>
                  {sentence(user.identity.accountStatus)}
                </Status>
                <Status>{user.identity.onboardingStatus} onboarding</Status>
                <Status tone="info">{user.viewerRole} view</Status>
              </div>
              <h2>{user.identity.fullName ?? user.identity.email}</h2>
              <p>{user.identity.userReference}</p>
            </div>
            <div className="cc360-snapshot-time">
              <span>Profile generated</span>
              <strong>{formatAdminGeneratedAt(user.generatedAt)} UTC</strong>
            </div>
          </section>

          <div className="cc360-grid cc360-grid-primary">
            <Card>
              <CardHeader>
                <CardTitle>Identity and authentication</CardTitle>
                <CardDescription>Authoritative account state from Supabase Auth.</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="cc360-fields">
                  <Field label="Email" value={user.identity.email} />
                  <Field label="Email visibility" value={user.identity.emailVisibility} />
                  <Field label="Phone" value={user.identity.maskedPhone ?? "Not provided"} />
                  <Field label="Auth provider" value={user.identity.provider} />
                  <Field label="Preferred currency" value={user.identity.preferredCurrency} />
                  <Field label="Account created" value={date(user.identity.createdAt)} />
                  <Field label="Email confirmed" value={date(user.identity.emailConfirmedAt)} />
                  <Field label="Phone confirmed" value={date(user.identity.phoneConfirmedAt)} />
                  <Field label="Last sign-in" value={date(user.identity.lastSignInAt)} />
                  <Field label="Ban expires" value={date(user.identity.bannedUntil)} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Commercial relationship</CardTitle>
                <CardDescription>
                  Provider-neutral plan state without payment credentials or provider IDs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="cc360-badges cc360-card-badges">
                  <Status tone={billingTone(user.billing.status)}>
                    {sentence(user.billing.status)}
                  </Status>
                  <Status>{user.billing.planKind}</Status>
                  {user.billing.cancelAtPeriodEnd ? (
                    <Status tone="warning">Cancels at period end</Status>
                  ) : null}
                </div>
                <dl className="cc360-fields">
                  <Field label="Plan" value={user.billing.planName} />
                  <Field label="Plan code" value={user.billing.planCode} />
                  <Field label="Provider" value={user.billing.provider} />
                  <Field label="Trial ends" value={date(user.billing.trialEndsAt)} />
                  <Field label="Period starts" value={date(user.billing.currentPeriodStart)} />
                  <Field label="Period ends" value={date(user.billing.currentPeriodEnd)} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Latest device and location</CardTitle>
                <CardDescription>
                  Privacy-minimised session evidence. Location is approximate and
                  derived from edge geo headers, never exact GPS.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user.latestDevice ? (
                  <dl className="cc360-fields">
                    <Field label="Approximate location" value={locationLabel(user)} />
                    <Field label="Precision" value={sentence(user.latestDevice.locationPrecision)} />
                    <Field label="Device" value={user.latestDevice.deviceType} />
                    <Field label="Operating system" value={user.latestDevice.osFamily} />
                    <Field label="Browser" value={user.latestDevice.browserFamily} />
                    <Field label="App revision" value={user.latestDevice.appVersion ?? "Not recorded"} />
                    <Field label="Last route" value={<code>{user.latestDevice.route}</code>} />
                    <Field label="Observed" value={date(user.latestDevice.observedAt)} />
                  </dl>
                ) : (
                  <EmptyEvidence>
                    No consent-compatible product telemetry has been observed for
                    this account yet, so device and location are intentionally blank.
                  </EmptyEvidence>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="cc360-metrics">
            <div><span>Sessions · 30 days</span><strong>{user.activity.sessions30d}</strong></div>
            <div><span>Events · 30 days</span><strong>{user.activity.events30d}</strong></div>
            <div><span>Failed operations</span><strong>{user.activity.failedOperations30d}</strong></div>
            <div><span>Organizations</span><strong>{user.organizations.length}</strong></div>
          </div>

          <div className="cc360-grid cc360-grid-secondary">
            <Card>
              <CardHeader>
                <CardTitle>Recent sessions</CardTitle>
                <CardDescription>
                  Hashed session references with the most recent device context.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user.recentSessions.length ? (
                  <div className="cc360-table-wrap">
                    <table className="cc360-table">
                      <thead><tr><th>Session</th><th>Device</th><th>Location</th><th>Last route</th><th>Last seen</th></tr></thead>
                      <tbody>
                        {user.recentSessions.map((session) => (
                          <tr key={session.sessionReference}>
                            <td><code>{session.sessionReference}</code></td>
                            <td>{session.deviceType} · {session.osFamily} · {session.browserFamily}</td>
                            <td>{[session.city, session.regionCode, session.countryCode].filter(Boolean).join(", ") || "Unknown"}</td>
                            <td><code>{session.lastRoute}</code></td>
                            <td>{date(session.lastSeenAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyEvidence>No product sessions have been observed in the last 30 days.</EmptyEvidence>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product routes</CardTitle>
                <CardDescription>Most-used protected routes over the last 30 days.</CardDescription>
              </CardHeader>
              <CardContent>
                {user.activity.topRoutes.length ? (
                  <div className="cc360-list">
                    {user.activity.topRoutes.map((route) => (
                      <div key={route.route}>
                        <code>{route.route}</code>
                        <span>{route.events} events · {date(route.lastSeenAt)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyEvidence>No protected product-route activity is available.</EmptyEvidence>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="cc360-grid cc360-grid-secondary">
            <Card>
              <CardHeader>
                <CardTitle>Organizations and roles</CardTitle>
                <CardDescription>Tenant relationships and lifecycle state.</CardDescription>
              </CardHeader>
              <CardContent>
                {user.organizations.length ? (
                  <div className="cc360-list">
                    {user.organizations.map((organization) => (
                      <Link
                        key={organization.membershipCode}
                        href={`/admin?view=organizations&organization=${organization.organizationCode}`}
                        className="cc360-list-link"
                      >
                        <span>
                          <strong>{organization.displayName}</strong>
                          <small>{organization.organizationCode} · {sentence(organization.membershipRole)}</small>
                        </span>
                        <span className="cc360-badges">
                          <Status tone={organization.membershipStatus === "active" ? "positive" : "warning"}>
                            {organization.membershipStatus}
                          </Status>
                          <Status>{organization.dataClassification}</Status>
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyEvidence>This account has no Command Center organization membership.</EmptyEvidence>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk and review signals</CardTitle>
                <CardDescription>
                  Deterministic signals only. No opaque AI risk score is fabricated.
                </CardDescription>
              </CardHeader>
              <CardContent className="cc360-risk-grid">
                {[
                  ["Email unconfirmed", user.riskSignals.emailUnconfirmed],
                  ["Never signed in", user.riskSignals.neverSignedIn],
                  ["Inactive 90+ days", user.riskSignals.inactive90d],
                  ["Currently banned", user.riskSignals.currentlyBanned],
                  ["Telemetry unavailable", user.riskSignals.telemetryUnavailable],
                ].map(([label, flagged]) => (
                  <div key={String(label)} data-flagged={String(flagged)}>
                    <span>{label}</span>
                    <strong>{flagged ? "Review" : "Clear"}</strong>
                  </div>
                ))}
                <div data-flagged={String(user.riskSignals.failedOperations30d > 0)}>
                  <span>Failed operations · 30d</span>
                  <strong>{user.riskSignals.failedOperations30d}</strong>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="cc360-boundary">
            <CardHeader>
              <CardTitle>Enforced privacy boundary</CardTitle>
              <CardDescription>
                The database contract and parser reject forbidden fields before rendering.
              </CardDescription>
            </CardHeader>
            <CardContent className="cc360-boundary-grid">
              <div><span>Raw IP</span><strong>Excluded</strong></div>
              <div><span>Exact GPS</span><strong>Excluded</strong></div>
              <div><span>Finance values</span><strong>Excluded</strong></div>
              <div><span>Session replay</span><strong>Excluded</strong></div>
              <div><span>Free-form content</span><strong>Excluded</strong></div>
              <div><span>Audit record</span><strong>Required</strong></div>
              <div><span>Telemetry retention</span><strong>{user.privacyBoundary.telemetryRetentionDays} days</strong></div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
