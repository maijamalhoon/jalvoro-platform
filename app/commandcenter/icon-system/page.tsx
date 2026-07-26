import AdminIconSystemPage from "@/app/admin/icon-system/page";
import { requireUnifiedCommandCenterSession } from "@/lib/command-center/server-access";

export const dynamic = "force-dynamic";

export default async function CommandCenterIconSystemPage() {
  await requireUnifiedCommandCenterSession();
  return AdminIconSystemPage();
}
