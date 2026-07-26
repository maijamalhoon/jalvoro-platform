"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(
    (element) =>
      element.getAttribute("aria-hidden") !== "true" &&
      element.offsetParent !== null,
  );
}

function findVisibleButton(ariaLabel: string) {
  const candidates = Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      `button[aria-label="${ariaLabel}"]`,
    ),
  );
  return candidates.find((candidate) => candidate.offsetParent !== null) ?? null;
}

export default function AdminCommandCenterOperatorAssist() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [modules, setModules] = useState<AuthorizedOperatorModule[]>([]);
  const [online, setOnline] = useState(true);
  const [visibility, setVisibility] =
    useState<DocumentVisibilityState>("visible");
  const [announcement, setAnnouncement] = useState("");
  const [toast, setToast] = useState("");
  const helpTriggerRef = useRef<HTMLButtonElement>(null);
  const helpDialogRef = useRef<HTMLElement>(null);
  const helpCloseRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const externalDialogTriggerRef = useRef<HTMLElement | null>(null);
  const externalDialogOpenRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);

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
    setHelpOpen(false);
    window.requestAnimationFrame(() => {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    });
  }, []);

  const openHelp = useCallback(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : helpTriggerRef.current;
    syncModules();
    setHelpOpen(true);
  }, [syncModules]);

  const openCommandPalette = useCallback(() => {
    const trigger = findVisibleButton("Search Command Center");
    if (!trigger) {
      announce("Command palette is unavailable on this view.");
      return;
    }

    setHelpOpen(false);
    previousFocusRef.current = null;
    externalDialogTriggerRef.current = trigger;
    trigger.click();
  }, [announce]);

  const requestRefresh = useCallback(() => {
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
      button.setAttribute("aria-keyshortcuts", "Control+K Meta+K Alt+/"),
    );
    refreshButtons.forEach((button) =>
      button.setAttribute("aria-keyshortcuts", "Alt+Shift+R"),
    );

    syncModules();
    const observer = new MutationObserver(syncModules);
    if (shell) observer.observe(shell, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
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
    function rememberDialogTrigger(event: Event) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const trigger = target.closest<HTMLElement>(
        'button[aria-label="Search Command Center"], button[aria-label="Open all Command Center modules"]',
      );
      if (trigger) externalDialogTriggerRef.current = trigger;
    }

    function syncExternalDialog() {
      const dialog = document.querySelector<HTMLElement>(
        ".cc-command-palette[role=dialog], .cc-mobile-sheet[role=dialog]",
      );
      const open = dialog !== null;

      if (open && !externalDialogOpenRef.current && dialog) {
        if (!externalDialogTriggerRef.current) {
          const activeElement =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
          const fallbackLabel = dialog.classList.contains("cc-mobile-sheet")
            ? "Open all Command Center modules"
            : "Search Command Center";

          externalDialogTriggerRef.current =
            activeElement &&
            activeElement !== document.body &&
            !dialog.contains(activeElement)
              ? activeElement
              : findVisibleButton(fallbackLabel);
        }

        if (dialog.classList.contains("cc-mobile-sheet")) {
          window.requestAnimationFrame(() => {
            dialog
              .querySelector<HTMLButtonElement>(
                'button[aria-label="Close module menu"]',
              )
              ?.focus();
          });
        }
      } else if (!open && externalDialogOpenRef.current) {
        window.requestAnimationFrame(() => {
          externalDialogTriggerRef.current?.focus();
          externalDialogTriggerRef.current = null;
        });
      }

      externalDialogOpenRef.current = open;
    }

    document.addEventListener("pointerdown", rememberDialogTrigger, true);
    document.addEventListener("keydown", rememberDialogTrigger, true);
    const observer = new MutationObserver(syncExternalDialog);
    observer.observe(document.body, { childList: true, subtree: true });
    syncExternalDialog();

    return () => {
      document.removeEventListener("pointerdown", rememberDialogTrigger, true);
      document.removeEventListener("keydown", rememberDialogTrigger, true);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && helpOpen) {
        event.preventDefault();
        closeHelp();
        return;
      }

      if (event.key === "Tab") {
        const activeDialog =
          helpDialogRef.current ??
          document.querySelector<HTMLElement>(
            ".cc-command-palette[role=dialog], .cc-mobile-sheet[role=dialog]",
          );
        if (activeDialog) {
          const focusable = getFocusableElements(activeDialog);
          if (focusable.length === 0) {
            event.preventDefault();
            activeDialog.focus();
            return;
          }

          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          const activeElement = document.activeElement;
          if (event.shiftKey && activeElement === first) {
            event.preventDefault();
            last.focus();
            return;
          }
          if (!event.shiftKey && activeElement === last) {
            event.preventDefault();
            first.focus();
            return;
          }
        }
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

      const authorizedModule = modules[intent.index];
      if (!authorizedModule) {
        announce(
          `No authorized module is assigned to shortcut ${intent.index + 1}.`,
        );
        return;
      }

      announce(`Opening ${authorizedModule.label}.`);
      router.push(authorizedModule.href);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    announce,
    closeHelp,
    helpOpen,
    modules,
    openCommandPalette,
    openHelp,
    requestRefresh,
    router,
  ]);

  useEffect(() => {
    document.documentElement.classList.toggle("cc-operator-help-open", helpOpen);
    if (helpOpen) {
      window.requestAnimationFrame(() => helpCloseRef.current?.focus());
    }
    return () =>
      document.documentElement.classList.remove("cc-operator-help-open");
  }, [helpOpen]);

  if (!mounted) return null;

  return createPortal(
    <div className="cc-operator-assist" data-network={online ? "online" : "offline"}>
      <div className="cc-operator-live-region" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {toast ? (
        <div className="cc-operator-toast" role="status">
          {toast}
        </div>
      ) : null}

      <button
        ref={helpTriggerRef}
        type="button"
        className="cc-operator-help-trigger finance-focus"
        onClick={openHelp}
        aria-label="Open Command Center keyboard help"
        aria-haspopup="dialog"
        aria-expanded={helpOpen}
        aria-controls="cc-operator-help"
        aria-keyshortcuts="?"
        title="Keyboard help (?)"
      >
        <span aria-hidden="true">?</span>
      </button>

      {helpOpen ? (
        <div
          className="cc-operator-overlay"
          role="presentation"
          onMouseDown={closeHelp}
        >
          <section
            ref={helpDialogRef}
            id="cc-operator-help"
            className="cc-operator-dialog"
            role="dialog"
            tabIndex={-1}
            aria-modal="true"
            aria-labelledby="cc-operator-title"
            aria-describedby="cc-operator-description"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="cc-operator-dialog-head">
              <div>
                <p>Operator assistance</p>
                <h2 id="cc-operator-title">Keyboard controls</h2>
                <span id="cc-operator-description">
                  Shortcuts use only modules already authorized and rendered by the server.
                </span>
              </div>
              <button
                ref={helpCloseRef}
                type="button"
                className="cc-operator-close finance-focus"
                onClick={closeHelp}
                aria-label="Close keyboard help"
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>

            <div className="cc-operator-context" aria-label="Current browser context">
              <span data-state={online ? "ready" : "warning"}>
                <i aria-hidden="true" />
                Browser {online ? "online" : "offline"}
              </span>
              <span data-state={visibility === "visible" ? "ready" : "neutral"}>
                <i aria-hidden="true" />
                Tab {visibility}
              </span>
              <span data-state="neutral">
                <i aria-hidden="true" />
                {modules.length} authorized module shortcuts
              </span>
            </div>

            <div className="cc-operator-grid">
              <section aria-labelledby="cc-global-shortcuts">
                <h3 id="cc-global-shortcuts">Global shortcuts</h3>
                <div className="cc-operator-list">
                  <button type="button" onClick={openCommandPalette} className="finance-focus">
                    <span>
                      <strong>Open command palette</strong>
                      <small>Search authorized operations</small>
                    </span>
                    <kbd>Alt + /</kbd>
                  </button>
                  <button type="button" onClick={requestRefresh} className="finance-focus">
                    <span>
                      <strong>Request server refresh</strong>
                      <small>Revalidate without clearing the current view</small>
                    </span>
                    <kbd>Alt + Shift + R</kbd>
                  </button>
                  <button type="button" onClick={closeHelp} className="finance-focus">
                    <span>
                      <strong>Close active dialog</strong>
                      <small>Return focus to the previous control</small>
                    </span>
                    <kbd>Esc</kbd>
                  </button>
                </div>
              </section>

              <section aria-labelledby="cc-module-shortcuts">
                <h3 id="cc-module-shortcuts">Authorized modules</h3>
                <div className="cc-operator-list cc-operator-module-list">
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
              Shortcuts never discover or activate routes outside the current server-authorized navigation.
            </footer>
          </section>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
