"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  formatAdminCount,
  formatAdminGeneratedAt,
} from "@/lib/admin/control-center";
import type {
  AdminUserDirectoryItem,
  AdminUserOperationsSnapshot,
  UserActivityState,
} from "@/lib/admin/user-operations";
import { cn } from "@/lib/utils";

const REFERENCE_PATTERN = /^USR-[A-F0-9]{0,12}$/;

function activityLabel(state: UserActivityState) {
  return {
    active_30d: "Active",
    quiet_90d: "Quiet",
    inactive_90d: "Inactive",
    never_signed_in: "Never signed in",
  }[state];
}

function activityTone(state: UserActivityState) {
  if (state === "active_30d") return "positive";
  if (state === "quiet_90d") return "info";
  if (state === "inactive_90d") return "warning";
  return "neutral";
}

function subscriptionTone(item: AdminUserDirectoryItem) {
  if (item.subscriptionStatus === "active") return "positive";
  if (item.subscriptionStatus === "trialing") return "info";
  if (item.subscriptionStatus === "past_due") return "danger";
  if (item.subscriptionStatus === "paused" || item.subscriptionStatus === "incomplete") {
    return "warning";
  }
  return "neutral";
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "positive" | "warning" | "danger" | "info";
}) {
  return <span className={cn("cc-directory-pill", `cc-directory-pill-${tone}`)}>{children}</span>;
}

function nullableDate(value: string | null) {
  return value ? formatAdminGeneratedAt(value) : "—";
}

export default function AdminUserOperationsPanel({
  operations,
}: {
  operations: AdminUserOperationsSnapshot;
}) {
  const [referenceQuery, setReferenceQuery] = useState("");
  const normalizedQuery = referenceQuery.trim().toUpperCase();
  const validQuery = normalizedQuery.length === 0 || REFERENCE_PATTERN.test(normalizedQuery);
  const visibleUsers = useMemo(() => {
    if (!normalizedQuery || !validQuery) return operations.users;
    return operations.users.filter((user) =>
      user.userReference.startsWith(normalizedQuery),
    );
  }, [normalizedQuery, operations.users, validQuery]);

  const metrics = [
    ["Total", operations.counts.totalUsers],
    ["Active · 30d", operations.counts.signedIn30d],
    ["Setup pending", operations.counts.onboardingPending],
    ["Inactive · 90d", operations.counts.inactive90d],
    ["Active paid", operations.counts.activePaidUsers],
    ["Past due", operations.counts.pastDueUsers],
  ] as const;

  return (
    <section className="cc-directory" aria-labelledby="cc-directory-title">
      <header className="cc-directory-head">
        <div>
          <span className="cc-next-eyebrow">ACCOUNT DIRECTORY</span>
          <h2 id="cc-directory-title">Users</h2>
          <p>Masked identity index with direct access to audited User 360 profiles.</p>
        </div>
        <div className="cc-directory-boundary">
          <span>Opaque lookup</span>
          <span>Read only</span>
        </div>
      </header>

      <div className="cc-directory-metrics" aria-label="Directory metrics">
        {metrics.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{formatAdminCount(value)}</strong>
          </div>
        ))}
      </div>

      <div className="cc-directory-toolbar">
        <label>
          <span>Find reference</span>
          <input
            value={referenceQuery}
            onChange={(event) => setReferenceQuery(event.target.value)}
            className={cn(!validQuery && "cc-directory-input-invalid")}
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            maxLength={16}
            placeholder="USR-A1B2C3D4E5F6"
            aria-invalid={!validQuery}
          />
        </label>
        <span>{formatAdminCount(visibleUsers.length)} shown · newest 100</span>
      </div>

      {!validQuery ? (
        <div className="cc-directory-alert">Use the USR- reference format only.</div>
      ) : null}

      <div className="cc-directory-table-wrap">
        <table className="cc-directory-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>State</th>
              <th>Onboarding</th>
              <th>Plan</th>
              <th>Subscription</th>
              <th>Joined</th>
              <th>Last sign-in</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((user) => (
              <tr key={user.userReference}>
                <td>
                  <strong>{user.maskedEmail}</strong>
                  <code>{user.userReference}</code>
                </td>
                <td><Pill tone={activityTone(user.activityState)}>{activityLabel(user.activityState)}</Pill></td>
                <td><Pill tone={user.onboardingStatus === "complete" ? "positive" : "warning"}>{user.onboardingStatus}</Pill></td>
                <td><strong>{user.planName}</strong><code>{user.planCode}</code></td>
                <td>
                  <Pill tone={subscriptionTone(user)}>{user.subscriptionStatus.replaceAll("_", " ")}</Pill>
                  {user.cancelAtPeriodEnd ? <small>Ends after current period</small> : null}
                </td>
                <td>{formatAdminGeneratedAt(user.joinedAt)}</td>
                <td>{nullableDate(user.lastSignInAt)}</td>
                <td>
                  <Link href={`/admin?view=users&user=${user.userReference}`}>Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleUsers.length === 0 ? (
          <div className="cc-next-state" data-state="waiting">
            <strong>No matching account</strong>
            <span>The current 100-user directory window has no matching reference.</span>
          </div>
        ) : null}
      </div>

      <footer className="cc-directory-foot">
        <span>Full email returned: {operations.rawEmailReturned ? "Yes" : "No"}</span>
        <span>User UUID returned: {operations.userIdReturned ? "Yes" : "No"}</span>
        <span>Finance data returned: {operations.financeDataReturned ? "Yes" : "No"}</span>
        <span>Provider IDs returned: {operations.providerIdentifiersReturned ? "Yes" : "No"}</span>
      </footer>
    </section>
  );
}
