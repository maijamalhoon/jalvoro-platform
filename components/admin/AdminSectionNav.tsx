"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { JalvoroGridIcon } from "@/components/icons/jalvoro/components/interface";
import { JalvoroDashboardIcon } from "@/components/icons/jalvoro/components/navigation";
import type { JalvoroIconComponent } from "@/components/icons/jalvoro/types";
import { getRegisteredCommandCenterNavigation } from "@/lib/admin/command-center-registry";

const NAVIGATION_ICONS: Record<string, JalvoroIconComponent> = {
  dashboard: JalvoroDashboardIcon,
  grid: JalvoroGridIcon,
};

export default function AdminSectionNav() {
  const pathname = usePathname();
  const sections = getRegisteredCommandCenterNavigation();

  return (
    <nav
      aria-label="Command Center sections"
      className="flex items-center gap-1 rounded-xl border border-border/70 bg-card/75 p-1 shadow-sm"
    >
      {sections.map((item) => {
        const exact = item.href === "/admin";
        const active = exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = NAVIGATION_ICONS[item.iconKey] ?? JalvoroGridIcon;

        return (
          <Link
            key={`${item.productKey}:${item.navigationId}`}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={`${item.productName}: ${item.label}`}
            className={`finance-focus inline-flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-medium transition sm:px-3 ${
              active
                ? "bg-info/10 text-info"
                : "text-muted-foreground hover:bg-surface-secondary hover:text-foreground"
            }`}
          >
            <Icon size={16} context="compact" aria-hidden="true" />
            <span className="hidden lg:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
