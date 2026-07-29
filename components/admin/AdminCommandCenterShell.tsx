import type { ReactNode } from "react";

import AdminCommandCenterShellClient from "@/components/admin/AdminCommandCenterShellClient";
import CommandCenterLockButton from "@/components/admin/CommandCenterLockButton";
import {
  parseResolvedCommandCenterNavigation,
  resolveCommandCenterEnvironment,
} from "@/lib/admin/command-center-navigation";
import { getCommandCenterSession } from "@/lib/admin/command-center-session";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCommandCenterShell({
  children,
}: {
  children: ReactNode;
}) {
  const commandCenterSession = await getCommandCenterSession();
  if (!commandCenterSession) {
    return <>{children}</>;
  }

  const supabase = await createClient();
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
    <>
      <AdminCommandCenterShellClient sections={sections}>
        {children}
      </AdminCommandCenterShellClient>
      <CommandCenterLockButton />
    </>
  );
}
