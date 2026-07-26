import AdminOrganizationOperationsPage from "@/app/admin/organizations/page";
import { requireUnifiedCommandCenterSession } from "@/lib/command-center/server-access";

type CommandCenterOrganizationPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function CommandCenterOrganizationOperationsPage(
  props: CommandCenterOrganizationPageProps,
) {
  await requireUnifiedCommandCenterSession();
  return AdminOrganizationOperationsPage(props);
}
