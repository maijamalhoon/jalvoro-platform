import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import AdminOrganizationOperationsPanel from "@/components/admin/AdminOrganizationOperationsPanel";
import { parseAdminOrganizationOperationsSnapshot } from "@/lib/admin/organization-operations-guard";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Organization Operations",
  description:
    "Private organization lifecycle, membership, tenant authorization and audit operations for the JALVORO Command Center.",
};

export const dynamic = "force-dynamic";

const ORGANIZATION_CODE_PATTERN = /^ORG-[A-F0-9]{12}$/;
const ACTION_RESULTS = new Set([
  "created",
  "updated",
  "member-added",
  "member-updated",
  "grant-created",
  "grant-revoked",
  "invalid",
  "forbidden",
  "missing",
  "conflict",
  "blocked",
  "unavailable",
]);

type OrganizationPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSingle(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

function readPage(value: string | null) {
  if (!value) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 && page <= 2001 ? page : 1;
}

export default async function OrganizationOperationsPage({
  searchParams,
}: OrganizationPageProps) {
  const params = await searchParams;
  const organizationValue =
    readSingle(params.organization)?.toUpperCase() ?? null;
  const organizationCode = organizationValue?.match(ORGANIZATION_CODE_PATTERN)
    ? organizationValue
    : null;
  const page = readPage(readSingle(params.page));
  const limit = 50;
  const offset = (page - 1) * limit;
  const actionValue = readSingle(params.result);
  const actionResult =
    actionValue && ACTION_RESULTS.has(actionValue) ? actionValue : null;

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=%2Fadmin%2Forganizations");
  }

  const { data, error } = await supabase.rpc(
    "get_command_center_organization_operations_snapshot",
    {
      p_organization_code: organizationCode,
      p_limit: limit,
      p_offset: offset,
    },
  );

  if (error?.code === "42501" || error?.code === "P0002") {
    notFound();
  }

  if (error) {
    throw new Error(
      `Organization Operations snapshot unavailable: ${error.code ?? "unknown"}`,
    );
  }

  const operations = parseAdminOrganizationOperationsSnapshot(data);
  if (!operations) {
    throw new Error(
      "Organization Operations snapshot returned an invalid contract.",
    );
  }

  return (
    <AdminOrganizationOperationsPanel
      operations={operations}
      actionResult={actionResult}
      page={page}
    />
  );
}
