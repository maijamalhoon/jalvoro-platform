import type { JalvoroIconDefinition } from "../types";

export const dashboardIconDefinition = {
  name: "dashboard",
  label: "Dashboard",
  category: "navigation",
  keywords: ["overview", "workspace", "home", "control-center"],
  aliases: ["overview", "home"],
  objects: 1,
  body: [
    { kind: "rect", x: 4, y: 4, width: 7, height: 7, rx: 1.5 },
    { kind: "rect", x: 13, y: 4, width: 7, height: 4.5, rx: 1.5 },
    { kind: "rect", x: 4, y: 13, width: 7, height: 7, rx: 1.5 },
    { kind: "rect", x: 13, y: 10.5, width: 7, height: 9.5, rx: 1.5 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const transactionsIconDefinition = {
  name: "transactions",
  label: "Transactions",
  category: "navigation",
  keywords: ["movement", "transfer", "history", "exchange"],
  aliases: ["activity", "money-movement"],
  objects: 1,
  body: [
    { kind: "path", d: "M5 8h12m0 0-2.7-2.7M17 8l-2.7 2.7" },
    { kind: "path", d: "M19 16H7m0 0 2.7-2.7M7 16l2.7 2.7" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const accountsIconDefinition = {
  name: "accounts",
  label: "Accounts",
  category: "navigation",
  keywords: ["bank", "institution", "ledger", "account"],
  aliases: ["bank-accounts", "financial-accounts"],
  objects: 1,
  body: [
    { kind: "path", d: "M4 9 12 4l8 5" },
    { kind: "line", x1: 5, y1: 10.2, x2: 19, y2: 10.2 },
    { kind: "path", d: "M7 10.2v7M12 10.2v7M17 10.2v7" },
    { kind: "line", x1: 5, y1: 18.2, x2: 19, y2: 18.2 },
    { kind: "line", x1: 4, y1: 20, x2: 20, y2: 20 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const incomeIconDefinition = {
  name: "income",
  label: "Income",
  category: "navigation",
  keywords: ["money-in", "earnings", "deposit", "incoming"],
  aliases: ["revenue", "inflow"],
  objects: 2,
  body: [
    { kind: "path", d: "M5 13v4.5c0 .8.7 1.5 1.5 1.5h11c.8 0 1.5-.7 1.5-1.5V13" },
    { kind: "line", x1: 12, y1: 4, x2: 12, y2: 13 },
    { kind: "path", d: "M8.5 9.5 12 13l3.5-3.5" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const expensesIconDefinition = {
  name: "expenses",
  label: "Expenses",
  category: "navigation",
  keywords: ["money-out", "spending", "outgoing", "cost"],
  aliases: ["outflow", "payments"],
  objects: 2,
  body: [
    { kind: "path", d: "M5 13v4.5c0 .8.7 1.5 1.5 1.5h11c.8 0 1.5-.7 1.5-1.5V13" },
    { kind: "line", x1: 12, y1: 13, x2: 12, y2: 4 },
    { kind: "path", d: "M8.5 7.5 12 4l3.5 3.5" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const goalsIconDefinition = {
  name: "goals",
  label: "Goals",
  category: "navigation",
  keywords: ["target", "objective", "milestone", "progress"],
  aliases: ["targets", "objectives"],
  objects: 1,
  body: [
    { kind: "circle", cx: 12, cy: 12, r: 7.5 },
    { kind: "circle", cx: 12, cy: 12, r: 3.5 },
    { kind: "circle", cx: 12, cy: 12, r: 0.9, filled: true },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const payablesIconDefinition = {
  name: "payables",
  label: "Payables",
  category: "navigation",
  keywords: ["due", "liability", "bill", "deadline"],
  aliases: ["amounts-due", "bills-due"],
  objects: 2,
  body: [
    { kind: "path", d: "M5 3.8h9l4 4v12.4H5V3.8Z" },
    { kind: "path", d: "M14 3.8v4h4" },
    { kind: "circle", cx: 13.8, cy: 14.8, r: 3.2 },
    { kind: "path", d: "M13.8 13.1v1.9l1.4.8" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const investmentsIconDefinition = {
  name: "investments",
  label: "Investments",
  category: "navigation",
  keywords: ["portfolio", "growth", "assets", "returns"],
  aliases: ["portfolio", "wealth-growth"],
  objects: 2,
  body: [
    { kind: "rect", x: 4, y: 6.5, width: 16, height: 12.5, rx: 2 },
    { kind: "path", d: "M9 6.5V5.7c0-.7.6-1.2 1.2-1.2h3.6c.7 0 1.2.5 1.2 1.2v.8" },
    { kind: "path", d: "m7 15 3-3 2.3 1.8 4.7-5" },
    { kind: "path", d: "M14.5 8.8H17v2.5" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const analyticsIconDefinition = {
  name: "analytics",
  label: "Analytics",
  category: "navigation",
  keywords: ["chart", "data", "metrics", "performance"],
  aliases: ["data-analysis", "metrics"],
  objects: 1,
  body: [
    { kind: "line", x1: 4.5, y1: 19.5, x2: 19.5, y2: 19.5 },
    { kind: "rect", x: 5.5, y: 12.5, width: 3, height: 7, rx: 0.8 },
    { kind: "rect", x: 10.5, y: 9, width: 3, height: 10.5, rx: 0.8 },
    { kind: "rect", x: 15.5, y: 5.5, width: 3, height: 14, rx: 0.8 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const aiInsightsIconDefinition = {
  name: "ai-insights",
  label: "AI Insights",
  category: "navigation",
  keywords: ["ai", "intelligence", "neural", "insight"],
  aliases: ["machine-intelligence", "smart-insights"],
  objects: 1,
  body: [
    { kind: "path", d: "M8.2 8.2 10.6 10.6M15.8 8.2l-2.4 2.4M12 14v2.4" },
    { kind: "circle", cx: 12, cy: 12, r: 2 },
    { kind: "circle", cx: 7, cy: 7, r: 1.7 },
    { kind: "circle", cx: 17, cy: 7, r: 1.7 },
    { kind: "circle", cx: 12, cy: 18, r: 1.7 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const reportsIconDefinition = {
  name: "reports",
  label: "Reports",
  category: "navigation",
  keywords: ["document", "statement", "summary", "reporting"],
  aliases: ["statements", "documents"],
  objects: 1,
  body: [
    { kind: "path", d: "M5.5 3.8h8.7l4.3 4.3v12.1h-13V3.8Z" },
    { kind: "path", d: "M14.2 3.8v4.3h4.3" },
    { kind: "line", x1: 8.5, y1: 11, x2: 15.5, y2: 11 },
    { kind: "line", x1: 8.5, y1: 14, x2: 12.5, y2: 14 },
    { kind: "path", d: "M8.5 17.5h2v-2h2v2h2v-4h2" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const settingsIconDefinition = {
  name: "settings",
  label: "Settings",
  category: "navigation",
  keywords: ["preferences", "controls", "configuration", "tuning"],
  aliases: ["preferences", "configuration"],
  objects: 1,
  body: [
    { kind: "path", d: "M4 7h5M13 7h7" },
    { kind: "circle", cx: 11, cy: 7, r: 2 },
    { kind: "path", d: "M4 12h9M17 12h3" },
    { kind: "circle", cx: 15, cy: 12, r: 2 },
    { kind: "path", d: "M4 17h3M11 17h9" },
    { kind: "circle", cx: 9, cy: 17, r: 2 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const NAVIGATION_ICON_DEFINITIONS = [
  dashboardIconDefinition,
  transactionsIconDefinition,
  accountsIconDefinition,
  incomeIconDefinition,
  expensesIconDefinition,
  goalsIconDefinition,
  payablesIconDefinition,
  investmentsIconDefinition,
  analyticsIconDefinition,
  aiInsightsIconDefinition,
  reportsIconDefinition,
  settingsIconDefinition,
] as const;
