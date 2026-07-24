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
  JalvoroGridIcon,
  JalvoroMenuIcon,
} from "@/components/icons/jalvoro/components/interface";
import { JalvoroDashboardIcon } from "@/components/icons/jalvoro/components/navigation";
import type { JalvoroIconComponent } from "@/components/icons/jalvoro/types";
import {
  enrichCommandCenterNavigation,
  filterCommandCenterNavigation,
  groupCommandCenterNavigation,
  resolveActiveCommandCenterItem,
  type CommandCenterExperienceItem,
} from "@/lib/admin/command-center-experience";
import type { ResolvedCommandCenterNavigationItem } from "@/lib/admin/command-center-navigation";
import { cn } from "@/lib/utils";

const NAVIGATION_ICONS: Record<string, JalvoroIconComponent> = {
  dashboard: JalvoroDashboardIcon,
  globe: JalvoroGlobeIcon,
  grid: JalvoroGridIcon,
  organizations: JalvoroUsersIcon,
  users: JalvoroUsersIcon,
};

function resolveIcon(item: CommandCenterExperienceItem) {
  return (
    NAVIGATION_ICONS[item.iconKey] ??
    NAVIGATION_ICONS[item.moduleKey] ??
    JalvoroGridIcon
  );
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
        <span className="cc-nav-label">{compact ? item.compactLabel : item.label}</span>
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
  onClose,
}: {
  items: CommandCenterExperienceItem[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const results = useMemo(
    () => filterCommandCenterNavigation(items, query),
    [items, query],
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
            <h2 id="cc-command-title">Move through the control plane</h2>
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
              No registered Command Center module matches this search.
            </div>
          )}
        </div>

        <div className="cc-command-foot">
          <span>Registry-driven navigation</span>
          <span>Future modules appear automatically after authorization</span>
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
    <div className="cc-overlay cc-overlay-mobile" role="presentation" onMouseDown={onClose}>
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
            <h2 id="cc-mobile-modules-title">All registered modules</h2>
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
  const items = useMemo(() => enrichCommandCenterNavigation(sections), [sections]);
  const groups = useMemo(() => groupCommandCenterNavigation(items), [items]);
  const active = useMemo(
    () => resolveActiveCommandCenterItem(items, pathname),
    [items, pathname],
  );
  const primaryMobileItems = items.slice(0, 4);

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

  return (
    <div data-admin-shell className="cc-world">
      <a className="jf-skip-link" href="#admin-main">
        Skip to Command Center content
      </a>

      <aside className="cc-sidebar" aria-label="JALVORO Command Center navigation">
        <Link href="/admin" className="cc-brand finance-focus" aria-label="JALVORO Command Center home">
          <span className="cc-brand-mark">
            <JalvoroShieldMoneyIcon size={24} context="heading" aria-hidden="true" />
          </span>
          <span className="cc-brand-copy">
            <strong>JALVORO</strong>
            <small>Command Center</small>
          </span>
        </Link>

        <div className="cc-plane-status">
          <span className="cc-live-dot" aria-hidden="true" />
          <span>
            <strong>Global control plane</strong>
            <small>Private · production</small>
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
          <button
            type="button"
            className="cc-search-trigger finance-focus"
            onClick={() => setCommandOpen(true)}
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
          <Link href="/admin" className="cc-mobile-brand finance-focus" aria-label="JALVORO Command Center home">
            <span className="cc-brand-mark cc-brand-mark-small">
              <JalvoroShieldMoneyIcon size={19} context="compact" aria-hidden="true" />
            </span>
            <span>
              <strong>JALVORO</strong>
              <small>Command Center</small>
            </span>
          </Link>

          <div className="cc-context">
            <span className="cc-context-icon" aria-hidden="true">
              {active ? (() => {
                const ActiveIcon = resolveIcon(active);
                return <ActiveIcon size={18} context="compact" />;
              })() : <JalvoroMenuIcon size={18} context="compact" />}
            </span>
            <span>
              <strong>{active?.label ?? "Command Center"}</strong>
              <small>{active?.groupLabel ?? "Global operations"}</small>
            </span>
          </div>

          <div className="cc-topbar-actions">
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
          aria-label="JALVORO Global Admin and Operations Control Center content"
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
          className={cn("cc-nav-link cc-nav-link-compact finance-focus", mobileModulesOpen && "cc-nav-link-active")}
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
        onClose={() => setCommandOpen(false)}
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
