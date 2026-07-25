import type { JalvoroIconDefinition } from "../types";

export const walletIconDefinition = {
  name: "wallet",
  label: "Wallet",
  category: "finance",
  keywords: ["money", "balance", "purse", "funds"],
  aliases: ["balance-wallet", "money-wallet"],
  objects: 1,
  body: [
    { kind: "path", d: "M5.5 6h11c1.4 0 2.5 1.1 2.5 2.5V18c0 1.1-.9 2-2 2H5.5C4.1 20 3 18.9 3 17.5v-9C3 7.1 4.1 6 5.5 6Z" },
    { kind: "path", d: "M3 9h12.5c1.9 0 3.5 1.6 3.5 3.5V15h-4.5a2.5 2.5 0 0 1 0-5H19" },
    { kind: "circle", cx: 15, cy: 12.5, r: 0.7, filled: true },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const bankIconDefinition = {
  name: "bank",
  label: "Bank",
  category: "finance",
  keywords: ["institution", "account", "branch", "banking"],
  aliases: ["financial-institution", "bank-branch"],
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

export const cardIconDefinition = {
  name: "card",
  label: "Card",
  category: "finance",
  keywords: ["credit", "debit", "payment", "bank-card"],
  aliases: ["payment-card", "credit-card"],
  objects: 1,
  body: [
    { kind: "rect", x: 3.5, y: 5.5, width: 17, height: 13, rx: 2 },
    { kind: "line", x1: 3.5, y1: 9.5, x2: 20.5, y2: 9.5 },
    { kind: "rect", x: 6.5, y: 12.5, width: 3.5, height: 2.5, rx: 0.6 },
    { kind: "line", x1: 13, y1: 15.5, x2: 17.5, y2: 15.5 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const cashIconDefinition = {
  name: "cash",
  label: "Cash",
  category: "finance",
  keywords: ["banknote", "money", "paper-cash", "currency"],
  aliases: ["banknote", "paper-money"],
  objects: 1,
  body: [
    { kind: "rect", x: 3.5, y: 6.5, width: 17, height: 11, rx: 2 },
    { kind: "circle", cx: 12, cy: 12, r: 3 },
    { kind: "path", d: "M7 9.3c0 1.1-.9 2-2 2m14-2c-1.1 0-2-.9-2-2M7 14.7c0-1.1-.9-2-2-2m14 2c-1.1 0-2 .9-2 2" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const coinIconDefinition = {
  name: "coin",
  label: "Coin",
  category: "finance",
  keywords: ["currency", "money", "token", "metal"],
  aliases: ["currency-coin", "money-token"],
  objects: 1,
  body: [
    { kind: "circle", cx: 12, cy: 12, r: 8 },
    { kind: "circle", cx: 12, cy: 12, r: 5 },
    { kind: "line", x1: 9.5, y1: 12, x2: 14.5, y2: 12 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const receiptIconDefinition = {
  name: "receipt",
  label: "Receipt",
  category: "finance",
  keywords: ["expense", "purchase", "proof", "sale"],
  aliases: ["purchase-receipt", "sale-receipt"],
  objects: 1,
  body: [
    { kind: "path", d: "M6 4h12v16l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-2 1.2V4Z" },
    { kind: "line", x1: 9, y1: 8, x2: 15, y2: 8 },
    { kind: "line", x1: 9, y1: 11.5, x2: 15, y2: 11.5 },
    { kind: "line", x1: 9, y1: 15, x2: 13, y2: 15 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const invoiceIconDefinition = {
  name: "invoice",
  label: "Invoice",
  category: "finance",
  keywords: ["bill", "document", "payment", "amount-due"],
  aliases: ["billing-document", "payment-invoice"],
  objects: 1,
  body: [
    { kind: "path", d: "M6 4h8l4 4v12H6V4Z" },
    { kind: "path", d: "M14 4v4h4" },
    { kind: "line", x1: 9, y1: 11, x2: 15, y2: 11 },
    { kind: "line", x1: 9, y1: 14, x2: 15, y2: 14 },
    { kind: "line", x1: 11, y1: 17, x2: 15, y2: 17 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const budgetIconDefinition = {
  name: "budget",
  label: "Budget",
  category: "finance",
  keywords: ["plan", "allocation", "pie", "spending-plan"],
  aliases: ["financial-plan", "allocation-plan"],
  objects: 2,
  body: [
    { kind: "circle", cx: 10.5, cy: 12, r: 6.5 },
    { kind: "path", d: "M10.5 5.5V12H17" },
    { kind: "path", d: "M15.1 7.4A6.5 6.5 0 0 1 17 12" },
    { kind: "line", x1: 17.5, y1: 16, x2: 20, y2: 16 },
    { kind: "line", x1: 17.5, y1: 19, x2: 20, y2: 19 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const savingsIconDefinition = {
  name: "savings",
  label: "Savings",
  category: "finance",
  keywords: ["piggy", "reserve", "fund", "saved-money"],
  aliases: ["reserve-fund", "piggy-bank"],
  objects: 1,
  body: [
    { kind: "path", d: "M5 11.5c0-3 2.7-5.5 6.5-5.5 1.8 0 3.4.6 4.6 1.7l2.3-.7-.6 2.5c.8.8 1.2 1.9 1.2 3.1 0 2.5-1.8 4.5-4.5 5.2V20h-2.3v-1.8H9V20H6.7v-2.5C5.6 16.7 5 15.5 5 14H3v-2.5h2Z" },
    { kind: "circle", cx: 15.5, cy: 10.4, r: 0.6, filled: true },
    { kind: "line", x1: 9.5, y1: 7.5, x2: 13.5, y2: 7.5 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const trendUpIconDefinition = {
  name: "trend-up",
  label: "Trend Up",
  category: "finance",
  keywords: ["growth", "increase", "chart", "gain"],
  aliases: ["growth-trend", "increase-trend"],
  objects: 1,
  body: [
    { kind: "path", d: "M4.5 17.5 9 13l3 2.5 7.5-8" },
    { kind: "path", d: "M15.8 7.5h3.7v3.7" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const trendDownIconDefinition = {
  name: "trend-down",
  label: "Trend Down",
  category: "finance",
  keywords: ["decline", "decrease", "chart", "loss"],
  aliases: ["decline-trend", "decrease-trend"],
  objects: 1,
  body: [
    { kind: "path", d: "M4.5 6.5 9 11l3-2.5 7.5 8" },
    { kind: "path", d: "M15.8 16.5h3.7v-3.7" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const transferIconDefinition = {
  name: "transfer",
  label: "Transfer",
  category: "finance",
  keywords: ["move", "send", "between", "accounts"],
  aliases: ["account-transfer", "move-funds"],
  objects: 2,
  body: [
    { kind: "rect", x: 3, y: 7, width: 5, height: 10, rx: 1.5 },
    { kind: "rect", x: 16, y: 7, width: 5, height: 10, rx: 1.5 },
    { kind: "path", d: "M8 10h8m0 0-2-2m2 2-2 2" },
    { kind: "path", d: "M16 14H8m0 0 2 2m-2-2 2-2" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const exchangeIconDefinition = {
  name: "exchange",
  label: "Exchange",
  category: "finance",
  keywords: ["currency", "swap", "convert", "rate"],
  aliases: ["currency-exchange", "convert-value"],
  objects: 2,
  body: [
    { kind: "circle", cx: 7.5, cy: 12, r: 3.5 },
    { kind: "circle", cx: 16.5, cy: 12, r: 3.5 },
    { kind: "path", d: "M9.5 7.5h5m0 0-2-2m2 2-2 2" },
    { kind: "path", d: "M14.5 16.5h-5m0 0 2 2m-2-2 2-2" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const calendarMoneyIconDefinition = {
  name: "calendar-money",
  label: "Calendar Money",
  category: "finance",
  keywords: ["schedule", "due", "payment", "financial-date"],
  aliases: ["scheduled-payment", "money-date"],
  objects: 2,
  body: [
    { kind: "rect", x: 4, y: 5.5, width: 16, height: 14.5, rx: 2 },
    { kind: "path", d: "M8 3.8v3.4M16 3.8v3.4M4 9h16" },
    { kind: "circle", cx: 12, cy: 14.5, r: 3 },
    { kind: "line", x1: 10.5, y1: 14.5, x2: 13.5, y2: 14.5 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const shieldMoneyIconDefinition = {
  name: "shield-money",
  label: "Shield Money",
  category: "finance",
  keywords: ["protect", "security", "wealth", "insured"],
  aliases: ["protected-funds", "financial-security"],
  objects: 2,
  body: [
    { kind: "path", d: "M12 3.5 19 6v5.2c0 4.2-2.8 7.7-7 9.3-4.2-1.6-7-5.1-7-9.3V6l7-2.5Z" },
    { kind: "circle", cx: 12, cy: 11.5, r: 3 },
    { kind: "line", x1: 10.5, y1: 11.5, x2: 13.5, y2: 11.5 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const taxIconDefinition = {
  name: "tax",
  label: "Tax",
  category: "finance",
  keywords: ["percentage", "fee", "rate", "filing"],
  aliases: ["tax-rate", "tax-document"],
  objects: 2,
  body: [
    { kind: "path", d: "M6 4h8l4 4v12H6V4Z" },
    { kind: "path", d: "M14 4v4h4" },
    { kind: "circle", cx: 9.5, cy: 11, r: 1.3 },
    { kind: "circle", cx: 14.5, cy: 16, r: 1.3 },
    { kind: "line", x1: 9.5, y1: 16, x2: 14.5, y2: 11 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const FINANCE_ICON_DEFINITIONS = [
  walletIconDefinition,
  bankIconDefinition,
  cardIconDefinition,
  cashIconDefinition,
  coinIconDefinition,
  receiptIconDefinition,
  invoiceIconDefinition,
  budgetIconDefinition,
  savingsIconDefinition,
  trendUpIconDefinition,
  trendDownIconDefinition,
  transferIconDefinition,
  exchangeIconDefinition,
  calendarMoneyIconDefinition,
  shieldMoneyIconDefinition,
  taxIconDefinition,
] as const;
