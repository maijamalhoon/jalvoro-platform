import type { JalvoroIconName } from "@/components/icons/jalvoro/manifest";

export const JALVORO_NAVIGATION_MASTER_NAMES = [
  "dashboard",
  "transactions",
  "accounts",
  "income",
  "expenses",
  "goals",
  "payables",
  "investments",
  "analytics",
  "ai-insights",
  "reports",
  "settings",
] as const satisfies readonly JalvoroIconName[];

export type JalvoroNavigationMasterName =
  (typeof JALVORO_NAVIGATION_MASTER_NAMES)[number];

export type JalvoroNavigationMasterSpec = {
  status: "master";
  semanticIntent: string;
  silhouette: string;
  primaryCue: string;
  relationship?: string;
  avoid: readonly string[];
};

export const JALVORO_NAVIGATION_MASTER_SPEC: Readonly<
  Record<JalvoroNavigationMasterName, JalvoroNavigationMasterSpec>
> = {
  dashboard: {
    status: "master",
    semanticIntent: "A destination that summarizes the wider workspace at a glance.",
    silhouette: "Four balanced interface panels with intentionally varied proportions.",
    primaryCue: "Overview layout",
    avoid: ["speedometer metaphor", "house silhouette", "decorative spark"],
  },
  transactions: {
    status: "master",
    semanticIntent: "Recorded value moving in both directions across the workspace.",
    silhouette: "Two parallel opposing arrows with generous negative space.",
    primaryCue: "Bidirectional movement",
    avoid: ["receipt duplication", "currency-specific mark", "circular refresh arrow"],
  },
  accounts: {
    status: "master",
    semanticIntent: "The structured set of financial accounts held by the workspace.",
    silhouette: "A simplified institutional account facade with three stable columns.",
    primaryCue: "Financial institution",
    avoid: ["wallet duplication", "stacked database discs", "country-specific architecture"],
  },
  income: {
    status: "master",
    semanticIntent: "Value entering the user's available financial space.",
    silhouette: "A downward arrow entering a restrained receiving tray.",
    primaryCue: "Incoming flow",
    relationship: "Paired directional opposite of expenses.",
    avoid: ["currency symbol", "growth chart", "deposit receipt"],
  },
  expenses: {
    status: "master",
    semanticIntent: "Value leaving the user's available financial space.",
    silhouette: "An upward arrow leaving a restrained receiving tray.",
    primaryCue: "Outgoing flow",
    relationship: "Paired directional opposite of income.",
    avoid: ["currency symbol", "receipt duplication", "danger styling"],
  },
  goals: {
    status: "master",
    semanticIntent: "A precise objective or milestone the user is working toward.",
    silhouette: "Three concentric target levels ending in one quiet center point.",
    primaryCue: "Target",
    avoid: ["arrow piercing the target", "flag decoration", "celebration spark"],
  },
  payables: {
    status: "master",
    semanticIntent: "A documented obligation that has a due-time dimension.",
    silhouette: "A folded document containing a compact clock.",
    primaryCue: "Bill due",
    avoid: ["hand-and-coin illustration", "calendar duplication", "warning badge"],
  },
  investments: {
    status: "master",
    semanticIntent: "A managed portfolio intended to produce future growth.",
    silhouette: "A portfolio case containing one clean ascending path.",
    primaryCue: "Portfolio growth",
    avoid: ["generic work briefcase", "dense candlestick chart", "currency symbol"],
  },
  analytics: {
    status: "master",
    semanticIntent: "Measured performance shown through comparable data levels.",
    silhouette: "Three ascending rounded bars aligned to one baseline.",
    primaryCue: "Data comparison",
    avoid: ["trend arrow", "document container", "mixed chart types"],
  },
  "ai-insights": {
    status: "master",
    semanticIntent: "Connected machine intelligence producing a useful insight.",
    silhouette: "A central reasoning node linked to three balanced outer nodes.",
    primaryCue: "Intelligence network",
    avoid: ["sparkle as the main icon", "robot face", "literal brain outline"],
  },
  reports: {
    status: "master",
    semanticIntent: "A structured, exportable summary of recorded information.",
    silhouette: "A folded document with restrained text and one miniature report graph.",
    primaryCue: "Formal report",
    avoid: ["plain file duplication", "large chart", "receipt edge"],
  },
  settings: {
    status: "master",
    semanticIntent: "Adjustable system preferences and configuration controls.",
    silhouette: "Three horizontal controls with independently positioned circular handles.",
    primaryCue: "Tuning controls",
    avoid: ["complex gear teeth", "toolbox metaphor", "decorative center line"],
  },
};

const navigationMasterNameSet = new Set<string>(
  JALVORO_NAVIGATION_MASTER_NAMES,
);

export function isJalvoroNavigationMasterName(
  name: JalvoroIconName,
): name is JalvoroNavigationMasterName {
  return navigationMasterNameSet.has(name);
}

export const JALVORO_NAVIGATION_NAMING_STANDARD = Object.freeze({
  sourceId: "lowercase kebab-case semantic noun",
  component: "Jalvoro{PascalCaseName}Icon",
  label: "Readable title case",
  aliases: "Search-only alternate product terms; never duplicate component exports",
  directionalPairs: "Use matched geometry and opposite direction only when concepts are true pairs",
});
