import type { JalvoroIconName } from "@/components/icons/jalvoro/manifest";

export const JALVORO_ACTIONS_MASTER_NAMES = [
  "add",
  "edit",
  "delete",
  "copy",
  "search",
  "filter",
  "sort",
  "share",
  "export",
  "import",
  "download",
  "upload",
  "refresh",
  "check",
  "close",
  "more",
  "undo",
  "redo",
] as const satisfies readonly JalvoroIconName[];

export type JalvoroActionsMasterName =
  (typeof JALVORO_ACTIONS_MASTER_NAMES)[number];

export type JalvoroActionsMasterSpec = {
  status: "master";
  semanticIntent: string;
  silhouette: string;
  primaryCue: string;
  relationship?: string;
  avoid: readonly string[];
};

export const JALVORO_ACTIONS_MASTER_SPEC: Readonly<
  Record<JalvoroActionsMasterName, JalvoroActionsMasterSpec>
> = {
  add: {
    status: "master",
    semanticIntent: "Create or insert one new item in the current context.",
    silhouette: "One balanced vertical and horizontal stroke crossing at the center.",
    primaryCue: "Plus action",
    avoid: ["decorative circle", "sparkle", "filled badge"],
  },
  edit: {
    status: "master",
    semanticIntent: "Modify the content or properties of an existing item.",
    silhouette: "A diagonal pencil with a clear body, cap seam and writing tip.",
    primaryCue: "Pencil",
    avoid: ["document container", "brush metaphor", "filled triangular tip"],
  },
  delete: {
    status: "master",
    semanticIntent: "Remove an item from the current system or collection.",
    silhouette: "A restrained waste bin with lid, handle and two interior rails.",
    primaryCue: "Waste bin",
    avoid: ["danger badge", "cross mark", "shredded-paper detail"],
  },
  copy: {
    status: "master",
    semanticIntent: "Create a duplicate of the selected item or content.",
    silhouette: "Two offset rounded documents with one clean overlap.",
    primaryCue: "Overlapping copies",
    avoid: ["clipboard metaphor", "plus badge", "three stacked documents"],
  },
  search: {
    status: "master",
    semanticIntent: "Find content, records or destinations by a query.",
    silhouette: "A circular lens with one diagonal handle.",
    primaryCue: "Magnifying lens",
    avoid: ["eye metaphor", "sparkle", "text lines inside the lens"],
  },
  filter: {
    status: "master",
    semanticIntent: "Reduce a result set using one or more criteria.",
    silhouette: "A broad funnel narrowing into one short output stem.",
    primaryCue: "Funnel",
    avoid: ["slider controls", "search lens", "multiple funnel layers"],
  },
  sort: {
    status: "master",
    semanticIntent: "Change the ordering of a collection by a chosen rule.",
    silhouette: "Three descending measure lines paired with one downward direction arrow.",
    primaryCue: "Ordered sequence",
    avoid: ["bidirectional transfer arrows", "filter funnel", "alphabet-specific marks"],
  },
  share: {
    status: "master",
    semanticIntent: "Distribute the selected item to another person, app or destination.",
    silhouette: "One source node linked to two balanced destination nodes.",
    primaryCue: "Distribution network",
    avoid: ["paper plane duplication", "external-link box", "more than three nodes"],
  },
  export: {
    status: "master",
    semanticIntent: "Move data or content out of the current system boundary.",
    silhouette: "An open container paired with an arrow leaving toward the upper right.",
    primaryCue: "Outbound boundary",
    relationship: "Directional counterpart of import.",
    avoid: ["download arrow", "share network", "file-format badge"],
  },
  import: {
    status: "master",
    semanticIntent: "Bring external data or content into the current system boundary.",
    silhouette: "An open container paired with an arrow entering from the upper left.",
    primaryCue: "Inbound boundary",
    relationship: "Directional counterpart of export.",
    avoid: ["upload arrow", "copy documents", "file-format badge"],
  },
  download: {
    status: "master",
    semanticIntent: "Save remote or generated content to the local device.",
    silhouette: "A downward arrow terminating above one stable baseline.",
    primaryCue: "Down to device",
    relationship: "Directional counterpart of upload.",
    avoid: ["inbox tray", "import container", "cloud decoration"],
  },
  upload: {
    status: "master",
    semanticIntent: "Send local content to a remote destination or service.",
    silhouette: "An upward arrow rising from one stable baseline.",
    primaryCue: "Up from device",
    relationship: "Directional counterpart of download.",
    avoid: ["outbox tray", "export container", "cloud decoration"],
  },
  refresh: {
    status: "master",
    semanticIntent: "Request the latest available state without changing the underlying intent.",
    silhouette: "Two open circular arcs with opposing arrowheads.",
    primaryCue: "Renewed cycle",
    avoid: ["single undo arrow", "sync status badge", "full closed circle"],
  },
  check: {
    status: "master",
    semanticIntent: "Confirm, accept or complete the current action.",
    silhouette: "One rising check stroke with a short entry and longer exit.",
    primaryCue: "Confirmation mark",
    avoid: ["surrounding circle", "success badge", "double check"],
  },
  close: {
    status: "master",
    semanticIntent: "Dismiss or close the current surface without implying deletion.",
    silhouette: "Two equal diagonal strokes crossing at the center.",
    primaryCue: "Dismissal cross",
    avoid: ["surrounding circle", "trash metaphor", "unequal diagonal lengths"],
  },
  more: {
    status: "master",
    semanticIntent: "Reveal additional contextual actions that are not currently visible.",
    silhouette: "Three evenly spaced horizontal points.",
    primaryCue: "Overflow options",
    avoid: ["vertical orientation for the canonical icon", "menu lines", "decorative enclosure"],
  },
  undo: {
    status: "master",
    semanticIntent: "Reverse the most recent reversible change.",
    silhouette: "A left-turning arrow flowing into one open historical arc.",
    primaryCue: "Step backward",
    relationship: "Mirrored directional counterpart of redo.",
    avoid: ["browser back arrow", "refresh cycle", "multiple history rings"],
  },
  redo: {
    status: "master",
    semanticIntent: "Reapply the most recently reversed change.",
    silhouette: "A right-turning arrow flowing into one open historical arc.",
    primaryCue: "Step forward",
    relationship: "Mirrored directional counterpart of undo.",
    avoid: ["browser forward arrow", "refresh cycle", "multiple history rings"],
  },
};

const actionsMasterNameSet = new Set<string>(JALVORO_ACTIONS_MASTER_NAMES);

export function isJalvoroActionsMasterName(
  name: JalvoroIconName,
): name is JalvoroActionsMasterName {
  return actionsMasterNameSet.has(name);
}

export const JALVORO_ACTIONS_NAMING_STANDARD = Object.freeze({
  sourceId: "lowercase kebab-case imperative action",
  component: "Jalvoro{PascalCaseName}Icon",
  label: "Concise title-case verb",
  aliases: "Search-only alternate verbs; never duplicate component exports",
  pairedActions: "Mirrored geometry is allowed only for true semantic opposites",
  statusBoundary: "Action icons describe operations; status icons describe resulting state",
});
