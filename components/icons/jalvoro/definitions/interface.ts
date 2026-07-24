import type { JalvoroIconDefinition } from "../types";

export const menuIconDefinition = {
  name: "menu",
  label: "Menu",
  category: "interface",
  keywords: ["navigation", "hamburger", "drawer", "options"],
  aliases: ["hamburger-menu", "navigation-menu"],
  objects: 1,
  body: [{ kind: "path", d: "M5 7h14M5 12h14M5 17h14" }],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const gridIconDefinition = {
  name: "grid",
  label: "Grid",
  category: "interface",
  keywords: ["tiles", "apps", "gallery", "layout"],
  aliases: ["tile-view", "grid-view"],
  objects: 1,
  body: [
    { kind: "rect", x: 4, y: 4, width: 6, height: 6, rx: 1.2 },
    { kind: "rect", x: 14, y: 4, width: 6, height: 6, rx: 1.2 },
    { kind: "rect", x: 4, y: 14, width: 6, height: 6, rx: 1.2 },
    { kind: "rect", x: 14, y: 14, width: 6, height: 6, rx: 1.2 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const listIconDefinition = {
  name: "list",
  label: "List",
  category: "interface",
  keywords: ["rows", "items", "table", "layout"],
  aliases: ["list-view", "row-view"],
  objects: 1,
  body: [
    { kind: "circle", cx: 5.5, cy: 7, r: 1, filled: true },
    { kind: "circle", cx: 5.5, cy: 12, r: 1, filled: true },
    { kind: "circle", cx: 5.5, cy: 17, r: 1, filled: true },
    { kind: "path", d: "M9 7h10M9 12h10M9 17h10" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const sidebarIconDefinition = {
  name: "sidebar",
  label: "Sidebar",
  category: "interface",
  keywords: ["layout", "panel", "navigation", "rail"],
  aliases: ["side-panel", "navigation-rail"],
  objects: 1,
  body: [
    { kind: "rect", x: 4, y: 4, width: 16, height: 16, rx: 2 },
    { kind: "line", x1: 9, y1: 4, x2: 9, y2: 20 },
    { kind: "path", d: "M6 8h1M6 12h1" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const eyeIconDefinition = {
  name: "eye",
  label: "Eye",
  category: "interface",
  keywords: ["view", "visibility", "show", "preview"],
  aliases: ["visible", "show-content"],
  objects: 1,
  body: [
    {
      kind: "path",
      d: "M3.8 12s3-5.2 8.2-5.2 8.2 5.2 8.2 5.2-3 5.2-8.2 5.2S3.8 12 3.8 12Z",
    },
    { kind: "circle", cx: 12, cy: 12, r: 2.4 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const eyeOffIconDefinition = {
  name: "eye-off",
  label: "Eye Off",
  category: "interface",
  keywords: ["hidden", "visibility", "conceal", "private"],
  aliases: ["hidden", "hide-content"],
  objects: 1,
  body: [
    {
      kind: "path",
      d: "M3.8 12s3-5.2 8.2-5.2c2.1 0 3.9.8 5.3 1.8M20.2 12s-3 5.2-8.2 5.2c-2.1 0-3.9-.8-5.3-1.8",
    },
    { kind: "path", d: "M5 5l14 14" },
    { kind: "path", d: "M9.8 9.8a3.1 3.1 0 0 0 4.4 4.4" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const chevronDownIconDefinition = {
  name: "chevron-down",
  label: "Chevron Down",
  category: "interface",
  keywords: ["expand", "down", "disclosure", "open"],
  aliases: ["expand-down", "disclosure-down"],
  objects: 1,
  body: [{ kind: "path", d: "m6.5 9 5.5 5.5L17.5 9" }],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const chevronRightIconDefinition = {
  name: "chevron-right",
  label: "Chevron Right",
  category: "interface",
  keywords: ["next", "right", "disclosure", "drill-in"],
  aliases: ["disclosure-right", "drill-in"],
  objects: 1,
  body: [{ kind: "path", d: "m9 6.5 5.5 5.5L9 17.5" }],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const arrowLeftIconDefinition = {
  name: "arrow-left",
  label: "Arrow Left",
  category: "interface",
  keywords: ["back", "previous", "direction", "return"],
  aliases: ["go-back", "previous-page"],
  objects: 1,
  body: [{ kind: "path", d: "M19 12H5m0 0 4-4m-4 4 4 4" }],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const arrowRightIconDefinition = {
  name: "arrow-right",
  label: "Arrow Right",
  category: "interface",
  keywords: ["forward", "next", "direction", "continue"],
  aliases: ["go-forward", "next-page"],
  objects: 1,
  body: [{ kind: "path", d: "M5 12h14m0 0-4-4m4 4-4 4" }],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const INTERFACE_ICON_DEFINITIONS = [
  menuIconDefinition,
  gridIconDefinition,
  listIconDefinition,
  sidebarIconDefinition,
  eyeIconDefinition,
  eyeOffIconDefinition,
  chevronDownIconDefinition,
  chevronRightIconDefinition,
  arrowLeftIconDefinition,
  arrowRightIconDefinition,
] as const;
