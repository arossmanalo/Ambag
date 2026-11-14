import { describe, expect, it } from "vitest";
import { billSchema } from "./bill";

/** A bill as saved before payment details and paid marks existed. */
const savedBeforePaidMarks = {
  version: 1,
  title: "Friday dinner",
  people: [
    { id: "ana", name: "Ana" },
    { id: "ben", name: "Ben" },
  ],
  items: [{ id: "i1", name: "Sisig", priceCentavos: 30_000, sharedBy: ["ana", "ben"] }],
  serviceCharge: null,
  discount: null,
  payments: [{ personId: "ana", handedCentavos: 30_000 }],
};

describe("billSchema", () => {
  it("still reads bills saved before paid marks existed", () => {
    const parsed = billSchema.safeParse(savedBeforePaidMarks);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.paidTransfers).toEqual([]);
    expect(parsed.data?.people[0].payTo).toBeUndefined();
  });

  it("keeps an account number as typed, leading zero included", () => {
    const parsed = billSchema.safeParse({
      ...savedBeforePaidMarks,
      people: [{ id: "ana", name: "Ana", payTo: { method: "gcash", account: "09171234567" } }],
      items: [],
      payments: [],
    });
    expect(parsed.data?.people[0].payTo?.account).toBe("09171234567");
  });

  it("rejects a paid mark naming someone who is not on the bill", () => {
    const parsed = billSchema.safeParse({
      ...savedBeforePaidMarks,
      paidTransfers: [{ fromPersonId: "ghost", toPersonId: "ana", amountCentavos: 100 }],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an unknown payment method", () => {
    const parsed = billSchema.safeParse({
      ...savedBeforePaidMarks,
      people: [{ id: "ana", name: "Ana", payTo: { method: "paypal", account: "x" } }],
      items: [],
      payments: [],
    });
    expect(parsed.success).toBe(false);
  });
});
