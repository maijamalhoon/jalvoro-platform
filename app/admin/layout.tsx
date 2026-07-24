import type { Metadata } from "next";
import Link from "next/link";

import AdminSectionNav from "@/components/admin/AdminSectionNav";
import { JalvoroShieldMoneyIcon } from "@/components/icons/jalvoro/components/finance";
import { JalvoroArrowLeftIcon } from "@/components/icons/jalvoro/components/interface";

export const metadata: Metadata = {
  title: "Command Center | JALVORO",
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
  return (
    <div
      data-admin-shell
      className="min-h-dvh bg-background text-foreground"
    >
      <a className="jf-skip-link" href="#command-center-main">
        Skip to Command Center content
      </a>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/88 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            href="/admin"
            className="finance-focus flex min-w-0 items-center gap-3 rounded-xl"
            aria-label="JALVORO Command Center"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-2xl border border-info/20 bg-info/8 text-info">
              <JalvoroShieldMoneyIcon
                size={20}
                context="heading"
                aria-hidden="true"
              />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate text-sm font-semibold tracking-tight">
                JALVORO
              </span>
              <span className="block truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Command Center
              </span>
            </span>
          </Link>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <AdminSectionNav />
            <Link
              href="/dashboard"
              className="finance-focus inline-flex h-11 items-center gap-2 rounded-xl border border-border/70 bg-card/80 px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-secondary"
            >
              <JalvoroArrowLeftIcon
                size={16}
                context="compact"
                aria-hidden="true"
              />
              <span className="hidden xl:inline">Exit Command Center</span>
              <span className="sr-only xl:hidden">Exit JALVORO Command Center</span>
            </Link>
          </div>
        </div>
      </header>

      <main
        id="command-center-main"
        tabIndex={-1}
        aria-label="JALVORO Global Admin & Operations Control Center content"
        className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8"
      >
        {children}
      </main>
    </div>
  );
}
