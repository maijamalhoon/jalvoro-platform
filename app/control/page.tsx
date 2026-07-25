import type { Metadata } from "next";
import { redirect } from "next/navigation";

import ControlPlaneConsole from "@/components/control-plane/ControlPlaneConsole";
import ControlPlaneOwnerManagement from "@/components/control-plane/ControlPlaneOwnerManagement";
import {
  parseControlPlaneAccess,
  parseControlPlaneDirectory,
} from "@/lib/control-plane/config";
import { createControlPlaneServerClient } from "@/lib/control-plane/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Control Plane — JALVORO",
  description: "Private JALVORO Root Owner and delegated-operator gateway.",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function ControlPlanePage() {
  const supabase = await createControlPlaneServerClient();
  const userResult = await supabase.auth.getUser();
  if (userResult.error || !userResult.data.user) {
    redirect("/control-login?reason=authentication_required&next=/control");
  }

  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance.error || assurance.data?.currentLevel !== "aal2") {
    redirect("/control-login?reason=mfa_required&next=/control");
  }

  const accessResult = await supabase.rpc("get_my_control_plane_access");
  const access = parseControlPlaneAccess(accessResult.data);
  if (accessResult.error || !access) {
    redirect("/control-login?reason=access_denied&next=/control");
  }

  let directory = null;
  if (access.role === "owner") {
    const directoryResult = await supabase.rpc("get_control_plane_directory");
    if (!directoryResult.error) {
      directory = parseControlPlaneDirectory(directoryResult.data);
    }
  }

  return (
    <>
      <ControlPlaneConsole access={access} directory={directory} />
      {access.isRootOwner && directory ? (
        <ControlPlaneOwnerManagement directory={directory} />
      ) : null}
    </>
  );
}
