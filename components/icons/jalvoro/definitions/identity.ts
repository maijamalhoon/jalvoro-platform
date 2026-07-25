import type { JalvoroIconDefinition } from "../types";

export const userIconDefinition = {
  name: "user",
  label: "User",
  category: "identity",
  keywords: ["person", "profile", "account", "individual"],
  aliases: ["person", "profile"],
  objects: 1,
  body: [
    { kind: "circle", cx: 12, cy: 8, r: 3.1 },
    { kind: "path", d: "M5 20c.4-4.1 3-6.5 7-6.5s6.6 2.4 7 6.5" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const usersIconDefinition = {
  name: "users",
  label: "Users",
  category: "identity",
  keywords: ["people", "team", "group", "members"],
  aliases: ["people", "team-members"],
  objects: 2,
  body: [
    { kind: "circle", cx: 9, cy: 8.2, r: 2.9 },
    { kind: "path", d: "M3.8 19.2c.4-3.8 2.4-6 5.2-6s4.8 2.2 5.2 6" },
    { kind: "circle", cx: 16.3, cy: 9, r: 2.4 },
    { kind: "path", d: "M14.4 14.1c3.1-.4 5.4 1.6 5.8 5.1" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const userPlusIconDefinition = {
  name: "user-plus",
  label: "User Plus",
  category: "identity",
  keywords: ["invite", "add-person", "member", "onboard"],
  aliases: ["invite-user", "add-member"],
  objects: 2,
  body: [
    { kind: "circle", cx: 8.5, cy: 8.2, r: 2.9 },
    { kind: "path", d: "M3.3 19.2c.4-3.8 2.4-6 5.2-6s4.8 2.2 5.2 6" },
    { kind: "path", d: "M17 8v6M14 11h6" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const IDENTITY_ICON_DEFINITIONS = [
  userIconDefinition,
  usersIconDefinition,
  userPlusIconDefinition,
] as const;
