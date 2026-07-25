import type { JalvoroIconName } from "@/components/icons/jalvoro/manifest";

export const JALVORO_INTERFACE_MASTER_NAMES = [
  "menu",
  "grid",
  "list",
  "sidebar",
  "eye",
  "eye-off",
  "chevron-down",
  "chevron-right",
  "arrow-left",
  "arrow-right",
] as const satisfies readonly JalvoroIconName[];

export type JalvoroInterfaceMasterName =
  (typeof JALVORO_INTERFACE_MASTER_NAMES)[number];

export type JalvoroInterfaceMasterSpec = {
  status: "master";
  semanticIntent: string;
  silhouette: string;
  primaryCue: string;
  relationship?: string;
  avoid: readonly string[];
};

export const JALVORO_INTERFACE_MASTER_SPEC: Readonly<
  Record<JalvoroInterfaceMasterName, JalvoroInterfaceMasterSpec>
> = {
  menu: {
    status: "master",
    semanticIntent: "Reveal or collapse a primary navigation or contextual menu surface.",
    silhouette: "Three equal horizontal strokes with consistent spacing and no surrounding container.",
    primaryCue: "Menu control",
    relationship: "A control that reveals navigation; it is not itself a navigation destination.",
    avoid: ["unequal decorative lines", "overflow dots", "enclosing button shape"],
  },
  grid: {
    status: "master",
    semanticIntent: "Display a collection as an evenly distributed tile or gallery layout.",
    silhouette: "Four balanced rounded tiles arranged in a clear two-by-two matrix.",
    primaryCue: "Tile view",
    relationship: "A view-mode counterpart to list, not a dashboard or applications destination.",
    avoid: ["dashboard chart content", "nine dense dots", "selected-tile badge"],
  },
  list: {
    status: "master",
    semanticIntent: "Display a collection as vertically ordered rows with item markers.",
    silhouette: "Three aligned point markers paired with three equal horizontal row strokes.",
    primaryCue: "Row view",
    relationship: "A view-mode counterpart to grid, not a generic menu or task checklist.",
    avoid: ["check marks", "numbered ranking", "unequal decorative rows"],
  },
  sidebar: {
    status: "master",
    semanticIntent: "Show, hide or identify a persistent side panel within an application layout.",
    silhouette: "One rounded application frame divided by a narrow left-side rail.",
    primaryCue: "Side panel layout",
    relationship: "Represents layout structure; menu represents the control that may reveal navigation content.",
    avoid: ["browser chrome", "dashboard widgets", "directional collapse arrow"],
  },
  eye: {
    status: "master",
    semanticIntent: "Show, preview or indicate that interface content is currently visible.",
    silhouette: "A symmetric eye contour with one centered circular pupil.",
    primaryCue: "Visible content",
    relationship: "Visibility counterpart to eye-off; it does not indicate identity, surveillance or security status.",
    avoid: ["eyelashes", "camera lens", "status badge"],
  },
  "eye-off": {
    status: "master",
    semanticIntent: "Hide, conceal or indicate that interface content is currently not visible.",
    silhouette: "A partially interrupted eye contour crossed by one continuous diagonal stroke.",
    primaryCue: "Hidden content",
    relationship: "Visibility counterpart to eye; it does not imply deletion, permission denial or encryption.",
    avoid: ["lock symbol", "close mark alone", "privacy-status badge"],
  },
  "chevron-down": {
    status: "master",
    semanticIntent: "Disclose, expand or move one hierarchical interface level downward.",
    silhouette: "Two equal diagonal strokes meeting at a centered lower point without a shaft.",
    primaryCue: "Downward disclosure",
    relationship: "Chevron geometry indicates disclosure or hierarchy; arrows indicate directional movement.",
    avoid: ["vertical shaft", "download baseline", "filled triangle"],
  },
  "chevron-right": {
    status: "master",
    semanticIntent: "Disclose, drill into or move one hierarchical interface level to the right.",
    silhouette: "Two equal diagonal strokes meeting at a centered right point without a shaft.",
    primaryCue: "Rightward disclosure",
    relationship: "Chevron geometry indicates disclosure or hierarchy; arrow-right indicates directional movement.",
    avoid: ["horizontal shaft", "send plane", "filled triangle"],
  },
  "arrow-left": {
    status: "master",
    semanticIntent: "Move backward, return or navigate to a previous interface state or page.",
    silhouette: "A horizontal shaft ending in a balanced left-facing arrowhead.",
    primaryCue: "Backward direction",
    relationship: "Directional counterpart to arrow-right; distinct from undo, which reverses a change.",
    avoid: ["curved history arc", "chevron-only form", "browser enclosure"],
  },
  "arrow-right": {
    status: "master",
    semanticIntent: "Move forward, continue or navigate to a next interface state or page.",
    silhouette: "A horizontal shaft ending in a balanced right-facing arrowhead.",
    primaryCue: "Forward direction",
    relationship: "Directional counterpart to arrow-left; distinct from send, share and export actions.",
    avoid: ["paper plane", "external boundary container", "chevron-only form"],
  },
};

const interfaceMasterNameSet = new Set<string>(JALVORO_INTERFACE_MASTER_NAMES);

export function isJalvoroInterfaceMasterName(
  name: JalvoroIconName,
): name is JalvoroInterfaceMasterName {
  return interfaceMasterNameSet.has(name);
}

export const JALVORO_INTERFACE_NAMING_STANDARD = Object.freeze({
  sourceId: "lowercase kebab-case interface control, layout or directional concept",
  component: "Jalvoro{PascalCaseName}Icon",
  label: "Concise title-case interface label",
  aliases: "Search-only UI terminology; never duplicate component exports",
  controlBoundary:
    "Interface owns controls, view modes, visibility and direction; Navigation owns destinations and Actions own domain operations",
  directionBoundary:
    "Chevrons indicate disclosure or hierarchy while arrows indicate movement between interface states",
});
