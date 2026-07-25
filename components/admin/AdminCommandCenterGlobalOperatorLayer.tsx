"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  type AuthorizedOperatorModule,
  isEditableOperatorTarget,
  normalizeAuthorizedOperatorModules,
  resolveOperatorShortcutIntent,
} from "@/lib/admin/command-center-operator-shortcuts";

const TOAST_DURATION_MS = 4_000;

function readAuthorizedModules(): AuthorizedOperatorModule[] {
  if (typeof document === "undefined") return [];

  const links = Array.from(
    document.querySelectorAll<HTMLAnchorElement>(".cc-sidebar-nav a[href]"),
  );

  return normalizeAuthorizedOperatorModules(
    links.map((link) => {
      const url = new URL(link.href, window.location.origin);
      const label =
        link.querySelector<HTMLElement>(".cc-nav-label")?.textContent ??
        link.title ??
        "";
      const description =
        link.querySelector<HTMLElement>(".cc-nav-description")?.textContent ??
        link.getAttribute("aria-label")?.split(":").slice(1).join(":") ??
        "";

      return {
        href: `${url.pathname}${url.search}${url.hash}`,
        label,
        description,
      };
    }),
  );
}

function formatRefreshTime(value: Date | null) {
  if (!value) return null;

  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(value);
  } catch {
    return value.toLocaleTimeString();
  }
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.getAttribute("aria-hidden") !== "true");
}

export default function AdminCommandCenterGlobalOperatorLayer() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [visibility, setVisibility] =
    useState<DocumentVisibilityState>("visible");
  const [modules, setModules] = useState<AuthorizedOperatorModule[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [toast, setToast] = useState("");
  const [lastRefreshRequestedAt, setLastRefreshRequestedAt] =
    useState<Date | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const refreshTime = useMemo(
    () => formatRefreshTime(lastRefreshRequestedAt),
    [lastRefreshRequestedAt],
  );

  const announce = useCallback((message: string) => {
    setAnnouncement("");
    window.requestAnimationFrame(() => setAnnouncement(message));
    setToast(message);

    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(
      () => setToast(""),
      TOAST_DURATION_MS,
    );
  }, []);

  const syncModules = useCallback(() => {
    setModules(readAuthorizedModules());
  }, []);

  const closeHelp = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    });
  }, []);

  const openHelp = useCallback(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : triggerRef.current;
    syncModules();
    setOpen(true);
  }, [syncModules]);

  const openCommandPalette = useCallback(() => {
    const triggers = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        'button[aria-label="Search Command Center"]',
      ),
    );
    const trigger = triggers.find((candidate) => candidate.offsetParent !== null);

    if (!trigger) {
      announce("Command palette is unavailable on this view.");
      return;
    }

    setOpen(false);
    previousFocusRef.current = null;
    trigger.click();
  }, [announce]);

  const requestRefresh = useCallback(() => {
    const requestedAt = new Date();
    setLastRefreshRequestedAt(requestedAt);
    announce(
      "Server view refresh requested. Existing data remains visible while it revalidates.",
    );
    router.refresh();
  }, [announce, router]);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>("[data-admin-shell]");
    shell?.setAttribute("data-operator-layer", "ready");

    const searchButtons = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[aria-label="Search Command Center"]',
      ),
    );
    const refreshButtons = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[aria-label="Refresh current Command Center view"]',
      ),
    );

    searchButtons.forEach((button) =>
      button.setAttribute("aria-keyshortcuts", "Alt+/"),
    );
    refreshButtons.forEach((button) =>
      button.setAttribute("aria-keyshortcuts", "Alt+Shift+R"),
    );

    syncModules();
    const observer = new MutationObserver(syncModules);
    if (shell) observer.observe(shell, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      shell?.removeAttribute("data-operator-layer");
      searchButtons.forEach((button) =>
        button.removeAttribute("aria-keyshortcuts"),
      );
      refreshButtons.forEach((button) =>
        button.removeAttribute("aria-keyshortcuts"),
      );
    };
  }, [pathname, syncModules]);

  useEffect(() => {
    function syncEnvironment() {
      setOnline(window.navigator.onLine);
      setVisibility(document.visibilityState);
    }

    function handleOnline() {
      syncEnvironment();
      announce("Browser network connection restored.");
    }

    function handleOffline() {
      syncEnvironment();
      announce(
        "Browser network connection is offline. Server actions may be unavailable.",
      );
    }

    syncEnvironment();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", syncEnvironment);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", syncEnvironment);
    };
  }, [announce]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        closeHelp();
        return;
      }

      const intent = resolveOperatorShortcutIntent(
        event,
        isEditableOperatorTarget(event.target),
      );
      if (!intent) return;

      event.preventDefault();

      if (intent.type === "open-help") {
        openHelp();
        return;
      }
      if (intent.type === "open-command-palette") {
        openCommandPalette();
        return;
      }
      if (intent.type === "refresh-current-view") {
        requestRefresh();
        return;
      }

      const module = modules[intent.index];
      if (!module) {
        announce(
          `No authorized module is assigned to shortcut ${intent.index + 1}.`,
        );
        return;
      }

      announce(`Opening ${module.label}.`);
      router.push(module.href);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    announce,
    closeHelp,
    modules,
    open,
    openCommandPalette,
    openHelp,
    requestRefresh,
    router,
  ]);

  useEffect(() => {
    document.documentElement.classList.toggle("cc-operator-help-open", open);
    if (open) {
      window.requestAnimationFrame(() => closeRef.current?.focus());
    }
    return () =>
      document.documentElement.classList.remove("cc-operator-help-open");
  }, [open]);

  function handleDialogKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab" || !dialogRef.current) return;

    const focusable = getFocusableElements(dialogRef.current);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="cc-operator-layer"
      data-network={online ? "online" : "offline"}
    >
      <div
        className="cc-operator-live-region"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>

      {toast ? (
        <div className="cc-operator-toast" role="status">
          {toast}
        </div>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        className="cc-operator-trigger finance-focus"
        onClick={openHelp}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="cc-operator-help"
        aria-keyshortcuts="?"
      >
        <span className="cc-operator-trigger-dot" aria-hidden="true" />
        <span className="cc-operator-trigger-copy">
          <strong>Operator controls</strong>
          <small>
            {online ? "Browser online" : "Browser offline"} · Press ?
          </small>
        </span>
        <kbd>?</kbd>
      </button>

      {open ? (
        <div
          className="cc-operator-overlay"
          role="presentation"
          onMouseDown={closeHelp}
        >
          <section
            ref={dialogRef}
            id="cc-operator-help"
            className="cc-operator-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cc-operator-title"
            aria-describedby="cc-operator-description"
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={handleDialogKeyDown}
          >
            <header className="cc-operator-dialog-head">
              <div>
                <p className="cc-operator-kicker">Global operator layer</p>
                <h2 id="cc-operator-title">
                  Move through JALVORO with confidence
                </h2>
                <p id="cc-operator-description">
                  Keyboard controls use only modules already authorized and
                  rendered by the server.
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                className="cc-operator-close finance-focus"
                onClick={closeHelp}
                aria-label="Close operator controls"
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>

            <div
              className="cc-operator-environment"
              aria-label="Current browser context"
            >
              <span data-state={online ? "ready" : "warning"}>
                <i aria-hidden="true" />
                {online ? "Browser online" : "Browser offline"}
              </span>
              <span
                data-state={visibility === "visible" ? "ready" : "neutral"}
              >
                <i aria-hidden="true" />
                Tab {visibility}
              </span>
              <span data-state="neutral">
                <i aria-hidden="true" />
                {modules.length} authorized shortcuts
              </span>
            </div>

            <div className="cc-operator-grid">
              <section
                className="cc-operator-section"
                aria-labelledby="cc-operator-shortcuts-title"
              >
                <div className="cc-operator-section-head">
                  <p className="cc-operator-section-kicker">Control plane</p>
                  <h3 id="cc-operator-shortcuts-title">Global shortcuts</h3>
                </div>
                <div className="cc-operator-shortcut-list">
                  <button
                    type="button"
                    onClick={openCommandPalette}
                    className="finance-focus"
                  >
                    <span>
                      <strong>Open command palette</strong>
                      <small>Search current authorized operations</small>
                    </span>
                    <kbd>Alt + /</kbd>
                  </button>
                  <button
                    type="button"
                    onClick={requestRefresh}
                    className="finance-focus"
                  >
                    <span>
                      <strong>Request server refresh</strong>
                      <small>
                        Revalidate without clearing the current view
                      </small>
                    </span>
                    <kbd>Alt + Shift + R</kbd>
                  </button>
                  <button
                    type="button"
                    onClick={closeHelp}
                    className="finance-focus"
                  >
                    <span>
                      <strong>Close operator layer</strong>
                      <small>Return focus to the previous control</small>
                    </span>
                    <kbd>Esc</kbd>
                  </button>
                </div>
              </section>

              <section
                className="cc-operator-section"
                aria-labelledby="cc-operator-modules-title"
              >
                <div className="cc-operator-section-head">
                  <p className="cc-operator-section-kicker">
                    Authorized world
                  </p>
                  <h3 id="cc-operator-modules-title">Module shortcuts</h3>
                </div>
                <div className="cc-operator-module-list">
                  {modules.length > 0 ? (
                    modules.map((module, index) => (
                      <button
                        key={module.href}
                        type="button"
                        className="finance-focus"
                        onClick={() => {
                          closeHelp();
                          announce(`Opening ${module.label}.`);
                          router.push(module.href);
                        }}
                      >
                        <span
                          className="cc-operator-module-number"
                          aria-hidden="true"
                        >
                          {index + 1}
                        </span>
                        <span>
                          <strong>{module.label}</strong>
                          <small>{module.description}</small>
                        </span>
                        <kbd>Alt + {index + 1}</kbd>
                      </button>
                    ))
                  ) : (
                    <div className="cc-operator-empty">
                      No authorized module shortcuts are available on this view.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <footer className="cc-operator-dialog-foot">
              <span>
                Shortcuts never reveal or activate routes outside the current
                server-authorized navigation.
              </span>
              {refreshTime ? (
                <span>Last refresh requested at {refreshTime}</span>
              ) : null}
            </footer>
          </section>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
