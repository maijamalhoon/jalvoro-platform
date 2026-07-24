import type { JalvoroIconDefinition } from "../types";

export const addIconDefinition = {
  name: "add",
  label: "Add",
  category: "actions",
  keywords: ["plus", "new", "create", "insert"],
  aliases: ["new", "create"],
  objects: 1,
  body: [{ kind: "path", d: "M12 5v14M5 12h14" }],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const editIconDefinition = {
  name: "edit",
  label: "Edit",
  category: "actions",
  keywords: ["pencil", "modify", "write", "change"],
  aliases: ["modify", "update"],
  objects: 1,
  body: [
    {
      kind: "path",
      d: "M5 19l1.2-4.2 9.6-9.6c.6-.6 1.5-.6 2.1 0l.9.9c.6.6.6 1.5 0 2.1l-9.6 9.6L5 19Z",
    },
    { kind: "path", d: "m14.7 6.3 3 3" },
    { kind: "path", d: "m6.2 14.8 3 3" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const deleteIconDefinition = {
  name: "delete",
  label: "Delete",
  category: "actions",
  keywords: ["trash", "remove", "bin", "discard"],
  aliases: ["trash", "remove"],
  objects: 1,
  body: [
    { kind: "line", x1: 5, y1: 7, x2: 19, y2: 7 },
    { kind: "path", d: "M9 7V5.5C9 4.7 9.7 4 10.5 4h3c.8 0 1.5.7 1.5 1.5V7" },
    { kind: "path", d: "m7 7 .8 11.5c.1.9.8 1.5 1.7 1.5h5c.9 0 1.6-.7 1.7-1.5L17 7" },
    { kind: "line", x1: 10.2, y1: 10.5, x2: 10.5, y2: 16.5 },
    { kind: "line", x1: 13.8, y1: 10.5, x2: 13.5, y2: 16.5 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const copyIconDefinition = {
  name: "copy",
  label: "Copy",
  category: "actions",
  keywords: ["duplicate", "clone", "documents", "repeat"],
  aliases: ["duplicate", "clone"],
  objects: 2,
  body: [
    { kind: "rect", x: 7, y: 7, width: 12, height: 13, rx: 2 },
    { kind: "path", d: "M15 7V5.5c0-.8-.7-1.5-1.5-1.5h-8C4.7 4 4 4.7 4 5.5v9c0 .8.7 1.5 1.5 1.5H7" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const searchIconDefinition = {
  name: "search",
  label: "Search",
  category: "actions",
  keywords: ["find", "lookup", "magnifier", "discover"],
  aliases: ["find", "lookup"],
  objects: 1,
  body: [
    { kind: "circle", cx: 10.5, cy: 10.5, r: 6.2 },
    { kind: "line", x1: 15, y1: 15, x2: 19.5, y2: 19.5 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const filterIconDefinition = {
  name: "filter",
  label: "Filter",
  category: "actions",
  keywords: ["funnel", "refine", "narrow", "criteria"],
  aliases: ["refine", "funnel"],
  objects: 1,
  body: [{ kind: "path", d: "M4.5 5h15l-5.8 6.7v5.2L10.3 19v-7.3L4.5 5Z" }],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const sortIconDefinition = {
  name: "sort",
  label: "Sort",
  category: "actions",
  keywords: ["order", "arrange", "sequence", "rank"],
  aliases: ["order", "arrange"],
  objects: 1,
  body: [
    { kind: "line", x1: 5, y1: 7, x2: 13, y2: 7 },
    { kind: "line", x1: 5, y1: 12, x2: 10, y2: 12 },
    { kind: "line", x1: 5, y1: 17, x2: 7, y2: 17 },
    { kind: "path", d: "M17 5v14m0 0-2.5-2.5M17 19l2.5-2.5" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const shareIconDefinition = {
  name: "share",
  label: "Share",
  category: "actions",
  keywords: ["send", "network", "distribute", "forward"],
  aliases: ["distribute", "forward"],
  objects: 1,
  body: [
    { kind: "circle", cx: 6, cy: 12, r: 2 },
    { kind: "circle", cx: 18, cy: 6, r: 2 },
    { kind: "circle", cx: 18, cy: 18, r: 2 },
    { kind: "line", x1: 7.8, y1: 11.1, x2: 16.2, y2: 6.9 },
    { kind: "line", x1: 7.8, y1: 12.9, x2: 16.2, y2: 17.1 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const exportIconDefinition = {
  name: "export",
  label: "Export",
  category: "actions",
  keywords: ["out", "send", "external", "extract"],
  aliases: ["send-out", "extract"],
  objects: 2,
  body: [
    { kind: "path", d: "M5 10v7.5c0 .8.7 1.5 1.5 1.5h11c.8 0 1.5-.7 1.5-1.5V14" },
    { kind: "path", d: "m11 13 8-8m0 0h-5m5 0v5" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const importIconDefinition = {
  name: "import",
  label: "Import",
  category: "actions",
  keywords: ["in", "receive", "external", "ingest"],
  aliases: ["bring-in", "ingest"],
  objects: 2,
  body: [
    { kind: "path", d: "M19 10v7.5c0 .8-.7 1.5-1.5 1.5h-11c-.8 0-1.5-.7-1.5-1.5V14" },
    { kind: "path", d: "m13 13-8-8m0 0h5M5 5v5" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const downloadIconDefinition = {
  name: "download",
  label: "Download",
  category: "actions",
  keywords: ["save", "arrow-down", "receive", "local"],
  aliases: ["save-local", "receive-file"],
  objects: 1,
  body: [
    { kind: "path", d: "M12 4v11m0 0-3.5-3.5M12 15l3.5-3.5" },
    { kind: "path", d: "M5 19h14" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const uploadIconDefinition = {
  name: "upload",
  label: "Upload",
  category: "actions",
  keywords: ["send", "arrow-up", "publish", "remote"],
  aliases: ["send-file", "publish-file"],
  objects: 1,
  body: [
    { kind: "path", d: "M12 16V5m0 0L8.5 8.5M12 5l3.5 3.5" },
    { kind: "path", d: "M5 19h14" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const refreshIconDefinition = {
  name: "refresh",
  label: "Refresh",
  category: "actions",
  keywords: ["reload", "sync", "renew", "update"],
  aliases: ["reload", "sync"],
  objects: 1,
  body: [
    { kind: "path", d: "M19 8V4m0 4h-4M19 8A8 8 0 0 0 5.3 5.7" },
    { kind: "path", d: "M5 16v4m0-4h4M5 16a8 8 0 0 0 13.7 2.3" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const checkIconDefinition = {
  name: "check",
  label: "Check",
  category: "actions",
  keywords: ["done", "confirm", "accept", "complete"],
  aliases: ["confirm", "accept"],
  objects: 1,
  body: [{ kind: "path", d: "m5 12.5 4.2 4.2L19 7" }],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const closeIconDefinition = {
  name: "close",
  label: "Close",
  category: "actions",
  keywords: ["x", "cancel", "dismiss", "exit"],
  aliases: ["dismiss", "cancel"],
  objects: 1,
  body: [{ kind: "path", d: "M6 6l12 12M18 6 6 18" }],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const moreIconDefinition = {
  name: "more",
  label: "More",
  category: "actions",
  keywords: ["ellipsis", "options", "overflow", "menu"],
  aliases: ["overflow", "more-options"],
  objects: 1,
  body: [
    { kind: "circle", cx: 6.5, cy: 12, r: 1, filled: true },
    { kind: "circle", cx: 12, cy: 12, r: 1, filled: true },
    { kind: "circle", cx: 17.5, cy: 12, r: 1, filled: true },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const undoIconDefinition = {
  name: "undo",
  label: "Undo",
  category: "actions",
  keywords: ["back", "revert", "history", "reverse"],
  aliases: ["revert", "step-back"],
  objects: 1,
  body: [
    {
      kind: "path",
      d: "M9 8H5V4m0 4c1.9-2.1 4.4-3.2 7.2-3.2 4.3 0 7.8 3.5 7.8 7.8s-3.5 7.8-7.8 7.8c-2.4 0-4.6-1-6.1-2.6",
    },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const redoIconDefinition = {
  name: "redo",
  label: "Redo",
  category: "actions",
  keywords: ["forward", "repeat", "history", "restore"],
  aliases: ["repeat", "step-forward"],
  objects: 1,
  body: [
    {
      kind: "path",
      d: "M15 8h4V4m0 4c-1.9-2.1-4.4-3.2-7.2-3.2C7.5 4.8 4 8.3 4 12.6s3.5 7.8 7.8 7.8c2.4 0 4.6-1 6.1-2.6",
    },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const ACTIONS_ICON_DEFINITIONS = [
  addIconDefinition,
  editIconDefinition,
  deleteIconDefinition,
  copyIconDefinition,
  searchIconDefinition,
  filterIconDefinition,
  sortIconDefinition,
  shareIconDefinition,
  exportIconDefinition,
  importIconDefinition,
  downloadIconDefinition,
  uploadIconDefinition,
  refreshIconDefinition,
  checkIconDefinition,
  closeIconDefinition,
  moreIconDefinition,
  undoIconDefinition,
  redoIconDefinition,
] as const;
