import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const migration = readFileSync(
  resolve(
    projectRoot,
    "supabase/migrations/20260726120000_disable_business_document_uploads_until_scanning.sql",
  ),
  "utf8",
);
const workspace = readFileSync(
  resolve(projectRoot, "components/business/BusinessDocumentsWorkspace.tsx"),
  "utf8",
);

describe("business document launch upload scope", () => {
  it("denies direct storage inserts and revokes internal upload execution", () => {
    expect(migration).toContain("with check (false)");
    expect(migration).toContain(
      "revoke execute on function private.prepare_business_document_upload_internal",
    );
    expect(migration).toContain(
      "revoke execute on function private.finalize_business_document_upload_internal",
    );
  });

  it("keeps the client upload controls unavailable", () => {
    expect(workspace).toContain(
      "const BUSINESS_DOCUMENT_UPLOADS_ENABLED = false",
    );
    expect(workspace).toContain(
      "New uploads are temporarily disabled",
    );
  });
});
