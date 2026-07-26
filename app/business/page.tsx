import { brand } from "@/lib/brand";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CircleDollarSign,
  Layers3,
  ShieldCheck,
  Store,
  UsersRound,
} from "lucide-react";

import CreateBusinessWorkspaceForm, {
  type BusinessProductTier,
} from "@/components/business/CreateBusinessWorkspaceForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business Workspaces",
  robots: { index: false, follow: false },
};

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  base_currency: string;
  country_code: string | null;
  module_config: Record<string, boolean> | null;
  workspace_mode: "advanced_company" | "simple_shop";
};

type MembershipRow = {
  role: string;
  status: string;
  permissions: string[];
  created_at: string;
  businesses: BusinessRow | BusinessRow[] | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}


type BusinessWorkspacesPageProps = {
  searchParams: Promise<{ product?: string }>;
};

function normalizeBusinessProduct(value: string | undefined): BusinessProductTier {
  if (
    value === "solo_business" ||
    value === "retail_pos" ||
    value === "growing_business" ||
    value === "enterprise"
  ) {
    return value;
  }
  return "growing_business";
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function BusinessWorkspacesPage({
  searchParams,
}: BusinessWorkspacesPageProps) {
  const query = await searchParams;
  const initialProduct = normalizeBusinessProduct(query.product);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/business");

  const membershipResult = await supabase
    .from("business_members")
    .select(
      "role, status, permissions, created_at, businesses(id, name, slug, business_type, base_currency, country_code, module_config, workspace_mode)",
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (membershipResult.error) {
    console.error("Failed to load business workspaces", {
      code: membershipResult.error.code,
    });
  }

  const workspaces = ((membershipResult.data ?? []) as unknown as MembershipRow[])
    .map((membership) => ({
      membership,
      business: firstRelation(membership.businesses),
    }))
    .filter(
      (item): item is { membership: MembershipRow; business: BusinessRow } =>
        Boolean(item.business),
    );

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/start?mode=login"
            className="finance-focus inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] px-2 text-sm font-bold text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Account access
          </Link>

          <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-black text-success">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Isolated business workspace
          </span>
        </div>

        <header className="mt-8 max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-12 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
              <Building2 aria-hidden="true" className="size-6" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                {brand.productFamily.business}
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
                Business workspaces
              </h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-text-secondary sm:text-base">
            Open an organization you belong to or register a new one as its authorized owner.
            Managers and employees receive access from inside the organization instead of public
            self-registration.
          </p>
        </header>

        {membershipResult.error ? (
          <section className="mt-8 rounded-[var(--radius-card)] bg-danger-soft px-4 py-4 text-sm text-danger sm:px-5">
            Business workspaces could not be loaded right now. Your personal finance data is
            unaffected.
          </section>
        ) : null}

        {workspaces.length > 0 ? (
          <section className="mt-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-text-primary sm:text-lg">
                  Your businesses
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Open the shop counter or full company ERP.
                </p>
              </div>
              <span className="text-sm font-black tabular-nums text-text-secondary">
                {workspaces.length}
              </span>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {workspaces.map(({ business, membership }) => {
                const enabledModules = Object.values(business.module_config ?? {}).filter(
                  Boolean,
                ).length;
                const simpleShop = business.workspace_mode === "simple_shop";
                const WorkspaceIcon = simpleShop ? Store : Building2;
                const href = simpleShop
                  ? `/business/${business.slug}/shop`
                  : `/business/${business.slug}`;
                const canViewTeam =
                  ["owner", "admin", "accountant", "manager", "viewer"].includes(
                    membership.role,
                  ) ||
                  membership.permissions.includes("*") ||
                  membership.permissions.includes("team.view") ||
                  membership.permissions.includes("team.manage");

                return (
                  <article
                    key={business.id}
                    className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
                  >
                    <Link href={href} className="finance-focus group block rounded-[var(--radius-button)]">
                      <div className="flex items-start justify-between gap-4">
                        <span className="inline-flex size-11 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
                          <WorkspaceIcon aria-hidden="true" className="size-5" />
                        </span>
                        <ArrowRight
                          aria-hidden="true"
                          className="size-4 text-text-tertiary transition-transform group-hover:translate-x-0.5"
                        />
                      </div>

                      <h3 className="mt-5 truncate text-lg font-black text-text-primary">
                        {business.name}
                      </h3>
                      <p className="mt-1 text-sm text-text-secondary">
                        {simpleShop ? "Simple Shop" : "Advanced Company"} · {formatLabel(membership.role)}
                      </p>

                      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                        <span className="rounded-[var(--radius-button)] bg-surface-secondary px-3 py-3">
                          <CircleDollarSign
                            aria-hidden="true"
                            className="mb-2 size-4 text-success"
                          />
                          <strong className="block text-text-primary">
                            {business.base_currency}
                          </strong>
                          <span className="text-xs text-text-secondary">Base currency</span>
                        </span>
                        <span className="rounded-[var(--radius-button)] bg-surface-secondary px-3 py-3">
                          <Layers3 aria-hidden="true" className="mb-2 size-4 text-primary" />
                          <strong className="block text-text-primary">
                            {simpleShop ? "Fast" : enabledModules}
                          </strong>
                          <span className="text-xs text-text-secondary">
                            {simpleShop ? "Daily workflow" : "Modules enabled"}
                          </span>
                        </span>
                      </div>
                    </Link>

                    {simpleShop && canViewTeam ? (
                      <Link
                        href={`/business/${business.slug}/team`}
                        className="finance-focus mt-4 inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] bg-surface-secondary px-3 text-sm font-black text-text-secondary transition-colors hover:bg-primary-soft hover:text-primary"
                      >
                        <UsersRound className="size-4" aria-hidden="true" /> Team & permissions
                      </Link>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="mt-8 rounded-[var(--radius-card)] bg-surface-secondary px-5 py-5 text-sm text-text-secondary sm:px-6">
            No Business organization is connected to this account yet. An authorized owner can
            register one below; invited staff should ask their administrator to complete the invitation.
          </section>
        )}

        <div className="mt-8">
          <CreateBusinessWorkspaceForm initialProduct={initialProduct} />
        </div>
      </div>
    </main>
  );
}
