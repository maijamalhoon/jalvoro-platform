import type { Metadata } from "next";

import AdminCommandCenterOperatorAssist from "@/components/admin/AdminCommandCenterOperatorAssist";
import AdminCommandCenterShell from "@/components/admin/AdminCommandCenterShell";

import "../admin/command-center-world.css";
import "../admin/command-center-launch.css";
import "../admin/command-center-launch-mobile.css";
import "../admin/organization-operations.css";
import "../admin/organization-operations-detail.css";
import "../admin/command-center-audit-fixes.css";

export const metadata: Metadata = {
  title: {
    default: "Command Center | JALVORO",
    template: "%s | JALVORO Command Center",
  },
  description:
    "Private JALVORO Command Center for administration, analytics, security, billing, support, governance, configuration, and operational control.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export const dynamic = "force-dynamic";

export default function CommandCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminCommandCenterShell>{children}</AdminCommandCenterShell>
      <AdminCommandCenterOperatorAssist />
    </>
  );
}
