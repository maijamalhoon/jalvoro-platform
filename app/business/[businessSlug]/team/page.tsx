import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Crown, MailCheck, ShieldCheck, UserRoundCheck, UsersRound } from "lucide-react";

import BusinessFinancialPermissionPanel from "@/components/business/BusinessFinancialPermissionPanel";
import BusinessIdentityRecoveryPanel from "@/components/business/BusinessIdentityRecoveryPanel";
import BusinessTeamManager from "@/components/business/BusinessTeamManager";
import { isPrivilegedBusinessRole } from "@/lib/business/team-access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business Team",
  robots: { index: false, follow: false },
};

type WorkspaceMode = "advanced_company" | "simple_shop";

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  workspace_mode: WorkspaceMode;
  owner_user_id: string;
  status: string;
};

type TeamSnapshot = {
  business: {
    id: string;
    name: string;
    slug: string;
    workspace_mode: WorkspaceMode;
    owner_user_id: string;
  };
  members: Array<{
    user_id: string;
    name: string;
    email: string | null;
    role: string;
    status: "active" | "suspended" | "revoked";
    permissions: string[];
    joined_at: string | null;
    created_at: string;
    is_primary_owner: boolean;
  }>;
  invitations: Array<{
    id: string;
    email: string;
    role: string;
    permissions: string[];
    status: "pending" | "accepted" | "cancelled" | "expired";
    expires_at: string;
    delivery_status: "pending" | "sent" | "failed" | "manual";
    delivery_error: string | null;
    last_sent_at: string | null;
    resend_count: number;
    created_at: string;
    invited_by: string;
  }>;
  audit: Array<{
    id: number | string;
    action: string;
    actor_user_id: string | null;
    actor_name: string | null;
    target_user_id: string | null;
    target_name: string | null;
    invitation_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
  permission_catalog: string[];
};

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function BusinessTeamPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=${encodeURIComponent(`/business/${businessSlug}/team`)}`);

  const businessResult = await supabase
    .from("businesses")
    .select("id, name, slug, workspace_mode, owner_user_id, status")
    .eq("slug", businessSlug)
    .maybeSingle();

  if (!businessResult.data) notFound();
  const business = businessResult.data as BusinessRow;
  if (business.status !== "active") notFound();

  const membershipResult = await supabase
    .from("business_members")
    .select("role, status, permissions")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membershipResult.data || membershipResult.data.status !== "active") notFound();

  const role = membershipResult.data.role;
  const permissions = membershipResult.data.permissions ?? [];
  const wildcard = permissions.includes("*");
  const canView =
    ["owner", "admin", "accountant", "manager", "viewer"].includes(role) ||
    wildcard ||
    permissions.includes("team.view") ||
    permissions.includes("team.manage");
  const canManage =
    ["owner", "admin"].includes(role) || wildcard || permissions.includes("team.manage");

  if (!canView) notFound();

  const snapshotResult = await supabase.rpc("get_business_team_snapshot", {
    p_business_id: business.id,
  });

  if (snapshotResult.error || !snapshotResult.data) {
    console.error("Business team snapshot failed", { code: snapshotResult.error?.code });
  }

  const snapshot = (snapshotResult.data ?? {
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      workspace_mode: business.workspace_mode,
      owner_user_id: business.owner_user_id,
    },
    members: [],
    invitations: [],
    audit: [],
    permission_catalog: [],
  }) as TeamSnapshot;

  const activeMembers = snapshot.members.filter((member) => member.status === "active").length;
  const openInvitations = snapshot.invitations.filter((invitation) =>
    ["pending", "expired"].includes(invitation.status),
  ).length;
  const administrators = snapshot.members.filter(
    (member) =>
      member.status === "active" &&
      (member.role === "owner" || isPrivilegedBusinessRole(member.role)),
  ).length;
  const backHref =
    business.workspace_mode === "simple_shop"
      ? `/business/${business.slug}/shop`
      : `/business/${business.slug}`;

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={backHref}
            className="finance-focus inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] px-2 text-sm font-bold text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {business.name}
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-black text-success">
            <ShieldCheck className="size-4" aria-hidden="true" /> Tenant-isolated team access
          </span>
        </div>

        <header className="mt-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            {business.workspace_mode === "simple_shop" ? "Simple Shop employees" : "Company administration"}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
            Team and permissions
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary sm:text-base">
            Invite employees, control role-specific access, suspend or reactivate membership, transfer ownership safely, and review every team change from one immutable audit trail.
          </p>
        </header>

        {snapshotResult.error ? (
          <section className="mt-6 rounded-[var(--radius-card)] bg-danger-soft px-4 py-4 text-sm text-danger">
            Team information could not be loaded. No invitation, role, permission, or membership was changed.
          </section>
        ) : null}

        <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={UsersRound} label="Active members" value={String(activeMembers)} />
          <MetricCard icon={MailCheck} label="Open invitations" value={String(openInvitations)} />
          <MetricCard icon={Crown} label="Administrators" value={String(administrators)} />
          <MetricCard icon={UserRoundCheck} label="Your access" value={formatLabel(role)} />
        </section>

        {business.workspace_mode === "advanced_company" ? (
          <div className="mt-8">
            <BusinessFinancialPermissionPanel
              businessId={business.id}
              currentUserId={user.id}
              canManage={canManage}
              members={snapshot.members}
              permissionCatalog={snapshot.permission_catalog}
            />
          </div>
        ) : null}

        <div className="mt-8">
          <BusinessIdentityRecoveryPanel
            businessId={business.id}
            isPrimaryOwner={business.owner_user_id === user.id}
            members={snapshot.members}
          />
        </div>

        <div className="mt-8">
          <BusinessTeamManager
            businessId={business.id}
            businessSlug={business.slug}
            workspaceMode={business.workspace_mode}
            currentUserId={user.id}
            isPrimaryOwner={business.owner_user_id === user.id}
            canManage={canManage}
            snapshot={snapshot}
          />
        </div>
      </div>
    </main>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UsersRound;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
      <Icon className="size-5 text-primary" aria-hidden="true" />
      <p className="mt-4 text-xs font-bold text-text-secondary">{label}</p>
      <strong className="mt-1 block truncate text-xl font-black text-text-primary">{value}</strong>
    </article>
  );
}
