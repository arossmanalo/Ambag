import { useEffect, useRef, useState } from "react";
import { emptyBill, isBillEmpty, newId, type Bill } from "../domain/bill";
import {
  LIBRARY_KEY,
  loadLibrary,
  parseLibrary,
  saveLibrary,
  type SavedBill,
} from "../storage/localBill";
import { billReducer, type BillAction } from "./billReducer";

/** Every bill kept on this device, saved to the browser after every change. */
export function useBillLibrary() {
  const [bills, setBills] = useState(() => loadLibrary());
  // Handlers read the latest list from here, so two changes in one event both land.
  const billsRef = useRef(bills);

  function commit(next: SavedBill[]) {
    billsRef.current = next;
    saveLibrary(next);
    setBills(next);
  }

  useEffect(() => {
    // Another tab changed the bills; take its list so this tab does not overwrite it.
    function adoptOtherTab(event: StorageEvent) {
      if (event.key === LIBRARY_KEY) {
        const next = parseLibrary(event.newValue);
        billsRef.current = next;
        setBills(next);
      }
    }
    window.addEventListener("storage", adoptOtherTab);
    return () => window.removeEventListener("storage", adoptOtherTab);
  }, []);

  /** Adds a bill and returns its id. */
  function createBill(bill: Bill = emptyBill()): string {
    const at = new Date().toISOString();
    const id = newId();
    commit([{ id, createdAt: at, updatedAt: at, bill }, ...billsRef.current]);
    return id;
  }

  function updateBill(id: string, action: BillAction) {
    const current = billsRef.current;
    const entry = current.find((saved) => saved.id === id);
    if (entry === undefined) {
      return;
    }
    const bill = billReducer(entry.bill, action);
    if (bill === entry.bill) {
      return;
    }
    const updatedAt = new Date().toISOString();
    commit(current.map((saved) => (saved.id === id ? { ...saved, bill, updatedAt } : saved)));
  }

  function deleteBill(id: string) {
    commit(billsRef.current.filter((saved) => saved.id !== id));
  }

  /** Drops a bill nobody wrote anything on, so it does not clutter the list. */
  function discardIfBlank(id: string) {
    const entry = billsRef.current.find((saved) => saved.id === id);
    if (entry !== undefined && isBillEmpty(entry.bill)) {
      deleteBill(id);
    }
  }

  return { bills, createBill, updateBill, deleteBill, discardIfBlank };
}
