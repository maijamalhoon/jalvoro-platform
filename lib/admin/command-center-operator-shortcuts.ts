export type OperatorShortcutIntent =
  | { type: "open-help" }
  | { type: "open-command-palette" }
  | { type: "refresh-current-view" }
  | { type: "navigate-authorized-module"; index: number };

export type OperatorShortcutInput = {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  repeat?: boolean;
  defaultPrevented?: boolean;
};

export type AuthorizedOperatorModule = {
  href: string;
  label: string;
  description: string;
};

type EditableTargetLike = {
  tagName?: unknown;
  isContentEditable?: unknown;
  getAttribute?: (name: string) => string | null;
};

export function isEditableOperatorTarget(target: unknown): boolean {
  if (!target || typeof target !== "object") return false;

  const candidate = target as EditableTargetLike;
  const tagName =
    typeof candidate.tagName === "string"
      ? candidate.tagName.toUpperCase()
      : "";

  if (["INPUT", "TEXTAREA", "SELECT"].includes(tagName)) return true;
  if (candidate.isContentEditable === true) return true;

  return candidate.getAttribute?.("role") === "textbox";
}

export function resolveOperatorShortcutIntent(
  input: OperatorShortcutInput,
  editableTarget: boolean,
): OperatorShortcutIntent | null {
  if (input.defaultPrevented || input.repeat || editableTarget) return null;

  const key = input.key.toLowerCase();
  const alt = input.altKey === true;
  const control = input.ctrlKey === true;
  const meta = input.metaKey === true;
  const shift = input.shiftKey === true;

  if (alt && !control && !meta && shift && key === "r") {
    return { type: "refresh-current-view" };
  }

  if (alt && !control && !meta && !shift && key === "/") {
    return { type: "open-command-palette" };
  }

  if (!alt && !control && !meta && (key === "?" || (shift && key === "/"))) {
    return { type: "open-help" };
  }

  if (alt && !control && !meta && !shift && /^[1-9]$/.test(key)) {
    return {
      type: "navigate-authorized-module",
      index: Number.parseInt(key, 10) - 1,
    };
  }

  return null;
}

export function normalizeAuthorizedOperatorModules(
  modules: readonly AuthorizedOperatorModule[],
  limit = 9,
): AuthorizedOperatorModule[] {
  const normalized: AuthorizedOperatorModule[] = [];
  const seen = new Set<string>();
  const safeLimit = Number.isFinite(limit)
    ? Math.max(0, Math.min(9, Math.trunc(limit)))
    : 9;

  if (safeLimit === 0) return [];

  for (const authorizedModule of modules) {
    const href = authorizedModule.href.trim();
    const label = authorizedModule.label.trim();
    const description = authorizedModule.description.trim();

    if (!/^\/admin(?:[/?#]|$)/.test(href)) continue;
    if (!label || seen.has(href)) continue;

    seen.add(href);
    normalized.push({
      href,
      label,
      description: description || "Authorized Command Center module",
    });

    if (normalized.length >= safeLimit) break;
  }

  return normalized;
}
