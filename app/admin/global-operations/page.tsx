import { notFound, redirect } from "next/navigation";

import AdminGlobalOperationsDecisionPanel from "@/components/admin/AdminGlobalOperationsDecisionPanel";
import { parseAuditedAdminGlobalOperationsSnapshot } from "@/lib/admin/global-operations-audit";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function readGlobalOperationsPayload(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return (value as Record<string, unknown>).globalOperations;
}

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
    throw new Error(
      `Global operations snapshot unavailable: ${error.code ?? "unknown"}`,
    );
  }

  const operations = parseAuditedAdminGlobalOperationsSnapshot(
    readGlobalOperationsPayload(data),
  );
  if (!operations) {
    throw new Error("Global operations snapshot returned an invalid contract.");
  }

  return <AdminGlobalOperationsDecisionPanel operations={operations} />;
}
