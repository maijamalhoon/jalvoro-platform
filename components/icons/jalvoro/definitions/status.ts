import type { JalvoroIconDefinition } from "../types";

export const successIconDefinition = {
  name: "success",
  label: "Success",
  category: "status",
  keywords: ["ok", "complete", "confirmed", "resolved"],
  aliases: ["completed", "confirmed-state"],
  objects: 1,
  body: [
    { kind: "circle", cx: 12, cy: 12, r: 8 },
    { kind: "path", d: "m8 12.2 2.6 2.6 5.4-5.6" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const warningIconDefinition = {
  name: "warning",
  label: "Warning",
  category: "status",
  keywords: ["alert", "caution", "attention", "risk"],
  aliases: ["caution-state", "attention"],
  objects: 1,
  body: [
    { kind: "path", d: "M12 4 21 20H3L12 4Z" },
    { kind: "line", x1: 12, y1: 9, x2: 12, y2: 14 },
    { kind: "circle", cx: 12, cy: 17, r: 1, filled: true },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const infoIconDefinition = {
  name: "info",
  label: "Info",
  category: "status",
  keywords: ["information", "notice", "details", "context"],
  aliases: ["information-state", "notice"],
  objects: 1,
  body: [
    { kind: "rect", x: 4, y: 4, width: 16, height: 16, rx: 4 },
    { kind: "circle", cx: 12, cy: 8.2, r: 1, filled: true },
    { kind: "line", x1: 12, y1: 11.2, x2: 12, y2: 16.2 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const errorIconDefinition = {
  name: "error",
  label: "Error",
  category: "status",
  keywords: ["failure", "danger", "blocked", "invalid"],
  aliases: ["failed-state", "invalid-state"],
  objects: 1,
  body: [
    { kind: "path", d: "M9 4h6l5 5v6l-5 5H9l-5-5V9l5-5Z" },
    { kind: "path", d: "m9 9 6 6m0-6-6 6" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const pendingIconDefinition = {
  name: "pending",
  label: "Pending",
  category: "status",
  keywords: ["waiting", "progress", "queued", "processing"],
  aliases: ["waiting-state", "queued-state"],
  objects: 1,
  body: [
    { kind: "path", d: "M7 4h10M7 20h10" },
    {
      kind: "path",
      d: "M8 4c0 3.5 1.3 5.4 4 8-2.7 2.6-4 4.5-4 8M16 4c0 3.5-1.3 5.4-4 8 2.7 2.6 4 4.5 4 8",
    },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const sparkIconDefinition = {
  name: "spark",
  label: "Spark",
  category: "status",
  keywords: ["ai", "new", "enhanced", "special"],
  aliases: ["ai-state", "new-capability"],
  objects: 1,
  body: [
    {
      kind: "path",
      d: "M12 4l1.7 4.3L18 10l-4.3 1.7L12 16l-1.7-4.3L6 10l4.3-1.7L12 4Z",
    },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const STATUS_ICON_DEFINITIONS = [
  successIconDefinition,
  warningIconDefinition,
  infoIconDefinition,
  errorIconDefinition,
  pendingIconDefinition,
  sparkIconDefinition,
] as const;
