import type { JalvoroIconName } from "@/components/icons/jalvoro/manifest";

export const JALVORO_FINANCE_MASTER_NAMES = [
  "wallet",
  "bank",
  "card",
  "cash",
  "coin",
  "receipt",
  "invoice",
  "budget",
  "savings",
  "trend-up",
  "trend-down",
  "transfer",
  "exchange",
  "calendar-money",
  "shield-money",
  "tax",
] as const satisfies readonly JalvoroIconName[];

export type JalvoroFinanceMasterName =
  (typeof JALVORO_FINANCE_MASTER_NAMES)[number];

export type JalvoroFinanceMasterSpec = {
  status: "master";
  semanticIntent: string;
  silhouette: string;
  primaryCue: string;
  relationship?: string;
  avoid: readonly string[];
};

export const JALVORO_FINANCE_MASTER_SPEC: Readonly<
  Record<JalvoroFinanceMasterName, JalvoroFinanceMasterSpec>
> = {
  wallet: {
    status: "master",
    semanticIntent: "A portable place that holds the user's immediately available funds.",
    silhouette: "A rounded wallet body with one inset clasp pocket and quiet closure point.",
    primaryCue: "Wallet clasp",
    avoid: ["bank facade", "purse ornament", "currency symbol"],
  },
  bank: {
    status: "master",
    semanticIntent: "A regulated financial institution or banking branch.",
    silhouette: "A country-neutral institutional facade with three stable columns and two bases.",
    primaryCue: "Financial institution",
    avoid: ["wallet silhouette", "country-specific architecture", "currency badge"],
  },
  card: {
    status: "master",
    semanticIntent: "A physical or virtual payment card linked to a financial account.",
    silhouette: "A rounded card with one magnetic band, compact chip and restrained detail line.",
    primaryCue: "Payment card",
    avoid: ["brand logo", "contactless waves", "stacked cards"],
  },
  cash: {
    status: "master",
    semanticIntent: "Paper money held or exchanged as a physical financial asset.",
    silhouette: "One rounded banknote with a central seal and four corner security curves.",
    primaryCue: "Banknote",
    avoid: ["currency-specific portrait", "stacked notes", "coin overlap"],
  },
  coin: {
    status: "master",
    semanticIntent: "A single generic monetary coin or value token.",
    silhouette: "Two concentric circular rims with one neutral horizontal mint mark.",
    primaryCue: "Coin rim",
    avoid: ["currency letter", "crypto logo", "stacked coin pile"],
  },
  receipt: {
    status: "master",
    semanticIntent: "Proof that a purchase or financial transaction has already occurred.",
    silhouette: "A narrow receipt sheet with a restrained semantic tear edge and three record lines.",
    primaryCue: "Purchase record",
    relationship: "Transaction proof; intentionally distinct from the payment request represented by invoice.",
    avoid: ["folded document corner", "currency symbol", "decorative internal zigzag"],
  },
  invoice: {
    status: "master",
    semanticIntent: "A formal request for payment that records items and an amount due.",
    silhouette: "A folded document with two item lines and one aligned total line.",
    primaryCue: "Payment request",
    relationship: "Payment request; intentionally distinct from the completed proof represented by receipt.",
    avoid: ["receipt tear edge", "currency-specific mark", "overdue warning badge"],
  },
  budget: {
    status: "master",
    semanticIntent: "A planned allocation of available money across defined purposes.",
    silhouette: "A segmented allocation circle paired with two short planning measures.",
    primaryCue: "Allocation plan",
    avoid: ["analytics bar chart", "wallet container", "currency symbol"],
  },
  savings: {
    status: "master",
    semanticIntent: "Money intentionally reserved for future use rather than immediate spending.",
    silhouette: "A simplified piggy bank with one slot, eye and stable feet.",
    primaryCue: "Savings reserve",
    avoid: ["coin falling into slot", "celebration spark", "childish facial detail"],
  },
  "trend-up": {
    status: "master",
    semanticIntent: "A financial measure increasing across a sequence of observations.",
    silhouette: "A clean rising polyline terminating in an upper-right arrowhead.",
    primaryCue: "Increasing trend",
    relationship: "Directional opposite of trend-down with matched geometry.",
    avoid: ["bar chart", "currency badge", "success-state enclosure"],
  },
  "trend-down": {
    status: "master",
    semanticIntent: "A financial measure decreasing across a sequence of observations.",
    silhouette: "A clean falling polyline terminating in a lower-right arrowhead.",
    primaryCue: "Decreasing trend",
    relationship: "Directional opposite of trend-up with matched geometry.",
    avoid: ["bar chart", "currency badge", "error-state enclosure"],
  },
  transfer: {
    status: "master",
    semanticIntent: "Funds moving directly between two owned or selected financial accounts.",
    silhouette: "Two account containers connected by matched opposing horizontal arrows.",
    primaryCue: "Account-to-account movement",
    relationship: "Moves the same value between accounts; distinct from currency conversion in exchange.",
    avoid: ["standalone transaction arrows", "currency tokens", "circular refresh motion"],
  },
  exchange: {
    status: "master",
    semanticIntent: "Value being converted from one currency or denomination into another.",
    silhouette: "Two monetary tokens connected by matched conversion arrows above and below.",
    primaryCue: "Value conversion",
    relationship: "Changes denomination; distinct from account movement in transfer.",
    avoid: ["currency letters", "account containers", "refresh circle"],
  },
  "calendar-money": {
    status: "master",
    semanticIntent: "A financial event, payment or obligation attached to a specific date.",
    silhouette: "A compact calendar containing one neutral monetary token marker.",
    primaryCue: "Scheduled finance",
    avoid: ["full month grid", "currency symbol", "notification badge"],
  },
  "shield-money": {
    status: "master",
    semanticIntent: "Funds protected by a security, insurance or risk-control boundary.",
    silhouette: "A balanced shield containing one neutral monetary token.",
    primaryCue: "Protected funds",
    avoid: ["lock duplication", "currency symbol", "success check badge"],
  },
  tax: {
    status: "master",
    semanticIntent: "A tax filing, tax rate or statutory financial charge.",
    silhouette: "A folded financial document containing one clean percentage construction.",
    primaryCue: "Tax document",
    avoid: ["floating percent badge", "receipt tear edge", "government-specific emblem"],
  },
};

const financeMasterNameSet = new Set<string>(JALVORO_FINANCE_MASTER_NAMES);

export function isJalvoroFinanceMasterName(
  name: JalvoroIconName,
): name is JalvoroFinanceMasterName {
  return financeMasterNameSet.has(name);
}

export const JALVORO_FINANCE_NAMING_STANDARD = Object.freeze({
  sourceId: "lowercase kebab-case financial noun or precise noun-modifier compound",
  component: "Jalvoro{PascalCaseName}Icon",
  label: "Readable title case without currency-specific assumptions",
  aliases: "Search-only alternate finance terms; never duplicate component exports",
  compositeNames: "Use noun-modifier compounds only when both concepts are required for recognition",
  categoryBoundary:
    "Finance owns money objects and financial states; Actions owns operations and Navigation owns destinations",
});
