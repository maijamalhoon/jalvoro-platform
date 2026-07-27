import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import BusinessPosSecurityManager from "@/components/business/BusinessPosSecurityManager";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "POS Workforce Security",
  robots: { index: false, follow: false },
};

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  workspace_mode: "advanced_company" | "simple_shop";
  owner_user_id: string;
  status: string;
};

export default async function BusinessPosSecurityPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const next = `/business/${businessSlug}/pos-security`;
  if (!user) redirect(`/business/login?next=${encodeURIComponent(next)}`);

  const businessResult = await supabase
    .from("businesses")
    .select("id, name, slug, workspace_mode, owner_user_id, status")
    .eq("slug", businessSlug)
    .maybeSingle();

  if (!businessResult.data) notFound();
  const business = businessResult.data as BusinessRow;
  if (business.status !== "active" || business.workspace_mode !== "simple_shop") notFound();

  const membershipResult = await supabase
    .from("business_members")
    .select("role, status, permissions")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membershipResult.data || membershipResult.data.status !== "active") notFound();
  const role = membershipResult.data.role;
  const permissions = membershipResult.data.permissions ?? [];
  const canView =
    business.owner_user_id === user.id ||
    permissions.includes("*") ||
    permissions.some((permission) =>
      ["pos.view", "pos.manage", "pos.approve"].includes(permission)) ||
    [
      "admin",
      "it_admin",
      "operations_manager",
      "manager",
      "auditor",
    ].includes(role);

  if (!canView) notFound();

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/business/${business.slug}/team`}
            className="finance-focus inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] px-2 text-sm font-bold text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Team and permissions
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-black text-success">
            <ShieldCheck className="size-4" aria-hidden="true" /> Device, PIN, session, and approval isolation
          </span>
        </div>

        <header className="mt-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Retail & POS security</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
            Workforce and terminal controls
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary sm:text-base">
            This console manages POS-specific device enrollment, temporary cashier PINs, active sessions, and manager approvals. It does not expose device secrets, PIN hashes, session tokens, or platform service credentials.
          </p>
        </header>

        <div className="mt-8">
          <BusinessPosSecurityManager businessId={business.id} businessName={business.name} />
        </div>
      </div>
    </main>
  );
}
