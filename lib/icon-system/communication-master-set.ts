import type { JalvoroIconName } from "@/components/icons/jalvoro/manifest";

export const JALVORO_COMMUNICATION_MASTER_NAMES = [
  "mail",
  "chat",
  "phone",
  "send",
  "globe",
] as const satisfies readonly JalvoroIconName[];

export type JalvoroCommunicationMasterName =
  (typeof JALVORO_COMMUNICATION_MASTER_NAMES)[number];

export type JalvoroCommunicationMasterSpec = {
  status: "master";
  semanticIntent: string;
  silhouette: string;
  primaryCue: string;
  relationship?: string;
  avoid: readonly string[];
};

export const JALVORO_COMMUNICATION_MASTER_SPEC: Readonly<
  Record<JalvoroCommunicationMasterName, JalvoroCommunicationMasterSpec>
> = {
  mail: {
    status: "master",
    semanticIntent: "Represent addressed asynchronous mail, email or inbox communication.",
    silhouette: "A rounded envelope with one clear folded flap crossing the upper interior.",
    primaryCue: "Envelope",
    relationship: "Distinct from chat, which represents an active conversational thread.",
    avoid: ["notification badge", "paper plane", "multiple stacked envelopes"],
  },
  chat: {
    status: "master",
    semanticIntent: "Represent an active written conversation, discussion or message thread.",
    silhouette: "One rectangular speech bubble with a lower-left tail and two restrained text lines.",
    primaryCue: "Conversation bubble",
    relationship: "Distinct from mail, which represents addressed asynchronous correspondence.",
    avoid: ["multiple overlapping bubbles", "ellipsis-only bubble", "notification badge"],
  },
  phone: {
    status: "master",
    semanticIntent: "Represent a voice call or telephone contact channel without device-brand detail.",
    silhouette: "One continuous curved handset with clearly separated receiver ends.",
    primaryCue: "Telephone handset",
    relationship: "A synchronous voice channel, separate from written mail and chat.",
    avoid: ["smartphone rectangle", "signal waves", "call-status badge"],
  },
  send: {
    status: "master",
    semanticIntent: "Deliver a composed message through the active communication channel.",
    silhouette: "A right-facing paper plane with one central fold and a restrained lower return edge.",
    primaryCue: "Message delivery plane",
    relationship: "Communication-scoped delivery; distinct from share distribution and export boundary crossing.",
    avoid: ["share nodes", "export container", "motion streaks"],
  },
  globe: {
    status: "master",
    semanticIntent: "Represent global communication reach, language availability or international presence.",
    silhouette: "A circular world grid with one equator and balanced longitudinal curves.",
    primaryCue: "Global communication grid",
    relationship: "Represents worldwide reach rather than a browser, location pin or physical planet object.",
    avoid: ["map pin", "browser window", "country-specific landmass"],
  },
};

const communicationMasterNameSet = new Set<string>(
  JALVORO_COMMUNICATION_MASTER_NAMES,
);

export function isJalvoroCommunicationMasterName(
  name: JalvoroIconName,
): name is JalvoroCommunicationMasterName {
  return communicationMasterNameSet.has(name);
}

export const JALVORO_COMMUNICATION_NAMING_STANDARD = Object.freeze({
  sourceId: "lowercase kebab-case channel, message or communication-reach concept",
  component: "Jalvoro{PascalCaseName}Icon",
  label: "Concise title-case communication label",
  aliases: "Search-only channel synonyms; never duplicate component exports",
  channelBoundary:
    "Communication owns channels, messages and delivery; generic operations remain in Actions and physical items remain in Objects",
  globalBoundary:
    "Globe means worldwide communication or language reach, not location, browser navigation or geography detail",
});
