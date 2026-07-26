import AdminPage from "@/app/admin/page";
import CommandCenterLogin from "@/components/admin/CommandCenterLogin";
import {
  parseResolvedCommandCenterNavigation,
  resolveCommandCenterEnvironment,
} from "@/lib/admin/command-center-navigation";
import { parseCommandCenterAccess } from "@/lib/command-center/config";
import { createCommandCenterServerClient } from "@/lib/command-center/server";
import { createClient } from "@/lib/supabase/server";

type CommandCenterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function CommandCenterPage(props: CommandCenterPageProps) {
  const commandCenter = await createCommandCenterServerClient();
  const commandUserResult = await commandCenter.auth.getUser();
  const commandUser = commandUserResult.data.user;
  const commandEmail = commandUser?.email?.trim().toLowerCase() ?? "";

  if (commandUserResult.error || !commandUser || !commandEmail) {
    return <CommandCenterLogin />;
  }

  const accessResult = await commandCenter.rpc("get_my_command_center_access");
  const access = parseCommandCenterAccess(accessResult.data);
  if (accessResult.error || !access?.isOwner) {
    return <CommandCenterLogin accessDenied signedInEmail={commandEmail} />;
  }

  const website = await createClient();
  const websiteUserResult = await website.auth.getUser();
  const websiteEmail =
    websiteUserResult.data.user?.email?.trim().toLowerCase() ?? "";
  const syncRequired =
    Boolean(websiteUserResult.error) ||
    !websiteUserResult.data.user ||
    !websiteEmail ||
    websiteEmail !== commandEmail;

  if (syncRequired) {
    return <CommandCenterLogin syncRequired signedInEmail={commandEmail} />;
  }

  const navigationResult = await website.rpc("get_command_center_navigation", {
    p_environment: resolveCommandCenterEnvironment(),
  });

  if (navigationResult.error?.code === "42501") {
    return <CommandCenterLogin accessDenied signedInEmail={websiteEmail} />;
  }

  if (navigationResult.error) {
    throw new Error(
      `Command Center authorization unavailable: ${navigationResult.error.code ?? "unknown"}`,
    );
  }

  const navigation = parseResolvedCommandCenterNavigation(
    navigationResult.data,
  );
  if (!navigation) {
    throw new Error(
      "Command Center authorization returned an invalid contract.",
    );
  }

  return AdminPage(props);
}
