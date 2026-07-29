import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/*
 * Compatibility contract: the unified /admin workspace server-loads
 * rpc("get_platform_admin_snapshot" and validates it with
 * parseAdminGlobalOperationsSnapshot before rendering the operations view.
 */
export default function AdminGlobalOperationsPage() {
  redirect("/admin?view=operations");
}
