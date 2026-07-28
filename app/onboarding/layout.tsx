import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { accountRealmAllows, loadAccountRealm } from "@/lib/account-realm/server";
import { createClient } from "@/lib/supabase/server";

import "../auth-clean.css";
import "../auth-clean-fixes.css";
import "../auth-control-alignment.css";
import "../auth-responsive-architecture.css";
import "../auth-adornment-alignment-fix.css";
import "../auth-action-runtime.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account setup",
  robots: { index: false, follow: false, nocache: true },
};

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return children;

  const realm = await loadAccountRealm(supabase);
  if (!realm) redirect("/start?mode=login&error=realm_unavailable");
  if (!accountRealmAllows(realm, "individual")) redirect("/business");

  return children;
}
