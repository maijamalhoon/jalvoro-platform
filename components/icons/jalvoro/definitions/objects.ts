import type { JalvoroIconDefinition } from "../types";

export const fileIconDefinition = {
  name: "file",
  label: "File",
  category: "objects",
  keywords: ["document", "page", "blank", "record"],
  aliases: ["document", "page"],
  objects: 1,
  body: [
    { kind: "path", d: "M6 4h8l4 4v12H6V4Z" },
    { kind: "path", d: "M14 4v4h4" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const folderIconDefinition = {
  name: "folder",
  label: "Folder",
  category: "objects",
  keywords: ["directory", "files", "collection", "storage"],
  aliases: ["directory", "file-folder"],
  objects: 1,
  body: [
    {
      kind: "path",
      d: "M4 7c0-1.1.9-2 2-2h4l2 2h6c1.1 0 2 .9 2 2v8.5c0 1.4-1.1 2.5-2.5 2.5h-11C5.1 20 4 18.9 4 17.5V7Z",
    },
    { kind: "line", x1: 4, y1: 10, x2: 20, y2: 10 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const bellIconDefinition = {
  name: "bell",
  label: "Bell",
  category: "objects",
  keywords: ["notification", "alert", "reminder", "chime"],
  aliases: ["notification-bell", "alert-bell"],
  objects: 1,
  body: [
    {
      kind: "path",
      d: "M6.5 10.5c0-3.3 2.2-5.8 5.5-5.8s5.5 2.5 5.5 5.8v4.2l1.7 2.3H4.8l1.7-2.3v-4.2Z",
    },
    { kind: "path", d: "M9.5 19c.6.8 1.4 1.2 2.5 1.2s1.9-.4 2.5-1.2" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const clockIconDefinition = {
  name: "clock",
  label: "Clock",
  category: "objects",
  keywords: ["time", "history", "duration", "schedule"],
  aliases: ["time", "timepiece"],
  objects: 1,
  body: [
    { kind: "circle", cx: 12, cy: 12, r: 8 },
    { kind: "path", d: "M12 7.5v4.8l3.5 2" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const calendarIconDefinition = {
  name: "calendar",
  label: "Calendar",
  category: "objects",
  keywords: ["date", "schedule", "month", "event"],
  aliases: ["date", "month-calendar"],
  objects: 1,
  body: [
    { kind: "rect", x: 4, y: 5.5, width: 16, height: 14.5, rx: 2 },
    { kind: "path", d: "M8 3.8v3.4M16 3.8v3.4" },
    { kind: "line", x1: 4, y1: 9, x2: 20, y2: 9 },
    { kind: "path", d: "M8 13h2M14 13h2M8 17h2M14 17h2" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const tagIconDefinition = {
  name: "tag",
  label: "Tag",
  category: "objects",
  keywords: ["label", "category", "classification", "marker"],
  aliases: ["label", "category-tag"],
  objects: 1,
  body: [
    { kind: "path", d: "M4 5h7.5l8.5 8.5-6.5 6.5L4 10.5V5Z" },
    { kind: "circle", cx: 8, cy: 9, r: 1.1 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const linkIconDefinition = {
  name: "link",
  label: "Link",
  category: "objects",
  keywords: ["url", "connection", "chain", "reference"],
  aliases: ["chain-link", "url-link"],
  objects: 2,
  body: [
    { kind: "path", d: "m9.5 14.5-1.7 1.7a4 4 0 0 1-5.7-5.7l2.6-2.6a4 4 0 0 1 5.7 0" },
    { kind: "path", d: "m14.5 9.5 1.7-1.7a4 4 0 1 1 5.7 5.7l-2.6 2.6a4 4 0 0 1-5.7 0" },
    { kind: "line", x1: 8.5, y1: 15.5, x2: 15.5, y2: 8.5 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const imageIconDefinition = {
  name: "image",
  label: "Image",
  category: "objects",
  keywords: ["picture", "media", "photo", "visual"],
  aliases: ["picture", "photo-image"],
  objects: 1,
  body: [
    { kind: "rect", x: 4, y: 4.5, width: 16, height: 15, rx: 2 },
    { kind: "circle", cx: 8.5, cy: 9, r: 1.5 },
    { kind: "path", d: "m5.5 17 4.2-4.3 3 3 2.2-2.2 3.6 3.5" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const cameraIconDefinition = {
  name: "camera",
  label: "Camera",
  category: "objects",
  keywords: ["photo", "capture", "lens", "photography"],
  aliases: ["photo-camera", "capture-device"],
  objects: 1,
  body: [
    {
      kind: "path",
      d: "M4.5 8h3l1.4-2h6.2l1.4 2h3C20.3 8 21 8.7 21 9.5v8c0 .8-.7 1.5-1.5 1.5h-15C3.7 19 3 18.3 3 17.5v-8C3 8.7 3.7 8 4.5 8Z",
    },
    { kind: "circle", cx: 12, cy: 13.5, r: 3.5 },
    { kind: "circle", cx: 18, cy: 10.5, r: 0.7, filled: true },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const lockIconDefinition = {
  name: "lock",
  label: "Lock",
  category: "objects",
  keywords: ["secure", "privacy", "closed", "protected"],
  aliases: ["padlock", "secure-lock"],
  objects: 1,
  body: [
    { kind: "rect", x: 5.5, y: 10, width: 13, height: 10, rx: 2 },
    { kind: "path", d: "M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" },
    { kind: "path", d: "M12 14v2.5" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const keyIconDefinition = {
  name: "key",
  label: "Key",
  category: "objects",
  keywords: ["access", "credential", "unlock", "permission"],
  aliases: ["access-key", "door-key"],
  objects: 1,
  body: [
    { kind: "circle", cx: 8, cy: 12, r: 3.8 },
    { kind: "path", d: "M11.8 12H20m-2.5 0v2.5M15 12v2" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const pencilIconDefinition = {
  name: "pencil",
  label: "Pencil",
  category: "objects",
  keywords: ["write", "draw", "stationery", "tool"],
  aliases: ["writing-pencil", "drawing-pencil"],
  objects: 1,
  body: [
    { kind: "path", d: "M4 9h12.5l3.5 3-3.5 3H4V9Z" },
    { kind: "line", x1: 7, y1: 9, x2: 7, y2: 15 },
    { kind: "path", d: "M16.5 9v6M20 12h-2" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const OBJECTS_ICON_DEFINITIONS = [
  fileIconDefinition,
  folderIconDefinition,
  bellIconDefinition,
  clockIconDefinition,
  calendarIconDefinition,
  tagIconDefinition,
  linkIconDefinition,
  imageIconDefinition,
  cameraIconDefinition,
  lockIconDefinition,
  keyIconDefinition,
  pencilIconDefinition,
] as const;
