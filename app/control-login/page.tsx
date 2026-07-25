import type { Metadata } from "next";

import ControlPlaneLogin from "@/components/control-plane/ControlPlaneLogin";

export const metadata: Metadata = {
  title: "Control Plane Access — JALVORO",
  description: "Dedicated zero-trust access to the JALVORO Control Plane.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function ControlPlaneLoginPage() {
  return <ControlPlaneLogin />;
}
