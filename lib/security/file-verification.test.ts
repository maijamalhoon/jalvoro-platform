import { describe, expect, it } from "vitest";

import { verifyImageUploadMetadata } from "./file-verification";

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0, 1]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const webp = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50,
]);

describe("server image upload metadata verification", () => {
  it.each([
    [jpeg, "image/jpeg", "avatar.jpg", "jpeg"],
    [png, "image/png", "avatar.png", "png"],
    [webp, "image/webp", "avatar.webp", "webp"],
  ] as const)("accepts matching signatures, MIME and extensions", (bytes, type, name, format) => {
    expect(verifyImageUploadMetadata({ bytes, clientContentType: type, filename: name })).toMatchObject({ format });
  });

  it("rejects a MIME mismatch", () => {
    expect(verifyImageUploadMetadata({ bytes: png, clientContentType: "image/jpeg", filename: "avatar.png" })).toBeNull();
  });

  it("rejects an extension mismatch", () => {
    expect(verifyImageUploadMetadata({ bytes: jpeg, clientContentType: "image/jpeg", filename: "avatar.png" })).toBeNull();
  });

  it("rejects corrupt and unknown content", () => {
    expect(verifyImageUploadMetadata({
      bytes: new TextEncoder().encode("not an image"),
      clientContentType: "image/png",
      filename: "avatar.png",
    })).toBeNull();
  });

  it("rejects executable and script markers before decoding", () => {
    const polyglot = new Uint8Array([...jpeg, ...new TextEncoder().encode("<script>alert(1)</script>")]);
    expect(verifyImageUploadMetadata({
      bytes: polyglot,
      clientContentType: "image/jpeg",
      filename: "avatar.jpg",
    })).toBeNull();
  });
});
