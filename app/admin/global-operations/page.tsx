import { notFound, redirect } from "next/navigation";

import AdminGlobalOperationsPanel from "@/components/admin/AdminGlobalOperationsPanel";
import { parseAdminGlobalOperationsSnapshot } from "@/lib/admin/global-operations";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminGlobalOperationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=%2Fadmin%2Fglobal-operations");
  }

  const { data, error } = await supabase.rpc("get_platform_admin_snapshot");

  if (error?.code === "42501") {
    notFound();
  }

  if (error) {
    throw new Error(`Global operations snapshot unavailable: ${error.code ?? "unknown"}`);
  }

  const operations = parseAdminGlobalOperationsSnapshot(data?.globalOperations);
  if (!operations) {
    throw new Error("Global operations snapshot returned an invalid contract.");
  }

  return <AdminGlobalOperationsPanel operations={operations} />;
}
