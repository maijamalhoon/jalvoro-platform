import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Command Center observability contracts", () => {
  it("captures both private error boundaries with non-PII routing tags", () => {
    const adminError = read("app/admin/error.tsx");
    const controlError = read("app/control/error.tsx");

    expect(adminError).toContain('scope.setTag("jalvoro.surface", "command-center")');
    expect(adminError).toContain('scope.setTag("jalvoro.boundary", "admin-error")');
    expect(controlError).toContain('scope.setTag("jalvoro.surface", "control-plane")');
    expect(controlError).toContain('scope.setTag("jalvoro.boundary", "control-error")');
    expect(adminError).toContain('scope.setTag("next.error_digest"');
    expect(controlError).toContain('scope.setTag("next.error_digest"');
    expect(adminError).not.toContain("setExtra(");
    expect(controlError).not.toContain("setExtra(");
  });

  it("keeps Sentry PII and replay collection disabled", () => {
    const clientConfig = read("instrumentation-client.ts");
    const serverConfig = read("sentry.server.config.ts");
    const edgeConfig = read("sentry.edge.config.ts");
    const sharedConfig = read("sentry.shared.config.ts");

    expect(clientConfig).toContain("sendDefaultPii: false");
    expect(clientConfig).toContain("replaysSessionSampleRate: 0");
    expect(clientConfig).toContain("replaysOnErrorSampleRate: 0");
    expect(serverConfig).toContain("sendDefaultPii: false");
    expect(edgeConfig).toContain("sendDefaultPii: false");
    expect(sharedConfig).toContain("delete event.user");
    expect(sharedConfig).toContain("delete event.request.headers");
    expect(sharedConfig).toContain("delete event.request.url");
  });
});
