import { describe, expect, it } from "vitest";

import {
  isEditableOperatorTarget,
  normalizeAuthorizedOperatorModules,
  resolveOperatorShortcutIntent,
} from "./command-center-operator-shortcuts";

describe("Command Center operator shortcuts", () => {
  it("keeps global shortcuts out of editable controls", () => {
    expect(isEditableOperatorTarget({ tagName: "input" })).toBe(true);
    expect(isEditableOperatorTarget({ tagName: "TEXTAREA" })).toBe(true);
    expect(isEditableOperatorTarget({ tagName: "select" })).toBe(true);
    expect(isEditableOperatorTarget({ isContentEditable: true })).toBe(true);
    expect(
      isEditableOperatorTarget({
        tagName: "DIV",
        getAttribute: (name: string) => (name === "role" ? "textbox" : null),
      }),
    ).toBe(true);
    expect(isEditableOperatorTarget({ tagName: "BUTTON" })).toBe(false);
  });

  it("resolves only the documented operator intents", () => {
    expect(resolveOperatorShortcutIntent({ key: "?" }, false)).toEqual({
      type: "open-help",
    });
    expect(
      resolveOperatorShortcutIntent({ key: "/", shiftKey: true }, false),
    ).toEqual({ type: "open-help" });
    expect(
      resolveOperatorShortcutIntent({ key: "/", altKey: true }, false),
    ).toEqual({ type: "open-command-palette" });
    expect(
      resolveOperatorShortcutIntent(
        { key: "R", altKey: true, shiftKey: true },
        false,
      ),
    ).toEqual({ type: "refresh-current-view" });
    expect(
      resolveOperatorShortcutIntent({ key: "4", altKey: true }, false),
    ).toEqual({ type: "navigate-authorized-module", index: 3 });
  });

  it("ignores repeats, handled events, editable targets and unknown combinations", () => {
    expect(
      resolveOperatorShortcutIntent({ key: "?", repeat: true }, false),
    ).toBeNull();
    expect(
      resolveOperatorShortcutIntent(
        { key: "?", defaultPrevented: true },
        false,
      ),
    ).toBeNull();
    expect(resolveOperatorShortcutIntent({ key: "?" }, true)).toBeNull();
    expect(
      resolveOperatorShortcutIntent({ key: "k", ctrlKey: true }, false),
    ).toBeNull();
    expect(
      resolveOperatorShortcutIntent(
        { key: "1", altKey: true, shiftKey: true },
        false,
      ),
    ).toBeNull();
  });

  it("accepts only rendered admin routes, removes duplicates and caps shortcuts", () => {
    const modules = normalizeAuthorizedOperatorModules(
      [
        { href: "/admin", label: " Command Center ", description: " Overview " },
        { href: "/admin/global-operations", label: "Global", description: "" },
        {
          href: "/admin/global-operations",
          label: "Duplicate",
          description: "Duplicate",
        },
        {
          href: "https://example.com/admin",
          label: "External",
          description: "Unsafe",
        },
        { href: "/dashboard", label: "Workspace", description: "Outside admin" },
        {
          href: "/admin/icon-system?mode=review",
          label: "Icons",
          description: "Review",
        },
      ],
      2,
    );

    expect(normalizeAuthorizedOperatorModules(modules, 0)).toEqual([]);
    expect(modules).toEqual([
      { href: "/admin", label: "Command Center", description: "Overview" },
      {
        href: "/admin/global-operations",
        label: "Global",
        description: "Authorized Command Center module",
      },
    ]);
  });
});
