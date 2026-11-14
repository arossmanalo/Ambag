import { useEffect, useReducer } from "react";
import { emptyBill } from "../domain/bill";
import { loadSavedBill, saveBill } from "../storage/localBill";
import { billReducer } from "./billReducer";

/** The bill being edited on this device, saved to the browser after every change. */
export function useBill() {
  const [bill, dispatch] = useReducer(
    billReducer,
    undefined,
    () => loadSavedBill() ?? emptyBill(),
  );

  useEffect(() => {
    saveBill(bill);
  }, [bill]);

  return { bill, dispatch };
}
