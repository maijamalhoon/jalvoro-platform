import { createHash } from "node:crypto";

const PWNED_PASSWORDS_RANGE_URL = "https://api.pwnedpasswords.com/range";
const RANGE_CACHE_SECONDS = 6 * 60 * 60;
const RANGE_TIMEOUT_MS = 4_000;
const MAX_RANGE_RESPONSE_LENGTH = 100_000;

export type PwnedPasswordHashRange = {
  prefix: string;
  suffix: string;
};

export function createPwnedPasswordHashRange(
  password: string,
): PwnedPasswordHashRange {
  // SHA-1 is mandated only for the HIBP k-anonymity range protocol. This
  // digest is never used to store, authenticate, or derive a password.
  // lgtm[js/insufficient-password-hash]
  const hash = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  return {
    prefix: hash.slice(0, 5),
    suffix: hash.slice(5),
  };
}

export function findPwnedPasswordCount(responseText: string, suffix: string) {
  const expectedSuffix = suffix.toUpperCase();

  for (const line of responseText.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator <= 0) continue;

    const candidateSuffix = line.slice(0, separator).trim().toUpperCase();
    if (candidateSuffix !== expectedSuffix) continue;

    const count = Number.parseInt(line.slice(separator + 1).trim(), 10);
    return Number.isFinite(count) && count > 0 ? count : 0;
  }

  return 0;
}

export async function getPwnedPasswordCount(password: string) {
  const { prefix, suffix } = createPwnedPasswordHashRange(password);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RANGE_TIMEOUT_MS);

  try {
    const response = await fetch(`${PWNED_PASSWORDS_RANGE_URL}/${prefix}`, {
      method: "GET",
      headers: {
        Accept: "text/plain",
        "Add-Padding": "true",
        "User-Agent": "JALVORO-Password-Protection",
      },
      signal: controller.signal,
      next: { revalidate: RANGE_CACHE_SECONDS },
    });

    if (!response.ok) {
      throw new Error(`Pwned Passwords lookup failed with status ${response.status}.`);
    }

    const responseText = await response.text();
    if (responseText.length > MAX_RANGE_RESPONSE_LENGTH) {
      throw new Error("Pwned Passwords lookup returned an invalid response size.");
    }

    return findPwnedPasswordCount(responseText, suffix);
  } finally {
    clearTimeout(timeout);
  }
}
