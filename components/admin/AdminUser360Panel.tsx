import Link from "next/link";

import { formatAdminGeneratedAt } from "@/lib/admin/control-center";
import type { CommandCenterUser360 } from "@/lib/admin/user-360";
import { cn } from "@/lib/utils";

function date(value: string | null) {
  return value ? formatAdminGeneratedAt(value) : "Not observed";
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
    <span className={cn("cc360-next-status", `cc360-next-status-${tone}`)}>
      {children}
    </span>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="cc360-next-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function EvidenceState({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="cc-next-state" data-state="waiting">
      <strong>{title}</strong>
      <span>{children}</span>
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
    <section className="cc360-next" aria-labelledby="cc360-next-title">
      <header className="cc360-next-head">
        <div>
          <span className="cc-next-eyebrow">IDENTITY OPERATIONS</span>
          <h1 id="cc360-next-title">User profile</h1>
          <p>Search a real account reference, inspect authorized evidence and keep every lookup audited.</p>
        </div>
        <Status tone="info">Audited</Status>
      </header>

      <form method="get" action="/admin" className="cc360-next-search">
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
        <button type="submit">Open user</button>
        {selectedReference ? <Link href="/admin?view=users">Clear</Link> : null}
        <span>Opaque reference only · raw identity search disabled</span>
      </form>

      {lookupState === "idle" ? (
        <EvidenceState title="No user selected">
          Choose an account from the directory below or enter its USR reference.
        </EvidenceState>
      ) : null}
      {lookupState === "invalid" ? (
        <div className="cc360-next-alert" data-tone="danger">Use the exact USR-XXXXXXXXXXXX format.</div>
      ) : null}
      {lookupState === "missing" ? (
        <div className="cc360-next-alert" data-tone="warning">The account does not exist or is no longer active.</div>
      ) : null}
      {lookupState === "forbidden" ? (
        <div className="cc360-next-alert" data-tone="danger">Your operator role cannot open this profile.</div>
      ) : null}
      {lookupState === "unavailable" ? (
        <div className="cc360-next-alert" data-tone="danger">User evidence is temporarily unavailable. No placeholder data was inserted.</div>
      ) : null}

      {user ? (
        <div className="cc360-next-profile">
          <header className="cc360-next-identity">
            <div className="cc360-next-avatar" aria-hidden="true">
              {(user.identity.fullName ?? user.identity.email).slice(0, 1).toUpperCase()}
            </div>
            <div className="cc360-next-identity-copy">
              <div className="cc360-next-badges">
                <Status tone={accountTone(user.identity.accountStatus)}>{sentence(user.identity.accountStatus)}</Status>
                <Status>{user.identity.onboardingStatus}</Status>
                <Status tone="info">{user.viewerRole}</Status>
              </div>
              <h2>{user.identity.fullName ?? user.identity.email}</h2>
              <p>{user.identity.userReference} · {user.identity.provider} · {user.billing.planName}</p>
            </div>
            <div className="cc360-next-generated">
              <span>Generated</span>
              <strong>{formatAdminGeneratedAt(user.generatedAt)} UTC</strong>
            </div>
          </header>

          <nav className="cc360-next-jump" aria-label="User profile sections">
            <a href="#cc360-summary">Summary</a>
            <a href="#cc360-sessions">Sessions</a>
            <a href="#cc360-organizations">Organizations</a>
            <a href="#cc360-activity">Activity</a>
            <a href="#cc360-boundary">Boundary</a>
          </nav>

          <div className="cc360-next-metrics" aria-label="User activity metrics">
            <div><span>Sessions · 30d</span><strong>{user.activity.sessions30d}</strong></div>
            <div><span>Events · 30d</span><strong>{user.activity.events30d}</strong></div>
            <div data-tone={user.activity.failedOperations30d > 0 ? "danger" : "clear"}><span>Failed operations</span><strong>{user.activity.failedOperations30d}</strong></div>
            <div><span>Organizations</span><strong>{user.organizations.length}</strong></div>
          </div>

          <div className="cc360-next-layout">
            <main className="cc360-next-main">
              <section id="cc360-summary" className="cc360-next-section">
                <header><span className="cc-next-eyebrow">SUMMARY</span><h3>Identity</h3></header>
                <dl className="cc360-next-fields">
                  <Field label="Email" value={user.identity.email} />
                  <Field label="Visibility" value={user.identity.emailVisibility} />
                  <Field label="Phone" value={user.identity.maskedPhone ?? "Not provided"} />
                  <Field label="Provider" value={user.identity.provider} />
                  <Field label="Currency" value={user.identity.preferredCurrency} />
                  <Field label="Joined" value={date(user.identity.createdAt)} />
                  <Field label="Email verified" value={date(user.identity.emailConfirmedAt)} />
                  <Field label="Phone verified" value={date(user.identity.phoneConfirmedAt)} />
                  <Field label="Last sign-in" value={date(user.identity.lastSignInAt)} />
                  <Field label="Ban expiry" value={date(user.identity.bannedUntil)} />
                </dl>
              </section>

              <section id="cc360-sessions" className="cc360-next-section">
                <header><span className="cc-next-eyebrow">ACCESS EVIDENCE</span><h3>Recent sessions</h3></header>
                {user.recentSessions.length ? (
                  <div className="cc360-next-table-wrap">
                    <table className="cc360-next-table">
                      <thead><tr><th>Session</th><th>Device</th><th>Approx. location</th><th>Route</th><th>Seen</th></tr></thead>
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
                  <EvidenceState title="No sessions observed">No consent-compatible product session was recorded in the last 30 days.</EvidenceState>
                )}
              </section>

              <section id="cc360-organizations" className="cc360-next-section">
                <header><span className="cc-next-eyebrow">TENANT GRAPH</span><h3>Organizations</h3></header>
                {user.organizations.length ? (
                  <div className="cc360-next-list">
                    {user.organizations.map((organization) => (
                      <Link
                        key={organization.membershipCode}
                        href={`/admin?view=organizations&organization=${organization.organizationCode}`}
                      >
                        <span><strong>{organization.displayName}</strong><small>{organization.organizationCode} · {sentence(organization.membershipRole)}</small></span>
                        <span className="cc360-next-badges">
                          <Status tone={organization.membershipStatus === "active" ? "positive" : "warning"}>{organization.membershipStatus}</Status>
                          <Status>{organization.dataClassification}</Status>
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EvidenceState title="No organization membership">This account is not linked to a Command Center organization.</EvidenceState>
                )}
              </section>

              <section id="cc360-activity" className="cc360-next-section">
                <header><span className="cc-next-eyebrow">PRODUCT ACTIVITY</span><h3>Routes</h3></header>
                {user.activity.topRoutes.length ? (
                  <div className="cc360-next-route-list">
                    {user.activity.topRoutes.map((route) => (
                      <div key={route.route}>
                        <code>{route.route}</code>
                        <span><strong>{route.events}</strong> events</span>
                        <small>{date(route.lastSeenAt)}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EvidenceState title="No route activity">No protected product-route activity is available.</EvidenceState>
                )}
              </section>
            </main>

            <aside className="cc360-next-rail" aria-label="User signal rail">
              <section>
                <header><span className="cc-next-eyebrow">SIGNAL RAIL</span><h3>Account</h3></header>
                <dl className="cc360-next-rail-list">
                  <Field label="Status" value={<Status tone={accountTone(user.identity.accountStatus)}>{sentence(user.identity.accountStatus)}</Status>} />
                  <Field label="Onboarding" value={user.identity.onboardingStatus} />
                  <Field label="Last sign-in" value={date(user.identity.lastSignInAt)} />
                  <Field label="Last seen" value={date(user.activity.lastSeenAt)} />
                </dl>
              </section>

              <section>
                <header><span className="cc-next-eyebrow">COMMERCIAL</span><h3>Billing</h3></header>
                <dl className="cc360-next-rail-list">
                  <Field label="Plan" value={user.billing.planName} />
                  <Field label="Status" value={<Status tone={billingTone(user.billing.status)}>{sentence(user.billing.status)}</Status>} />
                  <Field label="Provider" value={user.billing.provider} />
                  <Field label="Period end" value={date(user.billing.currentPeriodEnd)} />
                </dl>
              </section>

              <section>
                <header><span className="cc-next-eyebrow">LATEST DEVICE</span><h3>Context</h3></header>
                {user.latestDevice ? (
                  <dl className="cc360-next-rail-list">
                    <Field label="Location" value={locationLabel(user)} />
                    <Field label="Precision" value={sentence(user.latestDevice.locationPrecision)} />
                    <Field label="Device" value={user.latestDevice.deviceType} />
                    <Field label="OS" value={user.latestDevice.osFamily} />
                    <Field label="Browser" value={user.latestDevice.browserFamily} />
                    <Field label="Revision" value={user.latestDevice.appVersion ?? "Not observed"} />
                  </dl>
                ) : (
                  <EvidenceState title="Not observed">No privacy-compatible device evidence exists yet.</EvidenceState>
                )}
              </section>

              <section>
                <header><span className="cc-next-eyebrow">DETERMINISTIC</span><h3>Risk signals</h3></header>
                <div className="cc360-next-risk">
                  {[
                    ["Email unconfirmed", user.riskSignals.emailUnconfirmed],
                    ["Never signed in", user.riskSignals.neverSignedIn],
                    ["Inactive 90+ days", user.riskSignals.inactive90d],
                    ["Currently banned", user.riskSignals.currentlyBanned],
                    ["Telemetry unavailable", user.riskSignals.telemetryUnavailable],
                  ].map(([label, flagged]) => (
                    <div key={String(label)} data-flagged={String(flagged)}><span>{label}</span><strong>{flagged ? "Review" : "Clear"}</strong></div>
                  ))}
                  <div data-flagged={String(user.riskSignals.failedOperations30d > 0)}><span>Failed operations</span><strong>{user.riskSignals.failedOperations30d}</strong></div>
                </div>
              </section>

              <details id="cc360-boundary" className="cc360-next-boundary">
                <summary>Privacy boundary</summary>
                <div>
                  <span>Raw IP <strong>Excluded</strong></span>
                  <span>Exact GPS <strong>Excluded</strong></span>
                  <span>Finance values <strong>Excluded</strong></span>
                  <span>Session replay <strong>Excluded</strong></span>
                  <span>Free-form content <strong>Excluded</strong></span>
                  <span>Lookup audit <strong>Required</strong></span>
                  <span>Retention <strong>{user.privacyBoundary.telemetryRetentionDays} days</strong></span>
                </div>
              </details>
            </aside>
          </div>
        </div>
      ) : null}
    </section>
  );
}
