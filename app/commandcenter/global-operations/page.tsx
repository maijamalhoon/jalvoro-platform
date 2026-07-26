import AdminGlobalOperationsPage from "@/app/admin/global-operations/page";
import { requireUnifiedCommandCenterSession } from "@/lib/command-center/server-access";

export const dynamic = "force-dynamic";

export default async function CommandCenterGlobalOperationsPage() {
  await requireUnifiedCommandCenterSession();
  return AdminGlobalOperationsPage();
}
