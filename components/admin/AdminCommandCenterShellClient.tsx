"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  JalvoroCloseIcon,
  JalvoroMoreIcon,
  JalvoroRefreshIcon,
  JalvoroSearchIcon,
} from "@/components/icons/jalvoro/components/actions";
import { JalvoroGlobeIcon } from "@/components/icons/jalvoro/components/communication";
import { JalvoroShieldMoneyIcon } from "@/components/icons/jalvoro/components/finance";
import { JalvoroUsersIcon } from "@/components/icons/jalvoro/components/identity";
import {
  JalvoroEyeIcon,
  JalvoroGridIcon,
  JalvoroMenuIcon,
} from "@/components/icons/jalvoro/components/interface";
import { JalvoroDashboardIcon } from "@/components/icons/jalvoro/components/navigation";
import { JalvoroClockIcon } from "@/components/icons/jalvoro/components/objects";
import type { JalvoroIconComponent } from "@/components/icons/jalvoro/types";
import {
  enrichCommandCenterNavigation,
  filterCommandCenterNavigation,
} from "@/lib/admin/command-center-experience";
import type { ResolvedCommandCenterNavigationItem } from "@/lib/admin/command-center-navigation";
import {
  applyThemePreference,
  getStoredThemePreference,
  THEME_CHANGE_EVENT,
  type ThemePreference,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

type CoreModuleId =
  | "overview"
  | "users"
  | "organizations"
  | "security"
  | "reliability"
  | "finance"
  | "governance"
  | "releases"
  | "operations";

type CoreModule = {
  id: CoreModuleId;
  label: string;
  compactLabel: string;
  group: "Command" | "Ecosystem" | "Platform" | "Commercial" | "Control";
  description: string;
  href: string;
  icon: JalvoroIconComponent;
};

const CORE_MODULES: CoreModule[] = [
  {
    id: "overview",
    label: "Pulse",
    compactLabel: "Pulse",
    group: "Command",
    description: "Live priorities, health and audited activity.",
    href: "/admin",
    icon: JalvoroDashboardIcon,
  },
  {
    id: "users",
    label: "Users",
    compactLabel: "Users",
    group: "Ecosystem",
    description: "Identity, sessions, devices and access context.",
    href: "/admin?view=users",
    icon: JalvoroUsersIcon,
  },
  {
    id: "organizations",
    label: "Organizations",
    compactLabel: "Orgs",
    group: "Ecosystem",
    description: "Tenants, members, roles and scoped grants.",
    href: "/admin?view=organizations",
    icon: JalvoroUsersIcon,
  },
  {
    id: "reliability",
    label: "Health",
    compactLabel: "Health",
    group: "Platform",
    description: "Incidents, failures and performance signals.",
    href: "/admin?view=reliability",
    icon: JalvoroClockIcon,
  },
  {
    id: "operations",
    label: "Topology",
    compactLabel: "Map",
    group: "Platform",
    description: "Products, regions, devices and runtime distribution.",
    href: "/admin?view=operations",
    icon: JalvoroGlobeIcon,
  },
  {
    id: "finance",
    label: "Billing",
    compactLabel: "Billing",
    group: "Commercial",
    description: "Plans, subscriptions and provider operations.",
    href: "/admin?view=finance",
    icon: JalvoroShieldMoneyIcon,
  },
  {
    id: "security",
    label: "Security",
    compactLabel: "Secure",
    group: "Control",
    description: "Posture, operators and privileged access.",
    href: "/admin?view=security",
    icon: JalvoroShieldMoneyIcon,
  },
  {
    id: "governance",
    label: "Governance",
    compactLabel: "Govern",
    group: "Control",
    description: "Privacy, compliance, retention and audit.",
    href: "/admin?view=governance",
    icon: JalvoroMenuIcon,
  },
  {
    id: "releases",
    label: "Releases",
    compactLabel: "Release",
    group: "Control",
    description: "Readiness, approvals and deployment evidence.",
    href: "/admin?view=releases",
    icon: JalvoroGridIcon,
  },
];

const CORE_GROUPS: CoreModule["group"][] = [
  "Command",
  "Ecosystem",
  "Platform",
  "Commercial",
  "Control",
];

const THEME_LABELS: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

function getNextThemePreference(preference: ThemePreference): ThemePreference {
  if (preference === "system") return "dark";
  if (preference === "dark") return "light";
  return "system";
}

function formatOperatorTime(now: Date | null) {
  if (!now) return "--:--";
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(now);
  } catch {
    return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
}

function formatOperatorDate(now: Date | null) {
  if (!now) return "Local time";
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(now);
  } catch {
    return now.toLocaleDateString();
  }
}

function resolveActiveModule(pathname: string, view: string | null) {
  if (pathname.startsWith("/admin/organizations")) return "organizations";
  if (pathname.startsWith("/admin/global-operations")) return "operations";
  if (view && CORE_MODULES.some((item) => item.id === view)) {
    return view as CoreModuleId;
  }
  return "overview";
}

function CoreModuleLink({
  item,
  active,
  compact = false,
  onNavigate,
}: {
  item: CoreModule;
  active: boolean;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={`${item.label}: ${item.description}`}
      title={item.label}
      onClick={onNavigate}
      className={cn(
        "cc-next-nav-link finance-focus",
        active && "cc-next-nav-link-active",
        compact && "cc-next-nav-link-compact",
      )}
    >
      <span className="cc-next-nav-icon" aria-hidden="true">
        <Icon size={compact ? 19 : 18} context="compact" />
      </span>
      <span className="cc-next-nav-copy">
        <strong>{compact ? item.compactLabel : item.label}</strong>
      </span>
    </Link>
  );
}

function CommandPalette({
  open,
  online,
  registry,
  themePreference,
  onClose,
  onRefresh,
  onCycleTheme,
}: {
  open: boolean;
  online: boolean;
  registry: ReturnType<typeof enrichCommandCenterNavigation>;
  themePreference: ThemePreference;
  onClose: () => void;
  onRefresh: () => void;
  onCycleTheme: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("en-US");
  const coreResults = useMemo(
    () =>
      CORE_MODULES.filter((item) =>
        [item.label, item.group, item.description]
          .join(" ")
          .toLocaleLowerCase("en-US")
          .includes(normalizedQuery),
      ),
    [normalizedQuery],
  );
  const registryResults = useMemo(
    () =>
      filterCommandCenterNavigation(registry, query).filter(
        (item) => !CORE_MODULES.some((module) => module.href === item.href),
      ),
    [query, registry],
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  if (!open) return null;

  return (
    <div className="cc-next-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="cc-next-command"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cc-next-command-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="cc-next-command-head">
          <div>
            <span className="cc-next-eyebrow">COMMAND</span>
            <h2 id="cc-next-command-title">Navigate or operate</h2>
          </div>
          <span className="cc-next-command-network" data-online={online}>
            <span aria-hidden="true" />
            {online ? "Connected" : "Offline"}
          </span>
          <button
            type="button"
            className="cc-next-icon-button finance-focus"
            onClick={onClose}
            aria-label="Close command palette"
          >
            <JalvoroCloseIcon size={18} context="compact" aria-hidden="true" />
          </button>
        </header>

        <label className="cc-next-command-search">
          <JalvoroSearchIcon size={19} context="compact" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search users, billing, security, releases…"
            autoComplete="off"
          />
          <kbd>Esc</kbd>
        </label>

        {!normalizedQuery ? (
          <div className="cc-next-command-actions">
            <button
              type="button"
              onClick={() => {
                onClose();
                onRefresh();
              }}
            >
              <JalvoroRefreshIcon size={18} context="compact" aria-hidden="true" />
              <span><strong>Refresh</strong><small>Reload live evidence</small></span>
            </button>
            <button type="button" onClick={onCycleTheme}>
              <JalvoroEyeIcon size={18} context="compact" aria-hidden="true" />
              <span><strong>Theme</strong><small>{THEME_LABELS[themePreference]}</small></span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push("/admin?view=operations");
              }}
            >
              <JalvoroGlobeIcon size={18} context="compact" aria-hidden="true" />
              <span><strong>Topology</strong><small>Open system map</small></span>
            </button>
          </div>
        ) : null}

        <div className="cc-next-command-results">
          {coreResults.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onClose();
                  router.push(item.href);
                }}
              >
                <span className="cc-next-command-result-icon">
                  <Icon size={19} context="compact" aria-hidden="true" />
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
                <b>{item.group}</b>
              </button>
            );
          })}
          {registryResults.map((item) => (
            <button
              key={`${item.productKey}:${item.navigationId}`}
              type="button"
              onClick={() => {
                onClose();
                router.push(item.href);
              }}
            >
              <span className="cc-next-command-result-icon">
                <JalvoroGridIcon size={19} context="compact" aria-hidden="true" />
              </span>
              <span>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
              <b>Registry</b>
            </button>
          ))}
          {coreResults.length === 0 && registryResults.length === 0 ? (
            <div className="cc-next-command-empty">No authorized operation matches.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function MobileModules({
  open,
  activeId,
  onClose,
}: {
  open: boolean;
  activeId: CoreModuleId;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="cc-next-overlay cc-next-overlay-mobile" role="presentation" onMouseDown={onClose}>
      <section
        className="cc-next-mobile-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cc-next-mobile-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="cc-next-mobile-handle" aria-hidden="true" />
        <header>
          <div>
            <span className="cc-next-eyebrow">SYSTEM MAP</span>
            <h2 id="cc-next-mobile-title">Command modules</h2>
          </div>
          <button type="button" className="cc-next-icon-button" onClick={onClose} aria-label="Close module menu">
            <JalvoroCloseIcon size={18} context="compact" aria-hidden="true" />
          </button>
        </header>
        <div className="cc-next-mobile-groups">
          {CORE_GROUPS.map((group) => (
            <section key={group}>
              <p>{group}</p>
              <div>
                {CORE_MODULES.filter((item) => item.group === group).map((item) => (
                  <CoreModuleLink
                    key={item.id}
                    item={item}
                    active={activeId === item.id}
                    onNavigate={onClose}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function AdminCommandCenterShellClient({
  sections,
  children,
}: {
  sections: ResolvedCommandCenterNavigationItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileModulesOpen, setMobileModulesOpen] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");
  const [online, setOnline] = useState(true);
  const [now, setNow] = useState<Date | null>(null);
  const [timeZone, setTimeZone] = useState("Local");
  const registry = useMemo(() => enrichCommandCenterNavigation(sections), [sections]);
  const activeId = resolveActiveModule(pathname, searchParams.get("view"));
  const activeModule = CORE_MODULES.find((item) => item.id === activeId) ?? CORE_MODULES[0];
  const primaryMobileModules = CORE_MODULES.filter((item) =>
    ["overview", "users", "organizations", "reliability"].includes(item.id),
  );

  function cycleTheme() {
    const nextPreference = getNextThemePreference(themePreference);
    applyThemePreference(nextPreference);
    setThemePreference(nextPreference);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
        setMobileModulesOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const locked = commandOpen || mobileModulesOpen;
    document.documentElement.classList.toggle("cc-scroll-locked", locked);
    return () => document.documentElement.classList.remove("cc-scroll-locked");
  }, [commandOpen, mobileModulesOpen]);

  useEffect(() => {
    function syncTheme() {
      setThemePreference(getStoredThemePreference());
    }
    syncTheme();
    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
  }, []);

  useEffect(() => {
    function syncNetwork() {
      setOnline(window.navigator.onLine);
    }
    syncNetwork();
    window.addEventListener("online", syncNetwork);
    window.addEventListener("offline", syncNetwork);
    return () => {
      window.removeEventListener("online", syncNetwork);
      window.removeEventListener("offline", syncNetwork);
    };
  }, []);

  useEffect(() => {
    function syncClock() {
      setNow(new Date());
      try {
        setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "Local");
      } catch {
        setTimeZone("Local");
      }
    }
    syncClock();
    const interval = window.setInterval(syncClock, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      data-admin-shell
      data-network={online ? "online" : "offline"}
      data-theme-preference={themePreference}
      className="cc-world cc-next-world"
    >
      <div className="cc-next-atmosphere" aria-hidden="true" />
      <a className="jf-skip-link" href="#admin-main">Skip to Command Center content</a>

      <aside className="cc-next-sidebar" aria-label="Command Center navigation">
        <Link href="/admin" className="cc-next-brand finance-focus" aria-label="JALVORO Command Center home">
          <span className="cc-next-brand-mark">
            <JalvoroShieldMoneyIcon size={22} context="heading" aria-hidden="true" />
          </span>
          <span>
            <strong>JALVORO</strong>
            <small>COMMAND CENTER</small>
          </span>
        </Link>

        <div className="cc-next-plane" data-online={online}>
          <span className="cc-next-plane-orbit" aria-hidden="true"><i /></span>
          <span>
            <strong>{online ? "Control plane live" : "Connection lost"}</strong>
            <small>{registry.length} registry nodes</small>
          </span>
        </div>

        <nav className="cc-next-sidebar-nav" aria-label="Operating modules">
          {CORE_GROUPS.map((group) => (
            <section key={group} className="cc-next-nav-group">
              <p>{group}</p>
              <div>
                {CORE_MODULES.filter((item) => item.group === group).map((item) => (
                  <CoreModuleLink key={item.id} item={item} active={activeId === item.id} />
                ))}
              </div>
            </section>
          ))}
        </nav>

        <div className="cc-next-sidebar-foot">
          <button type="button" className="cc-next-search-trigger finance-focus" onClick={() => setCommandOpen(true)}>
            <JalvoroSearchIcon size={18} context="compact" aria-hidden="true" />
            <span>Command</span>
            <kbd>⌘K</kbd>
          </button>
          <div className="cc-next-operator-time">
            <JalvoroClockIcon size={16} context="compact" aria-hidden="true" />
            <span><strong>{formatOperatorTime(now)}</strong><small>{timeZone}</small></span>
          </div>
        </div>
      </aside>

      <div className="cc-next-stage">
        <header className="cc-next-topbar">
          <div className="cc-next-context">
            <span className="cc-next-context-icon" aria-hidden="true">
              <activeModule.icon size={18} context="compact" />
            </span>
            <span>
              <small>{activeModule.group}</small>
              <strong>{activeModule.label}</strong>
            </span>
          </div>

          <div className="cc-next-topbar-center" aria-label="System status">
            <span data-online={online}><i aria-hidden="true" />{online ? "CONNECTED" : "OFFLINE"}</span>
            <span>{formatOperatorDate(now)}</span>
          </div>

          <div className="cc-next-topbar-actions">
            <button type="button" className="cc-next-top-action finance-focus" onClick={() => setCommandOpen(true)}>
              <JalvoroSearchIcon size={17} context="compact" aria-hidden="true" />
              <span>Command</span>
            </button>
            <button type="button" className="cc-next-icon-button finance-focus" onClick={cycleTheme} aria-label={`Cycle theme. Current: ${THEME_LABELS[themePreference]}`}>
              <JalvoroEyeIcon size={18} context="compact" aria-hidden="true" />
            </button>
            <button type="button" className="cc-next-icon-button finance-focus" onClick={() => router.refresh()} aria-label="Refresh current data">
              <JalvoroRefreshIcon size={18} context="compact" aria-hidden="true" />
            </button>
          </div>
        </header>

        <main id="admin-main" tabIndex={-1} aria-label="JALVORO Command Center content" className="cc-content cc-next-canvas">
          {children}
        </main>
      </div>

      <nav className="cc-next-mobile-dock" aria-label="Primary Command Center modules">
        {primaryMobileModules.map((item) => (
          <CoreModuleLink key={item.id} item={item} active={activeId === item.id} compact />
        ))}
        <button
          type="button"
          className={cn("cc-next-nav-link cc-next-nav-link-compact", mobileModulesOpen && "cc-next-nav-link-active")}
          onClick={() => setMobileModulesOpen(true)}
          aria-label="Open all Command Center modules"
        >
          <span className="cc-next-nav-icon" aria-hidden="true"><JalvoroMoreIcon size={19} context="compact" /></span>
          <span className="cc-next-nav-copy"><strong>More</strong></span>
        </button>
      </nav>

      <CommandPalette
        open={commandOpen}
        online={online}
        registry={registry}
        themePreference={themePreference}
        onClose={() => setCommandOpen(false)}
        onRefresh={() => router.refresh()}
        onCycleTheme={cycleTheme}
      />
      <MobileModules open={mobileModulesOpen} activeId={activeId} onClose={() => setMobileModulesOpen(false)} />
    </div>
  );
}
