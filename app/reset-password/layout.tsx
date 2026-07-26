import type { Metadata } from "next";
import type { ReactNode } from "react";

import "../auth-clean.css";
import "../auth-clean-fixes.css";
import "../auth-control-alignment.css";
import "../auth-responsive-architecture.css";
import "../auth-adornment-alignment-fix.css";
import "../auth-action-runtime.css";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false, nocache: true },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
