import { billSchema, type Bill } from "../domain/bill";

const STORAGE_KEY = "ambag:bill:v1";

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

export function loadSavedBill(): Bill | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      return null;
    }
    const parsed = billSchema.safeParse(JSON.parse(saved));
    return parsed.success ? parsed.data : null;
  } catch {
    // Storage is blocked or the saved text is not JSON: start with a blank bill.
    return null;
  }
}

export function saveBill(bill: Bill): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bill));
  } catch {
    // Storage is blocked. The app warns about this once at startup (isStorageAvailable),
    // and the bill still works for this visit.
  }
}
