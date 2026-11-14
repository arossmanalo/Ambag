import { billSchema, type Bill } from "../domain/bill";

const HASH_PREFIX = "#b=";

export type LinkContent =
  | { kind: "none" }
  | { kind: "bill"; bill: Bill }
  | { kind: "invalid" };

/** The bill as URL-safe base64 of its JSON. */
export function encodeBill(bill: Bill): string {
  const bytes = new TextEncoder().encode(JSON.stringify(bill));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeBill(encoded: string): Bill | null {
  try {
    const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const parsed = billSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    // Not base64, not UTF-8 or not JSON: the link was cut off or altered.
    return null;
  }
}

/**
 * The bill travels in the URL hash, which browsers never send to a server.
 */
export function buildShareUrl(bill: Bill, pageUrl: string): string {
  return `${pageUrl.split("#")[0]}${HASH_PREFIX}${encodeBill(bill)}`;
}

export function readBillFromHash(hash: string): LinkContent {
  if (!hash.startsWith(HASH_PREFIX)) {
    return { kind: "none" };
  }
  const bill = decodeBill(hash.slice(HASH_PREFIX.length));
  return bill === null ? { kind: "invalid" } : { kind: "bill", bill };
}
