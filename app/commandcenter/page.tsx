import AdminPage from "@/app/admin/page";
import CommandCenterLogin from "@/components/admin/CommandCenterLogin";
import {
  parseResolvedCommandCenterNavigation,
  resolveCommandCenterEnvironment,
} from "@/lib/admin/command-center-navigation";
import { createClient } from "@/lib/supabase/server";

type CommandCenterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function CommandCenterPage(props: CommandCenterPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return <CommandCenterLogin />;
  }

  const navigationResult = await supabase.rpc("get_command_center_navigation", {
    p_environment: resolveCommandCenterEnvironment(),
  });

  if (navigationResult.error?.code === "42501") {
    return (
      <CommandCenterLogin
        accessDenied
        signedInEmail={user.email ?? "Signed-in website account"}
      />
    );
  }

  if (navigationResult.error) {
    throw new Error(
      `Command Center authorization unavailable: ${navigationResult.error.code ?? "unknown"}`,
    );
  }

  const navigation = parseResolvedCommandCenterNavigation(navigationResult.data);
  if (!navigation) {
    throw new Error("Command Center authorization returned an invalid contract.");
  }

  return AdminPage(props);
}
