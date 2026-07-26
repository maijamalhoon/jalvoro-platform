import type { ReactNode } from "react";

import AdminCommandCenterShellClient from "@/components/admin/AdminCommandCenterShellClient";
import {
  parseResolvedCommandCenterNavigation,
  resolveCommandCenterEnvironment,
} from "@/lib/admin/command-center-navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCommandCenterShell({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return <>{children}</>;
  }

  const { data, error } = await supabase.rpc("get_command_center_navigation", {
    p_environment: resolveCommandCenterEnvironment(),
  });

  if (error?.code === "42501") {
    return <>{children}</>;
  }

  if (error) {
    throw new Error(
      `Command Center navigation unavailable: ${error.code ?? "unknown"}`,
    );
  }

  const sections = parseResolvedCommandCenterNavigation(data);
  if (!sections) {
    throw new Error("Command Center navigation returned an invalid contract.");
  }

  return (
    <AdminCommandCenterShellClient sections={sections}>
      {children}
    </AdminCommandCenterShellClient>
  );
}
