import { describe, expect, it } from "vitest";

import { beforeSend } from "../sentry.shared.config";

describe("Sentry privacy and diagnostics contract", () => {
  it("drops expected user errors by allowlisted code", () => {
    expect(
      beforeSend({
        event_id: "1",
        tags: { "jalvoro.error_code": "session_expired" },
      }),
    ).toBeNull();
  });

  it("keeps allowlisted diagnostic breadcrumbs and removes arbitrary messages", () => {
    const event = beforeSend({
      event_id: "2",
      breadcrumbs: [
        {
          category: "navigation",
          message: "Route transition started",
          data: { route: "/dashboard", token: "secret" },
        },
        {
          category: "console",
          message: "private financial detail",
        },
      ],
    });
    expect(event?.breadcrumbs).toEqual([
      {
        category: "navigation",
        message: "route transition started",
        data: { route: "/dashboard", token: "[Filtered]" },
      },
    ]);
  });

  it("removes request details, users, extras and sensitive tags", () => {
    const event = beforeSend({
      event_id: "3",
      user: { id: "private" },
      request: {
        url: "https://example.test/private",
        headers: { authorization: "Bearer secret" },
        cookies: "secret",
        data: { amount: 100 },
      },
      extra: { document: "private" },
      tags: { account_id: "private", surface: "dashboard" },
    });
    expect(event?.user).toBeUndefined();
    expect(event?.request?.url).toBeUndefined();
    expect(event?.request?.headers).toBeUndefined();
    expect(event?.request?.cookies).toBeUndefined();
    expect(event?.request?.data).toBeUndefined();
    expect(event?.extra).toBeUndefined();
    expect(event?.tags).toEqual({
      account_id: "[Filtered]",
      surface: "dashboard",
    });
  });
});
