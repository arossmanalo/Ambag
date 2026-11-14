import { describe, expect, it } from "vitest";
import { emptyBill, type Bill } from "./bill";
import { computeTotals, splitEvenly, splitProportionally } from "./split";

function billWith(overrides: Partial<Bill>): Bill {
  return {
    ...emptyBill(),
    people: [
      { id: "ana", name: "Ana" },
      { id: "ben", name: "Ben" },
      { id: "cy", name: "Cy" },
    ],
    ...overrides,
  };
}

function sum(values: Iterable<number>): number {
  return [...values].reduce((total, value) => total + value, 0);
}

describe("splitEvenly", () => {
  it("gives leftover centavos to the first parts", () => {
    expect(splitEvenly(10_000, 3)).toEqual([3_334, 3_333, 3_333]);
    expect(splitEvenly(1, 2)).toEqual([1, 0]);
    expect(splitEvenly(0, 2)).toEqual([0, 0]);
  });
});

describe("splitProportionally", () => {
  it("returns the weights themselves when the amount equals their sum", () => {
    expect(splitProportionally(600, [100, 200, 300])).toEqual([100, 200, 300]);
  });

  it("always sums to the amount", () => {
    const parts = splitProportionally(1_000, [1, 1, 1]);
    expect(parts).toEqual([334, 333, 333]);
    expect(sum(splitProportionally(99_999_999_999, [7, 11, 13]))).toBe(99_999_999_999);
  });

  it("gives the extra centavo to the largest remainder", () => {
    expect(splitProportionally(10, [1, 2])).toEqual([3, 7]);
  });

  it("splits evenly when every weight is zero", () => {
    expect(splitProportionally(100, [0, 0])).toEqual([50, 50]);
  });
});

describe("computeTotals", () => {
  it("charges each person for their own items and splits shared ones", () => {
    const totals = computeTotals(
      billWith({
        items: [
          { id: "i1", name: "Sisig", priceCentavos: 30_000, sharedBy: ["ana"] },
          { id: "i2", name: "Pitcher", priceCentavos: 10_000, sharedBy: ["ana", "ben", "cy"] },
        ],
      }),
    );
    expect(totals.totalCentavos).toBe(40_000);
    expect(totals.shareByPerson.get("ana")).toBe(33_334);
    expect(totals.shareByPerson.get("ben")).toBe(3_333);
    expect(totals.shareByPerson.get("cy")).toBe(3_333);
  });

  it("spreads a percent service charge in proportion to what each ordered", () => {
    const totals = computeTotals(
      billWith({
        items: [
          { id: "i1", name: "Steak", priceCentavos: 100_000, sharedBy: ["ana"] },
          { id: "i2", name: "Rice", priceCentavos: 50_000, sharedBy: ["ben"] },
        ],
        serviceCharge: { kind: "percent", basisPoints: 1_000 },
      }),
    );
    expect(totals.serviceChargeCentavos).toBe(15_000);
    expect(totals.totalCentavos).toBe(165_000);
    expect(totals.shareByPerson.get("ana")).toBe(110_000);
    expect(totals.shareByPerson.get("ben")).toBe(55_000);
    expect(totals.shareByPerson.get("cy")).toBe(0);
  });

  it("keeps shares summing to the total when the adjustment does not divide cleanly", () => {
    const totals = computeTotals(
      billWith({
        items: [
          { id: "i1", name: "A", priceCentavos: 3_333, sharedBy: ["ana"] },
          { id: "i2", name: "B", priceCentavos: 3_333, sharedBy: ["ben"] },
          { id: "i3", name: "C", priceCentavos: 3_334, sharedBy: ["cy"] },
        ],
        discount: { kind: "amount", centavos: 100 },
      }),
    );
    expect(totals.totalCentavos).toBe(9_900);
    expect(sum(totals.shareByPerson.values())).toBe(9_900);
  });

  it("never lets a discount push the total below zero", () => {
    const totals = computeTotals(
      billWith({
        items: [{ id: "i1", name: "A", priceCentavos: 5_000, sharedBy: ["ana"] }],
        discount: { kind: "amount", centavos: 9_000 },
      }),
    );
    expect(totals.discountCentavos).toBe(5_000);
    expect(totals.totalCentavos).toBe(0);
  });

  it("reports items nobody is assigned to", () => {
    const totals = computeTotals(
      billWith({
        items: [{ id: "i1", name: "Mystery", priceCentavos: 5_000, sharedBy: [] }],
      }),
    );
    expect(totals.unassignedItemIds).toEqual(["i1"]);
    expect(totals.totalCentavos).toBe(5_000);
  });

  it("handles a bill with no people or items", () => {
    const totals = computeTotals(emptyBill());
    expect(totals.totalCentavos).toBe(0);
    expect(totals.shareByPerson.size).toBe(0);
  });
});
