export type VerifiedImageFormat = "jpeg" | "png" | "webp";

export type VerifiedImageMetadata = {
  format: VerifiedImageFormat;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
};

const EXECUTABLE_MARKERS = [
  new Uint8Array([0x4d, 0x5a]),
  new Uint8Array([0x7f, 0x45, 0x4c, 0x46]),
  new TextEncoder().encode("#!"),
  new TextEncoder().encode("<script"),
  new TextEncoder().encode("<html"),
  new TextEncoder().encode("<?php"),
];

function startsWith(bytes: Uint8Array, signature: Uint8Array) {
  return bytes.length >= signature.length &&
    signature.every((value, index) => bytes[index] === value);
}

function includesMarker(bytes: Uint8Array, marker: Uint8Array) {
  if (marker.length === 0 || bytes.length < marker.length) return false;
  for (let offset = 0; offset <= bytes.length - marker.length; offset += 1) {
    if (marker.every((value, index) => bytes[offset + index] === value)) {
      return true;
    }
  }
  return false;
}

function detectedFormat(bytes: Uint8Array): VerifiedImageFormat | null {
  if (startsWith(bytes, new Uint8Array([0xff, 0xd8, 0xff]))) return "jpeg";
  if (startsWith(bytes, new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (
    bytes.length >= 12 &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  ) return "webp";
  return null;
}

export function verifyImageUploadMetadata({
  bytes,
  clientContentType,
  filename,
}: {
  bytes: Uint8Array;
  clientContentType: string;
  filename: string;
}): VerifiedImageMetadata | null {
  if (bytes.length === 0) return null;
  const inspectionWindow = bytes.slice(0, Math.min(bytes.length, 4096));
  if (EXECUTABLE_MARKERS.some((marker) => includesMarker(inspectionWindow, marker))) return null;

  const format = detectedFormat(bytes);
  if (!format) return null;
  const expected = {
    jpeg: { contentType: "image/jpeg", extensions: ["jpg", "jpeg"], extension: "jpg" },
    png: { contentType: "image/png", extensions: ["png"], extension: "png" },
    webp: { contentType: "image/webp", extensions: ["webp"], extension: "webp" },
  } as const;
  const contract = expected[format];
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  if (
    clientContentType.toLowerCase() !== contract.contentType ||
    !contract.extensions.some((candidate) => candidate === extension)
  ) return null;

  return {
    format,
    contentType: contract.contentType,
    extension: contract.extension,
  };
}
