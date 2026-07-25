import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Layers3,
  MailCheck,
  Plus,
  ShieldCheck,
  Store,
  UserRound,
  UsersRound,
} from "lucide-react";

import CreateBusinessWorkspaceForm from "@/components/business/CreateBusinessWorkspaceForm";
import {
  getProductExperience,
  type ProductExperienceSlug,
} from "@/lib/product-experiences";
import { createClient } from "@/lib/supabase/server";
import {
  getBusinessWorkspaceHref,
  getMembershipRoleLabel,
  isBusinessExperience,
} from "@/lib/workspaces/domain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workspaces",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type EntitlementRow = {
  module_key: string;
  status: string;
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
  entry_experience: string | null;
  business_module_entitlements: EntitlementRow[] | EntitlementRow | null;
};

type MembershipRow = {
  role: string;
  status: string;
  permissions: string[];
  created_at: string;
  businesses: BusinessRow | BusinessRow[] | null;
};

type PreferenceRow = {
  default_workspace: "personal" | "business";
  active_business_id: string | null;
};

type OnboardingSessionRow = {
  id: string;
  experience: ProductExperienceSlug;
  status: "not_started" | "in_progress";
  current_step: number;
  next_path: string | null;
  updated_at: string;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function relationList<T>(value: T | T[] | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function selectedExperienceFrom(
  queryValue: string | undefined,
  activeSessions: OnboardingSessionRow[],
  metadataValue: unknown,
) {
  const fromQuery = getProductExperience(queryValue);
  if (fromQuery && isBusinessExperience(fromQuery.slug)) return fromQuery.slug;

  const activeSession = activeSessions.find((session) =>
    isBusinessExperience(session.experience),
  );
  if (activeSession && isBusinessExperience(activeSession.experience)) {
    return activeSession.experience;
  }

  const fromMetadata =
    typeof metadataValue === "string" ? getProductExperience(metadataValue) : null;
  if (fromMetadata && isBusinessExperience(fromMetadata.slug)) {
    return fromMetadata.slug;
  }

  return "small-business";
}

export default async function BusinessWorkspacesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/business");

  const [membershipResult, preferenceResult, onboardingResult] = await Promise.all([
    supabase
      .from("business_members")
      .select(
        "role, status, permissions, created_at, businesses(id, name, slug, business_type, base_currency, country_code, module_config, workspace_mode, entry_experience, business_module_entitlements(module_key, status))",
      )
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("business_workspace_preferences")
      .select("default_workspace, active_business_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("workspace_onboarding_sessions")
      .select("id, experience, status, current_step, next_path, updated_at")
      .eq("user_id", user.id)
      .is("business_id", null)
      .in("status", ["not_started", "in_progress"])
      .order("updated_at", { ascending: false }),
  ]);

  if (membershipResult.error) {
    console.error("Failed to load business workspaces", {
      code: membershipResult.error.code,
    });
  }
  if (preferenceResult.error) {
    console.error("Failed to load workspace preference", {
      code: preferenceResult.error.code,
    });
  }
  if (onboardingResult.error) {
    console.error("Failed to load onboarding sessions", {
      code: onboardingResult.error.code,
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
  const preference = preferenceResult.data as PreferenceRow | null;
  const activeSessions = (onboardingResult.data ?? []) as OnboardingSessionRow[];
  const selectedExperience = selectedExperienceFrom(
    firstValue(query.experience),
    activeSessions,
    user.user_metadata?.jalvoro_start_experience,
  );
  const requestedSession = firstValue(query.session);
  const selectedSession = activeSessions.find(
    (session) =>
      session.experience === selectedExperience &&
      (!requestedSession || session.id === requestedSession),
  );
  const isPersonalCurrent = preference?.default_workspace !== "business";
  const switchError = firstValue(query.switch_error);

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/start"
            className="finance-focus inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] px-2 text-sm font-bold text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            All experiences
          </Link>

          <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-black text-success">
            <ShieldCheck aria-hidden="true" className="size-4" />
            One identity · isolated workspaces
          </span>
        </div>

        <header className="mt-8 max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-12 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
              <Layers3 aria-hidden="true" className="size-6" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                Workspace switcher
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
                Choose where you are working
              </h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-text-secondary sm:text-base">
            Your email and security settings belong to one JALVORO identity. Every Personal or
            organization workspace keeps separate records, roles, modules, and billing context.
            Nothing switches automatically.
          </p>
        </header>

        {switchError ? (
          <section
            role="alert"
            className="mt-6 rounded-[var(--radius-card)] bg-danger-soft px-4 py-4 text-sm text-danger sm:px-5"
          >
            Workspace switching could not be completed. Your current workspace and data were not
            changed.
          </section>
        ) : null}

        {membershipResult.error || preferenceResult.error ? (
          <section className="mt-6 rounded-[var(--radius-card)] bg-danger-soft px-4 py-4 text-sm text-danger sm:px-5">
            Some workspace details could not be loaded right now. Your Personal and organization
            data remain isolated and unchanged.
          </section>
        ) : null}

        <section className="mt-8" aria-labelledby="available-workspaces-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2
                id="available-workspaces-heading"
                className="text-base font-black text-text-primary sm:text-lg"
              >
                Available workspaces
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Your role is shown before you enter an organization.
              </p>
            </div>
            <span className="text-sm font-black tabular-nums text-text-secondary">
              {workspaces.length + 1}
            </span>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex size-11 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
                  <UserRound aria-hidden="true" className="size-5" />
                </span>
                {isPersonalCurrent ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.1em] text-success">
                    <CheckCircle2 className="size-3.5" aria-hidden="true" /> Current
                  </span>
                ) : null}
              </div>

              <h3 className="mt-5 text-lg font-black text-text-primary">Personal Finance</h3>
              <p className="mt-1 text-sm text-text-secondary">Personal · Private to you</p>
              <p className="mt-4 text-sm leading-6 text-text-secondary">
                Accounts, spending, goals, investments, liabilities, and personal reports. No
                organization can see this data.
              </p>

              <form action="/workspaces/switch" method="post" className="mt-5">
                <input type="hidden" name="kind" value="personal" />
                <input type="hidden" name="next" value="/dashboard" />
                <button
                  type="submit"
                  className="finance-focus inline-flex min-h-11 w-full items-center justify-between rounded-[var(--radius-button)] bg-primary px-4 text-sm font-black text-white transition-transform hover:-translate-y-0.5"
                >
                  {isPersonalCurrent ? "Open Personal Finance" : "Switch to Personal Finance"}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              </form>
            </article>

            {workspaces.map(({ business, membership }) => {
              const entitlements = relationList(business.business_module_entitlements).filter(
                (entitlement) =>
                  entitlement.status === "active" || entitlement.status === "trial",
              );
              const legacyModules = Object.values(business.module_config ?? {}).filter(Boolean)
                .length;
              const moduleCount = entitlements.length || legacyModules;
              const simpleShop = business.workspace_mode === "simple_shop";
              const WorkspaceIcon = simpleShop ? Store : Building2;
              const href = getBusinessWorkspaceHref(
                business.slug,
                business.workspace_mode,
              );
              const roleLabel = getMembershipRoleLabel(membership.role);
              const workspaceExperience = getProductExperience(business.entry_experience);
              const isCurrent =
                preference?.default_workspace === "business" &&
                preference.active_business_id === business.id;
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
                  className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="inline-flex size-11 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
                      <WorkspaceIcon aria-hidden="true" className="size-5" />
                    </span>
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.1em] text-success">
                        <CheckCircle2 className="size-3.5" aria-hidden="true" /> Current
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-5 truncate text-lg font-black text-text-primary">
                    {business.name}
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    {workspaceExperience?.productName ??
                      (simpleShop ? "Retail & POS" : "Business Operations")}{" "}· {roleLabel}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <span className="rounded-[var(--radius-button)] bg-surface-secondary px-3 py-3">
                      <CircleDollarSign
                        aria-hidden="true"
                        className="mb-2 size-4 text-success"
                      />
                      <strong className="block text-text-primary">{business.base_currency}</strong>
                      <span className="text-xs text-text-secondary">Base currency</span>
                    </span>
                    <span className="rounded-[var(--radius-button)] bg-surface-secondary px-3 py-3">
                      <Layers3 aria-hidden="true" className="mb-2 size-4 text-primary" />
                      <strong className="block text-text-primary">{moduleCount}</strong>
                      <span className="text-xs text-text-secondary">Modules available</span>
                    </span>
                  </div>

                  <form action="/workspaces/switch" method="post" className="mt-5">
                    <input type="hidden" name="kind" value="business" />
                    <input type="hidden" name="business_id" value={business.id} />
                    <input type="hidden" name="next" value={href} />
                    <button
                      type="submit"
                      className="finance-focus inline-flex min-h-11 w-full items-center justify-between rounded-[var(--radius-button)] bg-primary px-4 text-sm font-black text-white transition-transform hover:-translate-y-0.5"
                    >
                      {isCurrent ? "Open workspace" : `Switch as ${roleLabel}`}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </button>
                  </form>

                  {canViewTeam ? (
                    <Link
                      href={`/business/${business.slug}/team`}
                      className="finance-focus mt-3 inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] bg-surface-secondary px-3 text-sm font-black text-text-secondary transition-colors hover:bg-primary-soft hover:text-primary"
                    >
                      <UsersRound className="size-4" aria-hidden="true" /> Team & permissions
                    </Link>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        {activeSessions.length > 0 ? (
          <section className="mt-8" aria-labelledby="resume-setup-heading">
            <h2 id="resume-setup-heading" className="text-base font-black text-text-primary sm:text-lg">
              Continue setup
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {activeSessions.map((session) => {
                const experience = getProductExperience(session.experience);
                const businessSetup = isBusinessExperience(session.experience);
                const href = businessSetup
                  ? `/business?setup=1&experience=${encodeURIComponent(session.experience)}&session=${encodeURIComponent(session.id)}`
                  : `/onboarding/personal?next=${encodeURIComponent(session.next_path ?? "/dashboard")}`;

                return (
                  <article
                    key={session.id}
                    className="rounded-[var(--radius-card)] bg-primary-soft px-5 py-5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-button)] bg-primary text-white">
                        <Clock3 className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.13em] text-primary">
                          Setup in progress
                        </p>
                        <h3 className="mt-1 text-base font-black text-text-primary">
                          {experience?.productName ?? "Workspace"}
                        </h3>
                        <p className="mt-1 text-sm text-text-secondary">
                          Resume from saved step {session.current_step}. Your completed work is kept.
                        </p>
                      </div>
                    </div>
                    <Link
                      href={href}
                      className="finance-focus mt-4 inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] bg-surface px-4 text-sm font-black text-text-primary shadow-[var(--shadow-sm)]"
                    >
                      Continue setup <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="mt-8 grid gap-4 md:grid-cols-2" aria-label="Workspace actions">
          <article className="rounded-[var(--radius-card)] bg-surface-secondary px-5 py-5">
            <span className="grid size-10 place-items-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
              <Plus className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-base font-black text-text-primary">Create a new workspace</h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              The selected experience controls the starting workflow. Modules can be added later
              without migrating or merging records.
            </p>
          </article>
          <article className="rounded-[var(--radius-card)] bg-surface-secondary px-5 py-5">
            <span className="grid size-10 place-items-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
              <MailCheck className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-base font-black text-text-primary">Join an existing workspace</h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Open the secure invitation link sent to your verified email. Membership and role are
              confirmed before the organization appears here.
            </p>
          </article>
        </section>

        <div className="mt-8">
          <CreateBusinessWorkspaceForm
            initialExperience={selectedExperience}
            onboardingSessionId={selectedSession?.id ?? null}
          />
        </div>
      </div>
    </main>
  );
}
