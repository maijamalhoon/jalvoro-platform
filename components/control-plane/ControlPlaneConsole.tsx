"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  KeyRound,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  UserCog,
  UsersRound,
} from "lucide-react";

import styles from "@/components/control-plane/control-plane.module.css";
import { createControlPlaneBrowserClient } from "@/lib/control-plane/client";
import type {
  ControlPlaneAccess,
  ControlPlaneDirectory,
} from "@/lib/control-plane/config";

function formatDate(value: string | null) {
  if (!value) return "No expiry";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(parsed));
}

export default function ControlPlaneConsole({
  access,
  directory,
}: {
  access: ControlPlaneAccess;
  directory: ControlPlaneDirectory | null;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createControlPlaneBrowserClient(), []);
  const [locking, setLocking] = useState(false);

  async function lockControlPlane() {
    if (locking) return;
    setLocking(true);
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    router.replace("/control-login");
    router.refresh();
  }

  const operators = directory?.operators ?? [];
  const activeOperators = operators.filter((operator) => operator.status === "active");
  const pendingInvitations = directory?.pendingInvitations ?? [];
  const activeGrants = directory?.activeGrants ?? access.grants;
  const ownerDirectoryUnavailable = access.role === "owner" && directory === null;

  return (
    <main className={`${styles.root} ${styles.consoleRoot}`}>
      <div className={styles.consoleShell}>
        <header className={styles.consoleHeader}>
          <div className={styles.brandLockup}>
            <span className={styles.brandMark} aria-hidden="true">
              <ShieldCheck size={24} />
            </span>
            <span>JALVORO Control Plane</span>
          </div>
          <div className={styles.headerActions}>
            <Link className={styles.linkButton} href="/admin">
              Enter Command Center <ArrowUpRight size={17} />
            </Link>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={lockControlPlane}
              disabled={locking}
            >
              <LogOut size={17} />
              {locking ? "Locking…" : "Lock now"}
            </button>
          </div>
        </header>

        <section className={styles.consolePanel}>
          <div className={styles.consoleHero}>
            <div>
              <p className={styles.eyebrow}>Zero-trust authority gateway</p>
              <h1 className={styles.consoleTitle}>Control Plane unlocked.</h1>
              <p className={styles.heroCopy}>
                This browser has a separately authenticated AAL2 Control Plane session.
                Opening the Admin Command Center still requires the existing production
                application authorization, creating two independent gates.
              </p>
            </div>
            <div className={styles.mfaSetup}>
              <span className={styles.assuranceBadge}>
                <BadgeCheck size={15} /> AAL2 verified
              </span>
              <span className={styles.roleBadge}>
                <KeyRound size={15} /> {access.role}
              </span>
            </div>
          </div>
        </section>

        {ownerDirectoryUnavailable ? (
          <div className={styles.error} role="alert">
            Owner directory verification failed. Re-authenticate before changing operators,
            invitations, or permission scopes.
          </div>
        ) : null}

        <section className={styles.metricGrid} aria-label="Control Plane status">
          <article className={styles.metricCard}>
            <p className={styles.metricLabel}>Identity realm</p>
            <p className={styles.metricValue}>Isolated</p>
            <p className={styles.muted}>Separate Supabase Auth project and session cookie.</p>
          </article>
          <article className={styles.metricCard}>
            <p className={styles.metricLabel}>Session assurance</p>
            <p className={styles.metricValue}>AAL2</p>
            <p className={styles.muted}>Password plus verified authenticator factor.</p>
          </article>
          <article className={styles.metricCard}>
            <p className={styles.metricLabel}>Active operators</p>
            <p className={styles.metricValue}>{directory ? activeOperators.length : "—"}</p>
            <p className={styles.muted}>Private registry; direct table access is denied.</p>
          </article>
          <article className={styles.metricCard}>
            <p className={styles.metricLabel}>Root authority</p>
            <p className={styles.metricValue}>{access.isRootOwner ? "Protected" : "Scoped"}</p>
            <p className={styles.muted}>Root Owner cannot be disabled through operator RPCs.</p>
          </article>
        </section>

        <section className={styles.directoryGrid}>
          <article className={styles.directoryCard}>
            <h2 className={styles.cardTitle}>
              <UsersRound size={18} aria-hidden="true" /> Operator directory
            </h2>
            {directory ? (
              <ul className={styles.list}>
                {operators.map((operator) => (
                  <li className={styles.listItem} key={operator.userReference}>
                    <div>
                      <div className={styles.mono}>{operator.userReference}</div>
                      <div className={styles.muted}>
                        {operator.isRootOwner ? "Root Owner" : operator.role}
                      </div>
                    </div>
                    <span className={styles.statusBadge}>{operator.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>
                {ownerDirectoryUnavailable
                  ? "Owner directory data could not be verified. No management controls are shown from an incomplete snapshot."
                  : "Directory details are owner-only and were not returned for this role."}
              </p>
            )}
          </article>

          <article className={styles.directoryCard}>
            <h2 className={styles.cardTitle}>
              <UserCog size={18} aria-hidden="true" /> Delegated access
            </h2>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <span>Pending invitations</span>
                <strong>{directory ? pendingInvitations.length : "—"}</strong>
              </li>
              <li className={styles.listItem}>
                <span>Active scoped grants</span>
                <strong>{activeGrants.length}</strong>
              </li>
              <li className={styles.listItem}>
                <span>Current user reference</span>
                <strong className={styles.mono}>{access.userReference}</strong>
              </li>
            </ul>
          </article>

          <article className={styles.directoryCard}>
            <h2 className={styles.cardTitle}>
              <LockKeyhole size={18} aria-hidden="true" /> Security boundaries
            </h2>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <span>Normal user login unlocks admin</span>
                <strong>No</strong>
              </li>
              <li className={styles.listItem}>
                <span>Control session without MFA</span>
                <strong>Denied</strong>
              </li>
              <li className={styles.listItem}>
                <span>Private tables via browser</span>
                <strong>Denied</strong>
              </li>
              <li className={styles.listItem}>
                <span>Audit ledger access</span>
                <strong>Private</strong>
              </li>
            </ul>
          </article>

          <article className={styles.directoryCard}>
            <h2 className={styles.cardTitle}>Active permission scopes</h2>
            {activeGrants.length ? (
              <ul className={styles.list}>
                {activeGrants.slice(0, 8).map((grant) => (
                  <li className={styles.listItem} key={grant.grantCode}>
                    <div>
                      <div>{grant.permissionKey}</div>
                      <div className={styles.muted}>
                        {grant.productKey || "All products"} · {grant.environmentKey || "All environments"}
                      </div>
                    </div>
                    <span className={styles.mono}>{formatDate(grant.expiresAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>
                Root Owner authority is role-bound. No extra scoped grants are active.
              </p>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
