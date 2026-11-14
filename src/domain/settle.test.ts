import { describe, expect, it } from "vitest";
import { emptyBill, type Bill } from "./bill";
import { settle } from "./settle";
import { computeTotals } from "./split";

const people = [
  { id: "ana", name: "Ana" },
  { id: "ben", name: "Ben" },
  { id: "cy", name: "Cy" },
  { id: "di", name: "Di" },
];

/** The dinner that started this app: a ₱1,500 bill, each paying for their own order. */
const dinnerItems = [
  { id: "i1", name: "Ana's order", priceCentavos: 30_000, sharedBy: ["ana"] },
  { id: "i2", name: "Ben's order", priceCentavos: 40_000, sharedBy: ["ben"] },
  { id: "i3", name: "Cy's order", priceCentavos: 45_000, sharedBy: ["cy"] },
  { id: "i4", name: "Di's order", priceCentavos: 35_000, sharedBy: ["di"] },
];

function settleBill(overrides: Partial<Bill>) {
  const bill = { ...emptyBill(), people, items: dinnerItems, ...overrides };
  return settle(bill, computeTotals(bill));
}

describe("settle", () => {
  it("resolves the dinner where two friends fronted 1,000 and 500", () => {
    const result = settleBill({
      payments: [
        { personId: "ana", handedCentavos: 100_000 },
        { personId: "ben", handedCentavos: 50_000 },
      ],
    });
    expect(result.changeTotalCentavos).toBe(0);
    expect(result.unpaidCentavos).toBe(0);
    expect(result.transfers).toEqual([
      { fromPersonId: "cy", toPersonId: "ana", amountCentavos: 45_000, isPaid: false },
      { fromPersonId: "di", toPersonId: "ana", amountCentavos: 25_000, isPaid: false },
      { fromPersonId: "di", toPersonId: "ben", amountCentavos: 10_000, isPaid: false },
    ]);
  });

  it("returns the change to the person who overpaid", () => {
    const result = settleBill({
      payments: [{ personId: "ana", handedCentavos: 200_000 }],
    });
    expect(result.changeTotalCentavos).toBe(50_000);
    const ana = result.balances.find((entry) => entry.personId === "ana");
    expect(ana?.changeCentavos).toBe(50_000);
    expect(ana?.balanceCentavos).toBe(120_000);
    expect(result.transfers).toEqual([
      { fromPersonId: "cy", toPersonId: "ana", amountCentavos: 45_000, isPaid: false },
      { fromPersonId: "ben", toPersonId: "ana", amountCentavos: 40_000, isPaid: false },
      { fromPersonId: "di", toPersonId: "ana", amountCentavos: 35_000, isPaid: false },
    ]);
  });

  it("gives change to the largest payer, first listed on a tie", () => {
    const result = settleBill({
      payments: [
        { personId: "ben", handedCentavos: 100_000 },
        { personId: "ana", handedCentavos: 100_000 },
      ],
    });
    const change = new Map(result.balances.map((entry) => [entry.personId, entry.changeCentavos]));
    expect(change.get("ana")).toBe(50_000);
    expect(change.get("ben")).toBe(0);
  });

  it("passes leftover change to the next payer when it exceeds what one handed over", () => {
    const result = settleBill({
      items: [{ id: "i1", name: "Coffee", priceCentavos: 50_000, sharedBy: ["cy"] }],
      payments: [
        { personId: "ana", handedCentavos: 100_000 },
        { personId: "ben", handedCentavos: 100_000 },
      ],
    });
    const change = new Map(result.balances.map((entry) => [entry.personId, entry.changeCentavos]));
    expect(change.get("ana")).toBe(100_000);
    expect(change.get("ben")).toBe(50_000);
    expect(result.transfers).toEqual([
      { fromPersonId: "cy", toPersonId: "ben", amountCentavos: 50_000, isPaid: false },
    ]);
  });

  it("holds back transfers while part of the bill is unpaid", () => {
    const result = settleBill({
      payments: [{ personId: "ana", handedCentavos: 100_000 }],
    });
    expect(result.unpaidCentavos).toBe(50_000);
    expect(result.transfers).toEqual([]);
  });

  it("holds back transfers while an item has nobody assigned", () => {
    const result = settleBill({
      items: [{ id: "i1", name: "Mystery", priceCentavos: 50_000, sharedBy: [] }],
      payments: [{ personId: "ana", handedCentavos: 50_000 }],
    });
    expect(result.transfers).toEqual([]);
  });

  it("needs no transfers when everyone paid exactly their share", () => {
    const result = settleBill({
      payments: [
        { personId: "ana", handedCentavos: 30_000 },
        { personId: "ben", handedCentavos: 40_000 },
        { personId: "cy", handedCentavos: 45_000 },
        { personId: "di", handedCentavos: 35_000 },
      ],
    });
    expect(result.transfers).toEqual([]);
    expect(result.balances.every((entry) => entry.balanceCentavos === 0)).toBe(true);
  });

  it("handles a bill with nobody on it", () => {
    const bill = emptyBill();
    expect(settle(bill, computeTotals(bill)).transfers).toEqual([]);
  });
});

describe("paid marks", () => {
  const dinnerPayments = [
    { personId: "ana", handedCentavos: 100_000 },
    { personId: "ben", handedCentavos: 50_000 },
  ];
  const cyPaidAna = { fromPersonId: "cy", toPersonId: "ana", amountCentavos: 45_000 };

  it("ticks only the transfer that was marked and keeps the others the same", () => {
    const result = settleBill({ payments: dinnerPayments, paidTransfers: [cyPaidAna] });
    expect(result.transfers.map((transfer) => transfer.isPaid)).toEqual([true, false, false]);
    expect(result.transfers.map((transfer) => transfer.amountCentavos)).toEqual([
      45_000, 25_000, 10_000,
    ]);
  });

  it("counts a paid transfer in what is still outstanding", () => {
    const result = settleBill({ payments: dinnerPayments, paidTransfers: [cyPaidAna] });
    const outstanding = new Map(
      result.balances.map((entry) => [entry.personId, entry.outstandingCentavos]),
    );
    expect(outstanding.get("ana")).toBe(25_000);
    expect(outstanding.get("cy")).toBe(0);
    expect(outstanding.get("di")).toBe(-35_000);
  });

  it("drops the tick when an edit changes the transfer amount", () => {
    const result = settleBill({
      items: dinnerItems.map((item) =>
        item.id === "i3" ? { ...item, priceCentavos: 50_000 } : item,
      ),
      payments: [
        { personId: "ana", handedCentavos: 105_000 },
        { personId: "ben", handedCentavos: 50_000 },
      ],
      paidTransfers: [cyPaidAna],
    });
    const cyToAna = result.transfers.find((transfer) => transfer.fromPersonId === "cy");
    expect(cyToAna?.amountCentavos).toBe(50_000);
    expect(cyToAna?.isPaid).toBe(false);
  });
});
