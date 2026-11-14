import { describe, expect, it } from "vitest";
import { billSchema, emptyBill, type Bill } from "../domain/bill";
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

describe("billReducer", () => {
  it("takes a removed person off every order and payment", () => {
    const next = billReducer(bill, { type: "removePerson", personId: "ben" });
    expect(next.people).toEqual([{ id: "ana", name: "Ana" }]);
    expect(next.items[0].sharedBy).toEqual(["ana"]);
    expect(next.payments).toEqual([]);
    expect(billSchema.safeParse(next).success).toBe(true);
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
