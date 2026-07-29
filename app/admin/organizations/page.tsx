import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type OrganizationRedirectPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/*
 * Compatibility contract: /admin owns the server-only
 * "get_command_center_organization_operations_snapshot" operation and validates
 * it through organization-operations-guard. This route only preserves old links.
 */
export default async function OrganizationRedirectPage({
  searchParams,
}: OrganizationRedirectPageProps) {
  const params = await searchParams;
  const target = new URLSearchParams({ view: "organizations" });

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && key !== "view") target.set(key, value);
  }

  redirect(`/admin?${target.toString()}`);
}
