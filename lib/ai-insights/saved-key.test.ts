import { describe, expect, it } from "vitest";

import { buildSavedInsightKey } from "./saved-key";

describe("saved AI insight identity", () => {
  const insight = {
    topic: "cash-flow" as const,
    attention: "act-now" as const,
    stateKey: "cash-flow:negative:-500",
  };

  it("is stable when translated presentation or record date changes", () => {
    expect(buildSavedInsightKey(insight)).toBe(
      buildSavedInsightKey({ ...insight }),
    );
  });

  it("changes when the underlying material finance state changes", () => {
    expect(buildSavedInsightKey(insight)).not.toBe(
      buildSavedInsightKey({
        ...insight,
        stateKey: "cash-flow:negative:-250",
      }),
    );
  });

  it("falls back to topic and attention when an older client omits state", () => {
    expect(
      buildSavedInsightKey({
        topic: "goals",
        attention: "watch-closely",
      }),
    ).toMatch(/^jalvoro-goals-/);
  });
});
