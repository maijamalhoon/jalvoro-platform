import type { JalvoroIconName } from "@/components/icons/jalvoro/manifest";

export const JALVORO_STATUS_MASTER_NAMES = [
  "success",
  "warning",
  "info",
  "error",
  "pending",
  "spark",
] as const satisfies readonly JalvoroIconName[];

export type JalvoroStatusMasterName =
  (typeof JALVORO_STATUS_MASTER_NAMES)[number];

export type JalvoroStatusMasterSpec = {
  status: "master";
  semanticIntent: string;
  silhouette: string;
  primaryCue: string;
  relationship?: string;
  avoid: readonly string[];
};

export const JALVORO_STATUS_MASTER_SPEC: Readonly<
  Record<JalvoroStatusMasterName, JalvoroStatusMasterSpec>
> = {
  success: {
    status: "master",
    semanticIntent: "Represent a completed, confirmed or successfully resolved system state.",
    silhouette: "A circular state enclosure containing one clean rising confirmation mark.",
    primaryCue: "Confirmed state",
    relationship: "Uses an enclosure to remain distinct from the bare Check action.",
    avoid: ["double check", "celebration rays", "color-only meaning"],
  },
  warning: {
    status: "master",
    semanticIntent: "Represent caution, elevated risk or a condition that requires attention.",
    silhouette: "A balanced triangular enclosure with one centered exclamation indicator.",
    primaryCue: "Caution triangle",
    relationship: "Signals attention without claiming the operation has already failed.",
    avoid: ["hazard stripes", "flame metaphor", "color-only meaning"],
  },
  info: {
    status: "master",
    semanticIntent: "Represent neutral contextual information, explanation or an informational notice.",
    silhouette: "A softly rounded square containing one centered information stem and point.",
    primaryCue: "Information notice",
    relationship: "Neutral guidance state, separate from Help actions and Warning severity.",
    avoid: ["question mark", "speech bubble", "color-only meaning"],
  },
  error: {
    status: "master",
    semanticIntent: "Represent a failed, invalid or blocked system state requiring correction.",
    silhouette: "An eight-sided stop enclosure containing two restrained crossing strokes.",
    primaryCue: "Blocked failure state",
    relationship: "Uses a stop enclosure to remain distinct from the bare Close action.",
    avoid: ["trash metaphor", "skull symbol", "color-only meaning"],
  },
  pending: {
    status: "master",
    semanticIntent: "Represent a queued, waiting or incomplete process whose result is not final.",
    silhouette: "A minimal hourglass with paired rails and two opposing curved chambers.",
    primaryCue: "Waiting state",
    relationship: "Communicates unresolved time without duplicating the Clock object or Refresh action.",
    avoid: ["spinner animation", "percentage text", "color-only meaning"],
  },
  spark: {
    status: "master",
    semanticIntent: "Represent a specifically designated AI-enhanced, newly introduced or special capability state.",
    silhouette: "One restrained four-direction spark with no secondary decorative marks.",
    primaryCue: "Special capability spark",
    relationship: "Reserved for explicit AI, new or enhanced capability meaning; never a generic fallback decoration.",
    avoid: ["multiple sparkles", "automatic decoration", "unrelated feature fallback"],
  },
};

const statusMasterNameSet = new Set<string>(JALVORO_STATUS_MASTER_NAMES);

export function isJalvoroStatusMasterName(
  name: JalvoroIconName,
): name is JalvoroStatusMasterName {
  return statusMasterNameSet.has(name);
}

export const JALVORO_STATUS_NAMING_STANDARD = Object.freeze({
  sourceId: "lowercase kebab-case resulting state or severity concept",
  component: "Jalvoro{PascalCaseName}Icon",
  label: "Concise title-case state label",
  aliases: "Search-only state synonyms; never duplicate component exports",
  stateBoundary:
    "Status describes a resulting condition; user operations remain in Actions and reusable things remain in Objects",
  colorBoundary:
    "Every status must remain understandable from geometry and context without relying on red, green, yellow or blue",
  sparkBoundary:
    "Spark is allowed only when the semantic concept itself is AI-enhanced, new or special; it is never automatic decoration",
});
