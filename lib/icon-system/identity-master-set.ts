import type { JalvoroIconName } from "@/components/icons/jalvoro/manifest";

export const JALVORO_IDENTITY_MASTER_NAMES = [
  "user",
  "users",
  "user-plus",
] as const satisfies readonly JalvoroIconName[];

export type JalvoroIdentityMasterName =
  (typeof JALVORO_IDENTITY_MASTER_NAMES)[number];

export type JalvoroIdentityMasterSpec = {
  status: "master";
  semanticIntent: string;
  silhouette: string;
  primaryCue: string;
  relationship?: string;
  avoid: readonly string[];
};

export const JALVORO_IDENTITY_MASTER_SPEC: Readonly<
  Record<JalvoroIdentityMasterName, JalvoroIdentityMasterSpec>
> = {
  user: {
    status: "master",
    semanticIntent:
      "Represent one neutral account actor, person or profile without implying role, gender or status.",
    silhouette:
      "One circular head centered above a broad, open shoulder arc with balanced negative space.",
    primaryCue: "Single account actor",
    relationship:
      "Base identity silhouette for users and user-plus while remaining visually singular.",
    avoid: [
      "facial features",
      "gendered hair or clothing",
      "status badge or enclosing profile circle",
    ],
  },
  users: {
    status: "master",
    semanticIntent:
      "Represent a small group, team or member collection rather than one individual account.",
    silhouette:
      "One leading person silhouette paired with a smaller offset person behind it.",
    primaryCue: "Grouped account actors",
    relationship:
      "Plural counterpart of user; the second actor supplies plurality without becoming a crowd.",
    avoid: [
      "three-or-more-person crowd",
      "organization building metaphor",
      "facial or demographic detail",
    ],
  },
  "user-plus": {
    status: "master",
    semanticIntent:
      "Represent adding, inviting or onboarding a person specifically, not the generic Add action.",
    silhouette:
      "One neutral person silhouette with a detached plus mark positioned beside the actor.",
    primaryCue: "Person-specific addition",
    relationship:
      "Composite derivative of user and the Add action, reserved for identity-scoped creation.",
    avoid: [
      "plus inside the head or body",
      "notification or success badge",
      "generic add usage without a person context",
    ],
  },
};

const identityMasterNameSet = new Set<string>(JALVORO_IDENTITY_MASTER_NAMES);

export function isJalvoroIdentityMasterName(
  name: JalvoroIconName,
): name is JalvoroIdentityMasterName {
  return identityMasterNameSet.has(name);
}

export const JALVORO_IDENTITY_NAMING_STANDARD = Object.freeze({
  sourceId: "lowercase kebab-case identity noun or identity-scoped composite",
  component: "Jalvoro{PascalCaseName}Icon",
  label: "Concise title-case identity label",
  aliases: "Search-only alternate identity terms; never duplicate component exports",
  neutrality:
    "Canonical people icons must avoid gender, age, ethnicity, role, emotion and status assumptions",
  categoryBoundary:
    "Identity describes actors; Actions describe operations; Status describes resulting state",
});
