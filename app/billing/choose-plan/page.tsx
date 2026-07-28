import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import WorkspacePlanSelection from "@/components/billing/WorkspacePlanSelection";
import { BUSINESS_SYSTEMS } from "@/lib/billing/business-catalog";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Choose business plan",
  description: "Choose Free or a regional paid plan for one business workspace.",
  robots: { index: false, follow: false },
};

type ChoosePlanPageProps = {
  searchParams: Promise<{ businessId?: string }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveBusinessSystemCode(
  workspaceMode: string | null,
  businessType: string,
) {
  if (workspaceMode === "simple_shop") return "simple_shop";

  const typeMap: Record<string, string> = {
    retail: "retail_pos",
    wholesale: "wholesale_distribution",
    services: "service_business",
    professional_services: "professional_services",
    restaurant: "restaurant",
    ecommerce: "ecommerce",
    construction: "construction",
    manufacturing: "manufacturing",
    other: "general_company",
  };

  return typeMap[businessType] ?? "custom_business";
}

export default async function ChoosePlanPage({
  searchParams,
}: ChoosePlanPageProps) {
  const { businessId } = await searchParams;

  if (!businessId || !UUID_PATTERN.test(businessId)) {
    redirect("/business");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/billing/choose-plan?businessId=${businessId}`)}`);
  }

  const { data: business, error } = await supabase
    .from("businesses")
    .select("id,name,slug,business_type,workspace_mode,country_code")
    .eq("id", businessId)
    .maybeSingle();

  if (error || !business) {
    redirect("/business");
  }

  const systemCode = resolveBusinessSystemCode(
    business.workspace_mode,
    business.business_type,
  );
  const system = BUSINESS_SYSTEMS.find((entry) => entry.code === systemCode);
  const requestHeaders = await headers();
  const countryCode =
    business.country_code ?? requestHeaders.get("x-vercel-ip-country") ?? "US";
  const freeHref =
    business.workspace_mode === "simple_shop"
      ? `/business/${business.slug}/shop`
      : `/business/${business.slug}`;

  return (
    <main className="min-h-screen bg-background px-[var(--space-page)] py-8 sm:py-12">
      <div className="mx-auto max-w-[96rem]">
        <header className="mb-8">
          <Link
            href="/business"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-text-secondary hover:bg-surface focus-visible:shadow-[var(--focus-ring)]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to businesses
          </Link>
        </header>

        <WorkspacePlanSelection
          businessId={business.id}
          businessName={business.name}
          businessSystemName={system?.name ?? "Business System"}
          countryCode={countryCode}
          freeHref={freeHref}
        />
      </div>
    </main>
  );
}
