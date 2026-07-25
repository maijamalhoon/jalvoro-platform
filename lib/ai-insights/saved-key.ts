import type { WorkspaceInsight } from "@/lib/ai-insights/workspace";

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function hash(source: string) {
  let value = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    value ^= source.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0).toString(36);
}

export function buildSavedInsightKey(
  insight: Pick<WorkspaceInsight, "topic" | "attention" | "stateKey">,
) {
  const state =
    normalize(insight.stateKey) || `${insight.topic}:${insight.attention}`;
  return `jalvoro-${insight.topic}-${hash(state)}`;
}
