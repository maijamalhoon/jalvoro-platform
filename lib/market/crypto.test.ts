import { afterEach, describe, expect, it, vi } from "vitest";

import { getCryptoPrices, normalizeCryptoIds } from "./crypto";

vi.mock("@/lib/exchange-rate", () => ({
  getUsdToPkrRate: vi.fn(async () => ({ rate: 280 })),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("crypto market normalization", () => {
  it("rejects object meta-property names supplied as asset identifiers", () => {
    expect(
      normalizeCryptoIds([
        "__proto__",
        "constructor",
        "prototype",
        " Bitcoin ",
      ]),
    ).toEqual(["bitcoin"]);
  });

  it("builds a stable price record without dynamic property mutation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify([
            {
              id: "bitcoin",
              current_price: 10,
              price_change_percentage_24h: 2,
              last_updated: "2026-07-28T00:00:00Z",
              image: "https://example.test/bitcoin.png",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const result = await getCryptoPrices(["bitcoin", "__proto__"]);

    expect(result.prices).toEqual({
      bitcoin: {
        usd: 10,
        pkr: 2_800,
        change24h: 2,
        lastUpdatedAt: "2026-07-28T00:00:00Z",
        imageUrl: "https://example.test/bitcoin.png",
      },
    });
    expect(Object.prototype.hasOwnProperty.call(result.prices, "__proto__")).toBe(
      false,
    );
  });
});
