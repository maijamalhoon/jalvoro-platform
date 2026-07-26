import { redirect } from "next/navigation";

import {
  COMMAND_CENTER_PATH,
  parseCommandCenterAccess,
} from "@/lib/command-center/config";
import { createCommandCenterServerClient } from "@/lib/command-center/server";
import { createClient } from "@/lib/supabase/server";

export type UnifiedCommandCenterSession = {
  commandCenterEmail: string;
  websiteEmail: string;
};

export async function readUnifiedCommandCenterSession(): Promise<
  UnifiedCommandCenterSession | null
> {
  const commandCenter = await createCommandCenterServerClient();
  const commandUserResult = await commandCenter.auth.getUser();
  const commandUser = commandUserResult.data.user;
  const commandEmail = commandUser?.email?.trim().toLowerCase() ?? "";

  if (commandUserResult.error || !commandUser || !commandEmail) return null;

  const accessResult = await commandCenter.rpc("get_my_command_center_access");
  const access = parseCommandCenterAccess(accessResult.data);
  if (accessResult.error || !access || !access.isOwner) return null;

  const website = await createClient();
  const websiteUserResult = await website.auth.getUser();
  const websiteEmail =
    websiteUserResult.data.user?.email?.trim().toLowerCase() ?? "";

  if (
    websiteUserResult.error ||
    !websiteUserResult.data.user ||
    !websiteEmail ||
    websiteEmail !== commandEmail
  ) {
    return null;
  }

  return {
    commandCenterEmail: commandEmail,
    websiteEmail,
  };
}

export async function requireUnifiedCommandCenterSession() {
  const session = await readUnifiedCommandCenterSession();
  if (!session) redirect(COMMAND_CENTER_PATH);
  return session;
}
