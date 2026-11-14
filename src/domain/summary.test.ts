import { describe, expect, it } from "vitest";
import { emptyBill, type Bill } from "./bill";
import { settle } from "./settle";
import { computeTotals } from "./split";
import { balanceNote, buildSummary, settlementBlockers } from "./summary";

const bill: Bill = {
  ...emptyBill(),
  title: "Friday dinner",
  people: [
    { id: "ana", name: "Ana" },
    { id: "ben", name: "Ben" },
    { id: "cy", name: "Cy" },
  ],
  items: [
    { id: "i1", name: "Sisig", priceCentavos: 30_000, sharedBy: ["ana"] },
    { id: "i2", name: "Bulalo", priceCentavos: 40_000, sharedBy: ["ben"] },
    { id: "i3", name: "Rice", priceCentavos: 0, sharedBy: ["cy"] },
  ],
  payments: [
    { personId: "ana", handedCentavos: 100_000 },
    { personId: "ben", handedCentavos: 10_000 },
  ],
};

function notesFor(target: Bill): string[] {
  return settle(target, computeTotals(target)).balances.map(balanceNote);
}

describe("balanceNote", () => {
  it("describes each person after change is returned", () => {
    expect(notesFor(bill)).toEqual([
      "Paid ₱600.00, gets back ₱300.00",
      "Paid ₱100.00, still owes ₱300.00",
      "Nothing to pay",
    ]);
  });

  it("covers someone who paid nothing and someone who paid exactly their share", () => {
    const exact = {
      ...bill,
      payments: [
        { personId: "ana", handedCentavos: 30_000 },
        { personId: "cy", handedCentavos: 40_000 },
      ],
    };
    expect(notesFor(exact)).toEqual([
      "Paid ₱300.00, all square",
      "Owes ₱400.00",
      "Paid ₱400.00, gets back ₱400.00",
    ]);
  });
});

describe("buildSummary", () => {
  it("lists shares, payments, change and who pays whom", () => {
    const totals = computeTotals(bill);
    expect(buildSummary(bill, totals, settle(bill, totals))).toBe(
      [
        "Friday dinner",
        "Total: ₱700.00",
        "",
        "Shares",
        "Ana: ₱300.00",
        "Ben: ₱400.00",
        "Cy: ₱0.00",
        "",
        "Paid the restaurant",
        "Ana: ₱1,000.00",
        "Ben: ₱100.00",
        "Change: ₱400.00 back to Ana",
        "",
        "Who pays whom",
        "Ben pays Ana ₱300.00",
      ].join("\n"),
    );
  });

  it("says what is missing when the bill is not fully paid", () => {
    const unpaid = { ...bill, payments: [] };
    const totals = computeTotals(unpaid);
    const settlement = settle(unpaid, totals);
    expect(settlementBlockers(totals, settlement)).toHaveLength(1);
    expect(buildSummary(unpaid, totals, settlement)).toContain("Not settled yet");
  });
});
