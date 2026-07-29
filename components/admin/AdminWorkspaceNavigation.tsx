import Link from "next/link";

import { cn } from "@/lib/utils";

export const ADMIN_WORKSPACE_VIEWS = [
  "overview",
  "users",
  "organizations",
  "security",
  "reliability",
  "finance",
  "governance",
  "releases",
  "operations",
] as const;

export type AdminWorkspaceView = (typeof ADMIN_WORKSPACE_VIEWS)[number];

const ITEMS: Array<{
  view: AdminWorkspaceView;
  label: string;
  compact: string;
  description: string;
}> = [
  { view: "overview", label: "Overview", compact: "Home", description: "Action-first global pulse" },
  { view: "users", label: "User 360", compact: "Users", description: "Identity, sessions and devices" },
  { view: "organizations", label: "Organizations", compact: "Orgs", description: "Tenants, members and grants" },
  { view: "security", label: "Security & access", compact: "Security", description: "Operators, permissions and posture" },
  { view: "reliability", label: "Reliability", compact: "Reliability", description: "Incidents, errors and performance" },
  { view: "finance", label: "Finance operations", compact: "Finance", description: "Plans, billing and subscriptions" },
  { view: "governance", label: "Governance", compact: "Govern", description: "Privacy, compliance and retention" },
  { view: "releases", label: "Release control", compact: "Release", description: "Readiness, evidence and approvals" },
  { view: "operations", label: "Global topology", compact: "Topology", description: "Products, regions and platforms" },
];

export default function AdminWorkspaceNavigation({
  active,
}: {
  active: AdminWorkspaceView;
}) {
  return (
    <nav className="cc-workspace-nav" aria-label="Command Center operating workspaces">
      <div className="cc-workspace-nav-track">
        {ITEMS.map((item) => (
          <Link
            key={item.view}
            href={item.view === "overview" ? "/admin" : `/admin?view=${item.view}`}
            aria-current={active === item.view ? "page" : undefined}
            className={cn(
              "cc-workspace-nav-item finance-focus",
              active === item.view && "cc-workspace-nav-item-active",
            )}
          >
            <span className="cc-workspace-nav-label">
              <span className="cc-workspace-nav-label-full">{item.label}</span>
              <span className="cc-workspace-nav-label-compact">{item.compact}</span>
            </span>
            <small>{item.description}</small>
          </Link>
        ))}
      </div>
    </nav>
  );
}
