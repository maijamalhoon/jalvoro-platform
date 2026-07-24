"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { JalvoroDashboardIcon } from "@/components/icons/jalvoro/components/navigation";
import { JalvoroGridIcon } from "@/components/icons/jalvoro/components/interface";

const ADMIN_SECTIONS = [
  {
    href: "/admin",
    label: "Control center",
    icon: JalvoroDashboardIcon,
    exact: true,
  },
  {
    href: "/admin/icon-system",
    label: "Icon System",
    icon: JalvoroGridIcon,
    exact: false,
  },
] as const;

export default function AdminSectionNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin sections"
      className="flex items-center gap-1 rounded-xl border border-border/70 bg-card/75 p-1 shadow-sm"
    >
      {ADMIN_SECTIONS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={item.label}
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
