import type { JalvoroIconName } from "@/components/icons/jalvoro/manifest";

export const JALVORO_OBJECTS_MASTER_NAMES = [
  "file",
  "folder",
  "bell",
  "clock",
  "calendar",
  "tag",
  "link",
  "image",
  "camera",
  "lock",
  "key",
  "pencil",
] as const satisfies readonly JalvoroIconName[];

export type JalvoroObjectsMasterName =
  (typeof JALVORO_OBJECTS_MASTER_NAMES)[number];

export type JalvoroObjectsMasterSpec = {
  status: "master";
  semanticIntent: string;
  silhouette: string;
  primaryCue: string;
  relationship?: string;
  avoid: readonly string[];
};

export const JALVORO_OBJECTS_MASTER_SPEC: Readonly<
  Record<JalvoroObjectsMasterName, JalvoroObjectsMasterSpec>
> = {
  file: {
    status: "master",
    semanticIntent: "A generic digital document or record with no implied content type.",
    silhouette: "One upright page with a compact folded upper corner.",
    primaryCue: "Blank document",
    relationship: "Base object for more specific document symbols such as invoice and report.",
    avoid: ["text lines", "currency marks", "receipt tear edge"],
  },
  folder: {
    status: "master",
    semanticIntent: "A container that groups related files or records together.",
    silhouette: "A wide rounded folder with one raised tab and a clean opening seam.",
    primaryCue: "Directory container",
    avoid: ["stacked files", "open-book metaphor", "decorative label"],
  },
  bell: {
    status: "master",
    semanticIntent: "A notification object used to represent alerts and reminders.",
    silhouette: "A balanced hanging bell with one quiet lower clapper arc.",
    primaryCue: "Notification bell",
    avoid: ["ringing motion lines", "alert badge", "filled clapper"],
  },
  clock: {
    status: "master",
    semanticIntent: "A neutral representation of time, duration or a recorded moment.",
    silhouette: "A circular timepiece with one hour hand and one minute hand.",
    primaryCue: "Timepiece",
    relationship: "Time object counterpart to the date-focused calendar.",
    avoid: ["history arrow", "alarm bells", "second-hand detail"],
  },
  calendar: {
    status: "master",
    semanticIntent: "A date or scheduled day within a month-based planning system.",
    silhouette: "A rounded month page with two bindings, one header rule and restrained date marks.",
    primaryCue: "Month calendar",
    relationship: "Date object counterpart to the time-focused clock.",
    avoid: ["currency token", "check badge", "dense date grid"],
  },
  tag: {
    status: "master",
    semanticIntent: "A label attached to an item for classification or identification.",
    silhouette: "One angled label shape with a single attachment hole.",
    primaryCue: "Physical tag",
    avoid: ["price symbol", "multiple stacked tags", "bookmark silhouette"],
  },
  link: {
    status: "master",
    semanticIntent: "A durable connection or reference between two resources.",
    silhouette: "Two interlocking rounded chain segments connected on one diagonal axis.",
    primaryCue: "Chain connection",
    avoid: ["external-link arrow", "network nodes", "broken-link state"],
  },
  image: {
    status: "master",
    semanticIntent: "A stored visual asset such as a picture, illustration or photograph.",
    silhouette: "A rounded image frame containing one sun point and one simple landscape ridge.",
    primaryCue: "Picture frame",
    relationship: "Represents an existing visual asset; camera represents capture hardware.",
    avoid: ["camera lens", "play triangle", "multiple landscape layers"],
  },
  camera: {
    status: "master",
    semanticIntent: "A device used to capture a photograph or visual record.",
    silhouette: "A compact camera body with a raised top housing, central lens and small viewfinder point.",
    primaryCue: "Capture device",
    relationship: "Represents capture hardware; image represents the resulting visual asset.",
    avoid: ["image landscape", "video play mark", "flash burst"],
  },
  lock: {
    status: "master",
    semanticIntent: "A closed access state or a secured object boundary.",
    silhouette: "A rounded padlock body with one centered shackle and restrained key slot.",
    primaryCue: "Closed padlock",
    relationship: "Physical security object; shield-money represents protected funds rather than access state.",
    avoid: ["shield enclosure", "check badge", "open shackle"],
  },
  key: {
    status: "master",
    semanticIntent: "A physical or symbolic credential that grants access.",
    silhouette: "A circular key bow attached to one straight shaft with two simple teeth.",
    primaryCue: "Access key",
    relationship: "Credential object paired conceptually with the secured lock.",
    avoid: ["password dots", "API token brackets", "ornate antique teeth"],
  },
  pencil: {
    status: "master",
    semanticIntent: "A standalone writing and drawing instrument as a reusable object.",
    silhouette: "A horizontal hexagonal pencil with an eraser seam and a pointed graphite end.",
    primaryCue: "Writing instrument",
    relationship: "Object form remains visually distinct from the diagonal Edit action icon.",
    avoid: ["edit motion", "document container", "filled graphite triangle"],
  },
};

const objectsMasterNameSet = new Set<string>(JALVORO_OBJECTS_MASTER_NAMES);

export function isJalvoroObjectsMasterName(
  name: JalvoroIconName,
): name is JalvoroObjectsMasterName {
  return objectsMasterNameSet.has(name);
}

export const JALVORO_OBJECTS_NAMING_STANDARD = Object.freeze({
  sourceId: "lowercase kebab-case singular object noun",
  component: "Jalvoro{PascalCaseName}Icon",
  label: "Concise title-case object name",
  aliases: "Search-only alternate nouns; never duplicate component exports",
  stateBoundary: "Objects describe things; actions describe operations and status describes outcomes",
  specialization: "Generic objects stay visually simpler than domain-specific derivatives",
});
