"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmRequest = {
  message: string;
  source: HTMLElement | null;
};

type ConfirmAction = {
  label: string;
  destructive: boolean;
};

type ConfirmCopy = {
  primary: string;
  secondary?: string;
};

function getActionElement(event: MouseEvent): HTMLElement | null {
  const selector =
    'button, [role="button"], a, input[type="button"], input[type="submit"]';

  for (const node of event.composedPath()) {
    if (node instanceof HTMLElement && node.matches(selector)) return node;
  }

  return event.target instanceof HTMLElement
    ? event.target.closest<HTMLElement>(selector)
    : null;
}

function getConfirmAction(message: string): ConfirmAction {
  const destructive = /^(delete|remove)\b/i.test(message.trim());

  return {
    label: destructive ? "Delete" : "Confirm",
    destructive,
  };
}

function normalizeSupportingCopy(value: string) {
  const compact = value.trim().replace(/\s+/g, " ");
  if (!compact) return undefined;

  if (/^this cannot be undone\.?$/i.test(compact)) {
    return "This action cannot be undone.";
  }

  return /[.!?]$/.test(compact) ? compact : `${compact}.`;
}

function getConfirmCopy(message: string): ConfirmCopy {
  const compact = message.trim().replace(/\s+/g, " ");
  if (!compact) {
    return {
      primary: "This action will update your data.",
      secondary: "Please confirm that you want to continue.",
    };
  }

  const actionMatch = compact.match(/^(delete|remove|archive|restore)\b/i);
  if (!actionMatch) return { primary: compact };

  const action = actionMatch[1].toLowerCase();
  const questionMarkIndex = compact.indexOf("?");
  const firstPart = (
    questionMarkIndex >= 0 ? compact.slice(0, questionMarkIndex) : compact
  ).trim();
  const trailingPart =
    questionMarkIndex >= 0 ? compact.slice(questionMarkIndex + 1).trim() : "";
  const subject = firstPart
    .slice(actionMatch[0].length)
    .trim()
    .replace(/[.!?]+$/, "");

  const primary = subject
    ? `This will ${action} ${subject}.`
    : `This will ${action} the selected item.`;

  let secondary = normalizeSupportingCopy(trailingPart);

  if (!secondary && (action === "delete" || action === "remove")) {
    secondary = "This action cannot be undone.";
  } else if (!secondary && action === "archive") {
    secondary = "You can restore it later from archived accounts.";
  } else if (!secondary && action === "restore") {
    secondary = "The account will become active again.";
  }

  return { primary, secondary };
}

export default function GlobalConfirmDialog() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const lastActionElementRef = useRef<HTMLElement | null>(null);
  const bypassNextConfirmRef = useRef(false);

  useEffect(() => {
    const previousConfirm = window.confirm;

    const captureActionElement = (event: MouseEvent) => {
      lastActionElementRef.current = getActionElement(event);
    };

    const captureKeyboardAction = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      lastActionElementRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    };

    const customConfirm = (message?: string) => {
      if (bypassNextConfirmRef.current) {
        bypassNextConfirmRef.current = false;
        return true;
      }

      setRequest({
        message: String(message ?? ""),
        source: lastActionElementRef.current,
      });
      return false;
    };

    document.addEventListener("click", captureActionElement, true);
    document.addEventListener("keydown", captureKeyboardAction, true);
    window.confirm = customConfirm;

    return () => {
      document.removeEventListener("click", captureActionElement, true);
      document.removeEventListener("keydown", captureKeyboardAction, true);
      if (window.confirm === customConfirm) window.confirm = previousConfirm;
    };
  }, []);

  const action = useMemo(
    () => getConfirmAction(request?.message ?? ""),
    [request?.message],
  );
  const copy = useMemo(
    () => getConfirmCopy(request?.message ?? ""),
    [request?.message],
  );

  function closeDialog() {
    bypassNextConfirmRef.current = false;
    setRequest(null);
  }

  function confirmAction() {
    const source = request?.source;
    setRequest(null);

    if (!source?.isConnected) return;

    bypassNextConfirmRef.current = true;
    window.setTimeout(() => {
      if (source.isConnected) source.click();
      window.setTimeout(() => {
        bypassNextConfirmRef.current = false;
      }, 0);
    }, 0);
  }

  return (
    <Dialog
      open={Boolean(request)}
      onOpenChange={(open) => {
        if (!open) closeDialog();
      }}
    >
      <DialogContent
        showCloseButton={false}
        data-global-confirm-dialog
        className="w-[calc(100vw-1rem)] max-w-[28rem] gap-0 rounded-[18px] border border-black/10 bg-[#ffffff] p-0 text-[#171717] shadow-[0_24px_80px_rgb(0_0_0/0.22)] dark:border-white/10 dark:bg-[#222222] dark:text-[#f5f5f5] dark:shadow-[0_26px_90px_rgb(0_0_0/0.55)] sm:w-full"
      >
        <div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-4 sm:pt-[1.125rem]">
          <DialogTitle className="text-[17px] font-semibold leading-6 tracking-[-0.015em] text-[#171717] dark:text-[#f5f5f5]">
            Are you sure?
          </DialogTitle>

          <DialogDescription className="mt-4 text-left">
            <span className="block text-[15px] font-medium leading-6 text-[#303030] dark:text-[#f1f1f1]">
              {copy.primary}
            </span>
            {copy.secondary ? (
              <span className="mt-1 block text-[13px] font-normal leading-5 text-[#707070] dark:text-[#b9b9b9]">
                {copy.secondary}
              </span>
            ) : null}
          </DialogDescription>

          <div className="mt-4 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={closeDialog}
              className="finance-focus inline-flex h-11 min-w-[68px] items-center justify-center rounded-full border border-black/15 bg-transparent px-4 text-sm font-semibold text-[#242424] transition-[background-color,border-color,transform] duration-[var(--motion-duration-fast)] hover:bg-black/[0.045] active:scale-[0.98] dark:border-white/20 dark:text-[#f1f1f1] dark:hover:bg-white/[0.07] sm:h-9"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmAction}
              className={`finance-focus inline-flex h-11 min-w-[68px] items-center justify-center rounded-full px-4 text-sm font-bold text-white shadow-none transition-[background-color,filter,transform] duration-[var(--motion-duration-fast)] hover:brightness-[1.04] active:scale-[0.98] sm:h-9 ${
                action.destructive
                  ? "bg-[#ff1744] hover:bg-[#ed123d] dark:bg-[#ff1744] dark:hover:bg-[#ff3158]"
                  : "bg-active"
              }`}
            >
              {action.label}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
