import { describe, expect, it } from "vitest";
import { billSchema, emptyBill, type Bill } from "../domain/bill";
import type { Transfer } from "../domain/settle";
import { billReducer } from "./billReducer";

const bill: Bill = {
  ...emptyBill(),
  people: [
    { id: "ana", name: "Ana" },
    { id: "ben", name: "Ben" },
  ],
  items: [{ id: "i1", name: "Sisig", priceCentavos: 30_000, sharedBy: ["ana", "ben"] }],
  payments: [{ personId: "ben", handedCentavos: 30_000 }],
};

const anaPaidBen = { fromPersonId: "ana", toPersonId: "ben", amountCentavos: 15_000 };

describe("billReducer", () => {
  it("takes a removed person off every order, payment and paid mark", () => {
    const marked = billReducer(bill, { type: "toggleTransferPaid", transfer: anaPaidBen });
    const next = billReducer(marked, { type: "removePerson", personId: "ben" });
    expect(next.people).toEqual([{ id: "ana", name: "Ana" }]);
    expect(next.items[0].sharedBy).toEqual(["ana"]);
    expect(next.payments).toEqual([]);
    expect(next.paidTransfers).toEqual([]);
    expect(billSchema.safeParse(next).success).toBe(true);
  });

  it("ticks a transfer as paid and unticks it again", () => {
    const marked = billReducer(bill, { type: "toggleTransferPaid", transfer: anaPaidBen });
    expect(marked.paidTransfers).toEqual([anaPaidBen]);
    const unmarked = billReducer(marked, { type: "toggleTransferPaid", transfer: anaPaidBen });
    expect(unmarked.paidTransfers).toEqual([]);
  });

  it("stores only who, to whom and how much for a paid mark", () => {
    // The settle-up panel passes a whole Transfer, which also carries isPaid.
    const transfer: Transfer = { ...anaPaidBen, isPaid: false };
    const marked = billReducer(bill, { type: "toggleTransferPaid", transfer });
    expect(marked.paidTransfers).toEqual([anaPaidBen]);
  });

  it("sets and clears where a person receives money", () => {
    const payTo = { method: "gcash" as const, account: "0917 123 4567" };
    const set = billReducer(bill, { type: "setPayTo", personId: "ana", payTo });
    expect(set.people[0]).toEqual({ id: "ana", name: "Ana", payTo });
    const cleared = billReducer(set, { type: "setPayTo", personId: "ana", payTo: null });
    expect(cleared.people[0]).toEqual({ id: "ana", name: "Ana" });
  });

  it("keeps one payment per person and drops it at zero", () => {
    const raised = billReducer(bill, { type: "setPayment", personId: "ben", handedCentavos: 50_000 });
    expect(raised.payments).toEqual([{ personId: "ben", handedCentavos: 50_000 }]);
    const cleared = billReducer(raised, { type: "setPayment", personId: "ben", handedCentavos: 0 });
    expect(cleared.payments).toEqual([]);
  });

  it("toggles a person on and off an order", () => {
    const off = billReducer(bill, { type: "toggleSharer", itemId: "i1", personId: "ana" });
    expect(off.items[0].sharedBy).toEqual(["ben"]);
    const on = billReducer(off, { type: "toggleSharer", itemId: "i1", personId: "ana" });
    expect(on.items[0].sharedBy).toEqual(["ben", "ana"]);
  });

  it("adds a new order with the people picked for it", () => {
    const next = billReducer(bill, {
      type: "addItem",
      id: "i2",
      name: "Rice",
      priceCentavos: 5_000,
      sharedBy: ["ben"],
    });
    expect(next.items[1]).toEqual({
      id: "i2",
      name: "Rice",
      priceCentavos: 5_000,
      sharedBy: ["ben"],
    });
  });
});
