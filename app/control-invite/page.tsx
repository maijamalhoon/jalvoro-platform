import type { Metadata } from "next";

import ControlPlaneInvitationAcceptance from "@/components/control-plane/ControlPlaneInvitationAcceptance";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Accept Control Plane Invitation — JALVORO",
  description: "Private onboarding for invited JALVORO Control Plane operators.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function ControlPlaneInvitationPage() {
  return <ControlPlaneInvitationAcceptance />;
}
