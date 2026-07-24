import { JALVORO_ICON_DEFINITIONS } from "@/components/icons/jalvoro/definitions";
import {
  JALVORO_ICON_MANIFEST,
  JALVORO_ICON_NAMES,
  type JalvoroIconName,
} from "@/components/icons/jalvoro/manifest";
import { JALVORO_ICON_SYSTEM_VERSION } from "@/components/icons/jalvoro/tokens";
import type {
  JalvoroIconCategory,
  JalvoroIconContext,
  JalvoroIconDefinition,
} from "@/components/icons/jalvoro/types";
import {
  JALVORO_NAVIGATION_MASTER_NAMES,
  JALVORO_NAVIGATION_MASTER_SPEC,
  isJalvoroNavigationMasterName,
} from "@/lib/icon-system/navigation-master-set";

export const JALVORO_ICON_CATEGORY_ORDER = [
  "navigation",
  "actions",
  "finance",
  "objects",
  "identity",
  "communication",
  "interface",
  "status",
] as const satisfies readonly JalvoroIconCategory[];

export const JALVORO_ICON_CATEGORY_META: Readonly<
  Record<
    JalvoroIconCategory,
    {
      label: string;
      description: string;
      importPath: string;
    }
  >
> = {
  navigation: {
    label: "Navigation",
    description: "Primary routes, workspace destinations and product movement.",
    importPath: "@/components/icons/jalvoro/components/navigation",
  },
  actions: {
    label: "Actions",
    description: "Direct operations such as add, edit, delete, search and share.",
    importPath: "@/components/icons/jalvoro/components/actions",
  },
  finance: {
    label: "Finance",
    description: "Money, banking, planning, financial state and performance.",
    importPath: "@/components/icons/jalvoro/components/finance",
  },
  objects: {
    label: "Objects",
    description: "Reusable physical and digital objects used across products.",
    importPath: "@/components/icons/jalvoro/components/objects",
  },
  identity: {
    label: "Identity",
    description: "People, profiles, teams and account actors.",
    importPath: "@/components/icons/jalvoro/components/identity",
  },
  communication: {
    label: "Communication",
    description: "Messages, contact, sending and global presence.",
    importPath: "@/components/icons/jalvoro/components/communication",
  },
  interface: {
    label: "Interface",
    description: "Layout, visibility, direction and interface controls.",
    importPath: "@/components/icons/jalvoro/components/interface",
  },
  status: {
    label: "Status",
    description: "Success, warning, errors, progress and intelligence states.",
    importPath: "@/components/icons/jalvoro/components/status",
  },
};

export const JALVORO_ICON_LIBRARY = Object.freeze({
  id: "jalvoro-core",
  name: "JALVORO Core",
  version: JALVORO_ICON_SYSTEM_VERSION,
  status: "design" as const,
  description:
    "The foundational clean-outline library for JALVORO products, tools and future packages.",
  iconCount: JALVORO_ICON_NAMES.length,
  masteredIconCount: JALVORO_NAVIGATION_MASTER_NAMES.length,
  categoryCount: JALVORO_ICON_CATEGORY_ORDER.length,
});

export const JALVORO_LIBRARY_ROADMAP = Object.freeze([
  {
    id: "jalvoro-core",
    name: "Core",
    status: "active" as const,
    description: "Navigation, actions, finance, interface and essential product symbols.",
  },
  {
    id: "jalvoro-business",
    name: "Business",
    status: "planned" as const,
    description: "Operations, teams, payroll, inventory, CRM and enterprise workflows.",
  },
  {
    id: "jalvoro-commerce",
    name: "Commerce",
    status: "planned" as const,
    description: "Products, retail, checkout, logistics, shops and marketplaces.",
  },
  {
    id: "jalvoro-world",
    name: "World & Lifestyle",
    status: "planned" as const,
    description: "Travel, transport, health, education, home, food and daily life.",
  },
]);

const definitionByName = Object.fromEntries(
  JALVORO_ICON_DEFINITIONS.map((definition) => [definition.name, definition]),
) as unknown as Readonly<Record<JalvoroIconName, JalvoroIconDefinition>>;

export function toJalvoroIconComponentName(name: JalvoroIconName) {
  const pascalName = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  return `Jalvoro${pascalName}Icon`;
}

export const JALVORO_ICON_LIBRARY_ENTRIES = Object.freeze(
  JALVORO_ICON_NAMES.map((name) => {
    const definition = definitionByName[name];
    const manifest = JALVORO_ICON_MANIFEST[name];
    const masterSpec = isJalvoroNavigationMasterName(name)
      ? JALVORO_NAVIGATION_MASTER_SPEC[name]
      : null;

    return Object.freeze({
      name,
      label: definition.label,
      category: manifest.category,
      phase: manifest.phase,
      objects: manifest.objects,
      keywords: Object.freeze([...definition.keywords]),
      aliases: Object.freeze([...(definition.aliases ?? [])]),
      componentName: toJalvoroIconComponentName(name),
      importPath: JALVORO_ICON_CATEGORY_META[manifest.category].importPath,
      designStatus: masterSpec?.status ?? ("draft" as const),
      semanticIntent: masterSpec?.semanticIntent ?? null,
      silhouette: masterSpec?.silhouette ?? null,
      primaryCue: masterSpec?.primaryCue ?? null,
      relationship: masterSpec?.relationship ?? null,
      avoid: Object.freeze([...(masterSpec?.avoid ?? [])]),
    });
  }),
);

export type JalvoroIconLibraryEntry =
  (typeof JALVORO_ICON_LIBRARY_ENTRIES)[number];

export function buildJalvoroIconImportSnippet(name: JalvoroIconName) {
  const entry = JALVORO_ICON_LIBRARY_ENTRIES.find((icon) => icon.name === name);
  if (!entry) return "";

  return `import { ${entry.componentName} } from \"${entry.importPath}\";`;
}

export function buildJalvoroIconUsageSnippet(
  name: JalvoroIconName,
  size = 24,
  context: JalvoroIconContext = "content",
) {
  const entry = JALVORO_ICON_LIBRARY_ENTRIES.find((icon) => icon.name === name);
  if (!entry) return "";

  return `<${entry.componentName}\n  size={${size}}\n  context=\"${context}\"\n  aria-hidden=\"true\"\n/>`;
}

export function buildJalvoroIconFullSnippet(
  name: JalvoroIconName,
  size = 24,
  context: JalvoroIconContext = "content",
) {
  return `${buildJalvoroIconImportSnippet(name)}\n\n${buildJalvoroIconUsageSnippet(
    name,
    size,
    context,
  )}`;
}
