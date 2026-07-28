import { redirect } from "next/navigation";

import { accountRealmAllows, loadAccountRealm } from "@/lib/account-realm/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BusinessWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/business/login");
  }

  const realm = await loadAccountRealm(supabase);
  if (!realm) {
    redirect("/start?mode=login&error=realm_unavailable");
  }
  if (!accountRealmAllows(realm, "business")) {
    redirect("/dashboard");
  }

  return children;
}
