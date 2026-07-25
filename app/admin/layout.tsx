import type { Metadata } from "next";

import AdminCommandCenterShell from "@/components/admin/AdminCommandCenterShell";

import "./command-center-world.css";
import "./organization-operations.css";
import "./organization-operations-detail.css";

export const metadata: Metadata = {
  title: {
    default: "Command Center | JALVORO",
    template: "%s | JALVORO Command Center",
  },
  description:
    "JALVORO Global Admin & Operations Control Center for internal administration, analytics, observability, security, billing, support, governance, configuration, and operational control.",
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminCommandCenterShell>{children}</AdminCommandCenterShell>;
}
