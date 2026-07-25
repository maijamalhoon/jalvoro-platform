"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  JalvoroArrowLeftIcon,
  JalvoroEyeIcon,
  JalvoroGridIcon,
  JalvoroMenuIcon,
  JalvoroSidebarIcon,
} from "@/components/icons/jalvoro/components/interface";
import { JalvoroDashboardIcon } from "@/components/icons/jalvoro/components/navigation";
import { JalvoroClockIcon } from "@/components/icons/jalvoro/components/objects";
import type { JalvoroIconComponent } from "@/components/icons/jalvoro/types";
import {
  enrichCommandCenterNavigation,
  filterCommandCenterNavigation,
  groupCommandCenterNavigation,
  resolveActiveCommandCenterItem,
  type CommandCenterExperienceItem,
} from "@/lib/admin/command-center-experience";
import type { ResolvedCommandCenterNavigationItem } from "@/lib/admin/command-center-navigation";
import {
  applyThemePreference,
  getStoredThemePreference,
  THEME_CHANGE_EVENT,
  type ThemePreference,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const SIDEBAR_DENSITY_STORAGE_KEY = "jalvoro-command-center-sidebar-density";

const NAVIGATION_ICONS: Record<string, JalvoroIconComponent> = {
  dashboard: JalvoroDashboardIcon,
  globe: JalvoroGlobeIcon,
  grid: JalvoroGridIcon,
  organizations: JalvoroUsersIcon,
  users: JalvoroUsersIcon,
};

const THEME_LABELS: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

function resolveIcon(item: CommandCenterExperienceItem) {
  return (
    NAVIGATION_ICONS[item.iconKey] ??
    NAVIGATION_ICONS[item.moduleKey] ??
    JalvoroGridIcon
  );
}

function getNextThemePreference(preference: ThemePreference): ThemePreference {
  if (preference === "system") return "light";
  if (preference === "light") return "dark";
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
  if (!now) return "Local operator time";

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

function SectionLink({
  item,
  active,
  compact = false,
  onNavigate,
}: {
  item: CommandCenterExperienceItem;
  active: boolean;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = resolveIcon(item);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={`${item.label}: ${item.description}`}
      title={item.label}
      onClick={onNavigate}
      className={cn(
        "cc-nav-link finance-focus",
        active && "cc-nav-link-active",
        compact && "cc-nav-link-compact",
      )}
    >
      <span className="cc-nav-icon" aria-hidden="true">
        <Icon size={compact ? 19 : 18} context="compact" />
      </span>
      <span className="cc-nav-copy">
        <span className="cc-nav-label">
          {compact ? item.compactLabel : item.label}
        </span>
        {!compact ? (
          <span className="cc-nav-description">{item.description}</span>
        ) : null}
      </span>
    </Link>
  );
}

function CommandPalette({
  items,
  open,
  online,
  themePreference,
  sidebarCompact,
  onClose,
  onRefresh,
  onCycleTheme,
  onToggleSidebar,
}: {
  items: CommandCenterExperienceItem[];
  open: boolean;
  online: boolean;
  themePreference: ThemePreference;
  sidebarCompact: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onCycleTheme: () => void;
  onToggleSidebar: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const results = useMemo(
    () => filterCommandCenterNavigation(items, query),
    [items, query],
  );
  const showQuickActions = query.trim().length === 0;

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
    <div className="cc-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="cc-command-palette"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cc-command-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="cc-command-head">
          <div>
            <p className="cc-kicker">Global command</p>
            <h2 id="cc-command-title">Operate the JALVORO control plane</h2>
            <span
              className="cc-command-head-status"
              data-network={online ? "online" : "offline"}
              role="status"
            >
              <span className="cc-signal-dot" aria-hidden="true" />
              {online ? "Browser network online" : "Browser network offline"}
            </span>
          </div>
          <button
            type="button"
            className="cc-icon-button finance-focus"
            onClick={onClose}
            aria-label="Close command menu"
          >
            <JalvoroCloseIcon size={18} context="compact" aria-hidden="true" />
          </button>
        </div>

        <label className="cc-command-search">
          <JalvoroSearchIcon size={19} context="compact" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search operations, products, regions, access…"
            autoComplete="off"
          />
          <kbd>Esc</kbd>
        </label>

        {showQuickActions ? (
          <div className="cc-command-quick">
            <p className="cc-command-section-label">Operator actions</p>
            <div className="cc-command-quick-grid">
              <button
                type="button"
                className="cc-command-action finance-focus"
                onClick={() => {
                  onClose();
                  onRefresh();
                }}
              >
                <span className="cc-command-action-icon" aria-hidden="true">
                  <JalvoroRefreshIcon size={19} context="compact" />
                </span>
                <span className="cc-command-action-copy">
                  <strong>Refresh live snapshot</strong>
                  <small>Revalidate the current server-rendered view</small>
                </span>
              </button>
              <button
                type="button"
                className="cc-command-action finance-focus"
                onClick={onCycleTheme}
              >
                <span className="cc-command-action-icon" aria-hidden="true">
                  <JalvoroEyeIcon size={19} context="compact" />
                </span>
                <span className="cc-command-action-copy">
                  <strong>Cycle global theme</strong>
                  <small>Current mode: {THEME_LABELS[themePreference]}</small>
                </span>
              </button>
              <button
                type="button"
                className="cc-command-action finance-focus"
                onClick={onToggleSidebar}
              >
                <span className="cc-command-action-icon" aria-hidden="true">
                  <JalvoroSidebarIcon size={19} context="compact" />
                </span>
                <span className="cc-command-action-copy">
                  <strong>Change navigation density</strong>
                  <small>
                    {sidebarCompact ? "Switch to comfortable" : "Switch to compact"}
                  </small>
                </span>
              </button>
              <button
                type="button"
                className="cc-command-action finance-focus"
                onClick={() => {
                  onClose();
                  router.push("/dashboard");
                }}
              >
                <span className="cc-command-action-icon" aria-hidden="true">
                  <JalvoroArrowLeftIcon size={19} context="compact" />
                </span>
                <span className="cc-command-action-copy">
                  <strong>Exit to workspace</strong>
                  <small>Return to the authenticated product</small>
                </span>
              </button>
            </div>
          </div>
        ) : null}

        <div className="cc-command-results">
          {results.length > 0 ? (
            results.map((item) => {
              const Icon = resolveIcon(item);
              return (
                <button
                  key={`${item.productKey}:${item.navigationId}`}
                  type="button"
                  className="cc-command-result finance-focus"
                  onClick={() => {
                    onClose();
                    router.push(item.href);
                  }}
                >
                  <span className="cc-command-result-icon">
                    <Icon size={20} context="compact" aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                  <span className="cc-command-group">{item.groupLabel}</span>
                </button>
              );
            })
          ) : (
            <div className="cc-command-empty">
              No authorized Command Center module matches this search.
            </div>
          )}
        </div>

        <div className="cc-command-statusbar">
          <span>{items.length} authorized registry modules</span>
          <span>Future modules appear only after server authorization</span>
        </div>
      </section>
    </div>
  );
}

function MobileModuleSheet({
  items,
  active,
  open,
  onClose,
}: {
  items: CommandCenterExperienceItem[];
  active: CommandCenterExperienceItem | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="cc-overlay cc-overlay-mobile"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="cc-mobile-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cc-mobile-modules-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="cc-mobile-sheet-handle" aria-hidden="true" />
        <div className="cc-mobile-sheet-head">
          <div>
            <p className="cc-kicker">Command Center world</p>
            <h2 id="cc-mobile-modules-title">All authorized modules</h2>
          </div>
          <button
            type="button"
            className="cc-icon-button finance-focus"
            onClick={onClose}
            aria-label="Close module menu"
          >
            <JalvoroCloseIcon size={18} context="compact" aria-hidden="true" />
          </button>
        </div>
        <div className="cc-mobile-sheet-groups">
          {groupCommandCenterNavigation(items).map((group) => (
            <div key={group.group} className="cc-mobile-sheet-group">
              <p>{group.label}</p>
              <div>
                {group.items.map((item) => (
                  <SectionLink
                    key={`${item.productKey}:${item.navigationId}`}
                    item={item}
                    active={active?.navigationId === item.navigationId}
                    onNavigate={onClose}
                  />
                ))}
              </div>
            </div>
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
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileModulesOpen, setMobileModulesOpen] = useState(false);
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const [themePreference, setThemePreference] =
    useState<ThemePreference>("system");
  const [online, setOnline] = useState(true);
  const [now, setNow] = useState<Date | null>(null);
  const [timeZone, setTimeZone] = useState("Local time");
  const items = useMemo(() => enrichCommandCenterNavigation(sections), [sections]);
  const groups = useMemo(() => groupCommandCenterNavigation(items), [items]);
  const active = useMemo(
    () => resolveActiveCommandCenterItem(items, pathname),
    [items, pathname],
  );
  const primaryMobileItems = items.slice(0, 4);
  const timeLabel = formatOperatorTime(now);
  const dateLabel = formatOperatorDate(now);

  function cycleTheme() {
    const nextPreference = getNextThemePreference(themePreference);
    applyThemePreference(nextPreference);
    setThemePreference(nextPreference);
  }

  function toggleSidebarDensity() {
    setSidebarCompact((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(
          SIDEBAR_DENSITY_STORAGE_KEY,
          next ? "compact" : "comfortable",
        );
      } catch {
        // The visual preference still applies for this session.
      }
      return next;
    });
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
    try {
      setSidebarCompact(
        window.localStorage.getItem(SIDEBAR_DENSITY_STORAGE_KEY) === "compact",
      );
    } catch {
      setSidebarCompact(false);
    }
  }, []);

  useEffect(() => {
    function syncThemePreference() {
      setThemePreference(getStoredThemePreference());
    }

    syncThemePreference();
    window.addEventListener(THEME_CHANGE_EVENT, syncThemePreference);
    return () =>
      window.removeEventListener(THEME_CHANGE_EVENT, syncThemePreference);
  }, []);

  useEffect(() => {
    function syncNetworkState() {
      setOnline(window.navigator.onLine);
    }

    syncNetworkState();
    window.addEventListener("online", syncNetworkState);
    window.addEventListener("offline", syncNetworkState);
    return () => {
      window.removeEventListener("online", syncNetworkState);
      window.removeEventListener("offline", syncNetworkState);
    };
  }, []);

  useEffect(() => {
    function syncClock() {
      setNow(new Date());
      try {
        setTimeZone(
          Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time",
        );
      } catch {
        setTimeZone("Local time");
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
      data-sidebar-density={sidebarCompact ? "compact" : "comfortable"}
      data-theme-preference={themePreference}
      className="cc-world"
    >
      <a className="jf-skip-link" href="#admin-main">
        Skip to Command Center content
      </a>

      <aside className="cc-sidebar" aria-label="JALVORO Command Center navigation">
        <Link
          href="/admin"
          className="cc-brand finance-focus"
          aria-label="JALVORO Command Center home"
        >
          <span className="cc-brand-mark">
            <JalvoroShieldMoneyIcon
              size={24}
              context="heading"
              aria-hidden="true"
            />
          </span>
          <span className="cc-brand-copy">
            <strong>JALVORO</strong>
            <small>Global Command Center</small>
          </span>
        </Link>

        <div className="cc-plane-status">
          <span className="cc-live-dot" aria-hidden="true" />
          <span>
            <strong>Global control plane</strong>
            <small>
              {online ? "Browser online" : "Browser offline"} · {timeZone}
            </small>
          </span>
        </div>

        <nav className="cc-sidebar-nav" aria-label="Command Center modules">
          {groups.map((group) => (
            <div key={group.group} className="cc-nav-group">
              <p className="cc-nav-group-label">{group.label}</p>
              <div className="cc-nav-group-items">
                {group.items.map((item) => (
                  <SectionLink
                    key={`${item.productKey}:${item.navigationId}`}
                    item={item}
                    active={active?.navigationId === item.navigationId}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="cc-sidebar-foot">
          <div className="cc-sidebar-intelligence" aria-label="Operator context">
            <div className="cc-sidebar-intelligence-row">
              <span>Authorized modules</span>
              <strong>{items.length}</strong>
            </div>
            <div className="cc-sidebar-intelligence-row">
              <span>Global theme</span>
              <strong>{THEME_LABELS[themePreference]}</strong>
            </div>
            <div className="cc-sidebar-intelligence-row">
              <span>Operator time</span>
              <strong>{timeLabel}</strong>
            </div>
          </div>
          <button
            type="button"
            className="cc-search-trigger finance-focus"
            onClick={() => setCommandOpen(true)}
            aria-label="Search Command Center"
          >
            <JalvoroSearchIcon size={18} context="compact" aria-hidden="true" />
            <span>Search Command Center</span>
            <kbd>⌘K</kbd>
          </button>
          <Link href="/dashboard" className="cc-exit-link finance-focus">
            <JalvoroArrowLeftIcon size={17} context="compact" aria-hidden="true" />
            <span>Exit to workspace</span>
          </Link>
        </div>
      </aside>

      <div className="cc-stage">
        <header className="cc-topbar">
          <Link
            href="/admin"
            className="cc-mobile-brand finance-focus"
            aria-label="JALVORO Command Center home"
          >
            <span className="cc-brand-mark cc-brand-mark-small">
              <JalvoroShieldMoneyIcon
                size={19}
                context="compact"
                aria-hidden="true"
              />
            </span>
            <span>
              <strong>JALVORO</strong>
              <small>Command Center</small>
            </span>
          </Link>

          <div className="cc-context">
            <span className="cc-context-icon" aria-hidden="true">
              {active ? (
                (() => {
                  const ActiveIcon = resolveIcon(active);
                  return <ActiveIcon size={18} context="compact" />;
                })()
              ) : (
                <JalvoroMenuIcon size={18} context="compact" />
              )}
            </span>
            <span>
              <strong>{active?.label ?? "Command Center"}</strong>
              <small>{active?.groupLabel ?? "Global operations"}</small>
            </span>
          </div>

          <div className="cc-topbar-actions cc-operator-strip">
            <span
              className="cc-signal"
              data-network={online ? "online" : "offline"}
              role="status"
            >
              <span className="cc-signal-dot" aria-hidden="true" />
              {online ? "Online" : "Offline"}
            </span>
            <span className="cc-clock-chip" aria-label={`${dateLabel}, ${timeZone}`}>
              <JalvoroClockIcon size={17} context="compact" aria-hidden="true" />
              <span>
                <strong>{timeLabel}</strong>
                <small>{dateLabel} · {timeZone}</small>
              </span>
            </span>
            <button
              type="button"
              className="cc-theme-trigger finance-focus"
              onClick={cycleTheme}
              aria-label={`Cycle global theme. Current mode: ${THEME_LABELS[themePreference]}`}
            >
              <JalvoroEyeIcon size={18} context="compact" aria-hidden="true" />
              <span>{THEME_LABELS[themePreference]}</span>
            </button>
            <button
              type="button"
              className="cc-density-trigger finance-focus"
              onClick={toggleSidebarDensity}
              aria-label={
                sidebarCompact
                  ? "Use comfortable Command Center navigation"
                  : "Use compact Command Center navigation"
              }
            >
              <JalvoroSidebarIcon size={18} context="compact" aria-hidden="true" />
              <span>{sidebarCompact ? "Comfortable" : "Compact"}</span>
            </button>
            <button
              type="button"
              className="cc-icon-button finance-focus"
              onClick={() => setCommandOpen(true)}
              aria-label="Search Command Center"
            >
              <JalvoroSearchIcon size={18} context="compact" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="cc-icon-button finance-focus"
              onClick={() => router.refresh()}
              aria-label="Refresh current Command Center view"
            >
              <JalvoroRefreshIcon size={18} context="compact" aria-hidden="true" />
            </button>
            <Link
              href="/dashboard"
              className="cc-icon-button finance-focus cc-topbar-exit"
              aria-label="Exit Command Center"
            >
              <JalvoroArrowLeftIcon size={18} context="compact" aria-hidden="true" />
            </Link>
          </div>
        </header>

        <main
          id="admin-main"
          tabIndex={-1}
          aria-label="JALVORO Global Admin and Operations Command Center content"
          className="cc-content"
        >
          {children}
        </main>
      </div>

      <nav className="cc-mobile-dock" aria-label="Primary Command Center modules">
        {primaryMobileItems.map((item) => (
          <SectionLink
            key={`${item.productKey}:${item.navigationId}`}
            item={item}
            active={active?.navigationId === item.navigationId}
            compact
          />
        ))}
        <button
          type="button"
          className={cn(
            "cc-nav-link cc-nav-link-compact finance-focus",
            mobileModulesOpen && "cc-nav-link-active",
          )}
          onClick={() => setMobileModulesOpen(true)}
          aria-label="Open all Command Center modules"
        >
          <span className="cc-nav-icon" aria-hidden="true">
            <JalvoroMoreIcon size={19} context="compact" />
          </span>
          <span className="cc-nav-copy">
            <span className="cc-nav-label">More</span>
          </span>
        </button>
      </nav>

      <CommandPalette
        items={items}
        open={commandOpen}
        online={online}
        themePreference={themePreference}
        sidebarCompact={sidebarCompact}
        onClose={() => setCommandOpen(false)}
        onRefresh={() => router.refresh()}
        onCycleTheme={cycleTheme}
        onToggleSidebar={toggleSidebarDensity}
      />
      <MobileModuleSheet
        items={items}
        active={active}
        open={mobileModulesOpen}
        onClose={() => setMobileModulesOpen(false)}
      />
    </div>
  );
}
