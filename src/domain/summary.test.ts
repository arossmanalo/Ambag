import { describe, expect, it } from "vitest";
import { emptyBill, type Bill } from "./bill";
import { settle } from "./settle";
import { computeTotals } from "./split";
import {
  accountForCopy,
  billStatus,
  balanceNote,
  buildSummary,
  formatPayTo,
  settlementBlockers,
} from "./summary";

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

  it("adds where to send money and marks transfers already paid", () => {
    const withDetails: Bill = {
      ...bill,
      people: bill.people.map((person) =>
        person.id === "ana" ? { ...person, payTo: { method: "gcash", account: "0917" } } : person,
      ),
      items: [...bill.items, { id: "i4", name: "Halo-halo", priceCentavos: 10_000, sharedBy: ["cy"] }],
    };
    const unpaidLines = summaryLines(withDetails);
    expect(unpaidLines).toContain("Ben pays Ana ₱300.00 via GCash 0917");
    expect(unpaidLines).toContain("Cy pays Ana ₱100.00 via GCash 0917");

    const benPaid = {
      ...withDetails,
      paidTransfers: [{ fromPersonId: "ben", toPersonId: "ana", amountCentavos: 30_000 }],
    };
    const paidLines = summaryLines(benPaid);
    expect(paidLines).toContain("Ben paid Ana ₱300.00");
    expect(paidLines).toContain("Cy pays Ana ₱100.00 via GCash 0917");
  });
});

function summaryLines(target: Bill): string[] {
  const totals = computeTotals(target);
  return buildSummary(target, totals, settle(target, totals)).split("\n");
}

describe("balanceNote after paid marks", () => {
  it("reports what is left once some transfers are ticked", () => {
    const withCy: Bill = {
      ...bill,
      items: [...bill.items, { id: "i4", name: "Halo-halo", priceCentavos: 10_000, sharedBy: ["cy"] }],
      paidTransfers: [{ fromPersonId: "ben", toPersonId: "ana", amountCentavos: 30_000 }],
    };
    expect(notesFor(withCy)).toEqual([
      "Paid ₱700.00, still to get back ₱100.00",
      "Paid ₱100.00, all settled",
      "Owes ₱100.00",
    ]);
  });
});

describe("billStatus", () => {
  function statusOf(target: Bill) {
    const totals = computeTotals(target);
    return billStatus(totals, settle(target, totals));
  }

  it("follows a bill from missing payments to fully paid", () => {
    expect(statusOf({ ...bill, payments: [] })).toEqual({ label: "Not settled yet", tone: "blocked" });
    expect(statusOf(bill)).toEqual({ label: "1 payment left", tone: "open" });
    const paid = {
      ...bill,
      paidTransfers: [{ fromPersonId: "ben", toPersonId: "ana", amountCentavos: 30_000 }],
    };
    expect(statusOf(paid)).toEqual({ label: "All payments made", tone: "done" });
  });

  it("says when nobody owes anything", () => {
    const square = {
      ...bill,
      payments: [
        { personId: "ana", handedCentavos: 30_000 },
        { personId: "ben", handedCentavos: 40_000 },
      ],
    };
    expect(statusOf(square)).toEqual({ label: "Everyone is settled", tone: "done" });
  });
});

describe("accountForCopy", () => {
  it("copies a bare mobile number for wallets and bank details as typed", () => {
    expect(accountForCopy({ method: "gcash", account: "0917 123-4567" })).toBe("09171234567");
    expect(accountForCopy({ method: "maya", account: "0918 000 0000" })).toBe("09180000000");
    expect(accountForCopy({ method: "bank", account: "BPI 1234 5678 90" })).toBe(
      "BPI 1234 5678 90",
    );
  });
});

describe("formatPayTo", () => {
  it("names the wallet, except for free-form details", () => {
    expect(formatPayTo({ method: "maya", account: "0918 000 0000" })).toBe("Maya 0918 000 0000");
    expect(formatPayTo({ method: "other", account: "BPI 1234 5678 90" })).toBe("BPI 1234 5678 90");
  });
});
