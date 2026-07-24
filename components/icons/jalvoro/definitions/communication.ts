import type { JalvoroIconDefinition } from "../types";

export const mailIconDefinition = {
  name: "mail",
  label: "Mail",
  category: "communication",
  keywords: ["email", "message", "inbox", "envelope"],
  aliases: ["email", "envelope"],
  objects: 1,
  body: [
    { kind: "rect", x: 4, y: 5.5, width: 16, height: 13, rx: 2 },
    { kind: "path", d: "m5.2 7 6.8 5.3L18.8 7" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const chatIconDefinition = {
  name: "chat",
  label: "Chat",
  category: "communication",
  keywords: ["message", "conversation", "reply", "discussion"],
  aliases: ["conversation", "message-bubble"],
  objects: 1,
  body: [
    { kind: "path", d: "M4 5.5h16v11H9.2L4 20V5.5Z" },
    { kind: "path", d: "M8 10h8M8 13.5h5" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const phoneIconDefinition = {
  name: "phone",
  label: "Phone",
  category: "communication",
  keywords: ["call", "contact", "voice", "telephone"],
  aliases: ["call", "telephone"],
  objects: 1,
  body: [
    {
      kind: "path",
      d: "M7.2 4.3 9.4 8l-1.8 2c1.1 2.5 2.9 4.3 5.4 5.4l2-1.8 3.7 2.2c.7.4.9 1.2.6 1.9l-.6 1.4c-.3.8-1.1 1.2-1.9 1.1C10 19.4 4.6 14 3.8 7.2c-.1-.8.3-1.6 1.1-1.9l1.4-.6c.7-.3 1.5-.1 1.9.6Z",
    },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const sendIconDefinition = {
  name: "send",
  label: "Send",
  category: "communication",
  keywords: ["paper-plane", "deliver", "submit", "message"],
  aliases: ["deliver-message", "paper-plane"],
  objects: 1,
  body: [
    { kind: "path", d: "M4 5.2 20 12 4 18.8l2.7-5.1L15 12l-8.3-1.7L4 5.2Z" },
    { kind: "line", x1: 6.7, y1: 13.7, x2: 6.7, y2: 18.2 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const globeIconDefinition = {
  name: "globe",
  label: "Globe",
  category: "communication",
  keywords: ["world", "language", "global", "international"],
  aliases: ["world", "global-language"],
  objects: 1,
  body: [
    { kind: "circle", cx: 12, cy: 12, r: 8 },
    {
      kind: "path",
      d: "M4 12h16M12 4c2.2 2.1 3.3 4.8 3.3 8S14.2 17.9 12 20M12 4C9.8 6.1 8.7 8.8 8.7 12s1.1 5.9 3.3 8",
    },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const COMMUNICATION_ICON_DEFINITIONS = [
  mailIconDefinition,
  chatIconDefinition,
  phoneIconDefinition,
  sendIconDefinition,
  globeIconDefinition,
] as const;
