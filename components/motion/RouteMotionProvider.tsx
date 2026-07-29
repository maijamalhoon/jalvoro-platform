"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import StandardMotionPerformance from "@/components/performance/StandardMotionPerformance";

const MotionProvider = dynamic(
  () => import("@/components/motion/MotionProvider"),
);

export default function RouteMotionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  // The landing page uses its own lightweight CSS/IntersectionObserver motion.
  // Avoid loading the full Framer Motion runtime before its primary content is
  // interactive, while retaining the adaptive Standard-mode device tier.
  if (pathname === "/") {
    return (
      <>
        <StandardMotionPerformance />
        {children}
      </>
    );
  }

  return <MotionProvider>{children}</MotionProvider>;
}
