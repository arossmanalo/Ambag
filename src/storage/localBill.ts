import { z } from "zod";
import { billSchema, isBillEmpty, newId, type Bill } from "../domain/bill";

/** Also the key other tabs' writes arrive under, for keeping two open tabs in step. */
export const LIBRARY_KEY = "ambag:bills:v1";
/** Where the app kept its single bill before it could hold several. */
const LEGACY_KEY = "ambag:bill:v1";

const savedBillSchema = z.object({
  id: z.string().min(1).max(64),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  bill: billSchema,
});

/** One bill kept on this device. Times are UTC ISO strings. */
export type SavedBill = z.infer<typeof savedBillSchema>;

type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** False in browsers that block storage (some private modes), where bills cannot be kept. */
export function isStorageAvailable(): boolean {
  try {
    const probeKey = "ambag:probe";
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads the saved list. A bill that no longer passes validation is left out
 * on its own, so one damaged entry does not hide the others.
 */
export function parseLibrary(text: string | null): SavedBill[] {
  if (text === null) {
    return [];
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    // Not JSON at all, so there is nothing to recover.
    return [];
  }
  if (!Array.isArray(raw)) {
    return [];
  }
  const bills: SavedBill[] = [];
  const seenIds = new Set<string>();
  for (const entry of raw) {
    const parsed = savedBillSchema.safeParse(entry);
    if (parsed.success && !seenIds.has(parsed.data.id)) {
      seenIds.add(parsed.data.id);
      bills.push(parsed.data);
    }
  }
  return bills;
}

function parseLegacyBill(text: string): Bill | null {
  try {
    const parsed = billSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    // The old bill was not readable JSON; it could not have been opened either.
    return null;
  }
}

/** Turns the one bill saved by earlier versions into the first entry of the list. */
function migrateLegacyBill(store: KeyValueStore, now: Date): SavedBill[] {
  const legacyText = store.getItem(LEGACY_KEY);
  if (legacyText === null) {
    return [];
  }
  const legacy = parseLegacyBill(legacyText);
  const at = now.toISOString();
  const bills =
    legacy === null || isBillEmpty(legacy)
      ? []
      : [{ id: newId(), createdAt: at, updatedAt: at, bill: legacy }];
  store.setItem(LIBRARY_KEY, JSON.stringify(bills));
  store.removeItem(LEGACY_KEY);
  return bills;
}

export function loadLibrary(
  store: KeyValueStore = window.localStorage,
  now: Date = new Date(),
): SavedBill[] {
  try {
    const text = store.getItem(LIBRARY_KEY);
    return text === null ? migrateLegacyBill(store, now) : parseLibrary(text);
  } catch {
    // Storage is blocked. The app warns about this (isStorageAvailable) and starts empty.
    return [];
  }
}

export function saveLibrary(bills: SavedBill[], store: KeyValueStore = window.localStorage): void {
  try {
    store.setItem(LIBRARY_KEY, JSON.stringify(bills));
  } catch {
    // Storage is blocked or full. The app warns when storage is blocked, and the
    // bills still work for this visit.
  }
}
