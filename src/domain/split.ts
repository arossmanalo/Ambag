import type { Adjustment, Bill } from "./bill";

export type BillTotals = {
  subtotalCentavos: number;
  serviceChargeCentavos: number;
  /** The discount actually applied; never more than subtotal plus service charge. */
  discountCentavos: number;
  totalCentavos: number;
  /** What each person owes for the meal, keyed by person id. Sums to the total. */
  shareByPerson: Map<string, number>;
  /** Items nobody is assigned to. While any exist the shares are incomplete. */
  unassignedItemIds: string[];
};

/** Splits an amount into equal parts; leftover centavos go one each to the first parts. */
export function splitEvenly(amountCentavos: number, parts: number): number[] {
  const base = Math.floor(amountCentavos / parts);
  const leftover = amountCentavos - base * parts;
  return Array.from({ length: parts }, (_, index) => base + (index < leftover ? 1 : 0));
}

/**
 * Splits an amount in proportion to the weights (largest-remainder method),
 * so the parts always sum exactly to the amount.
 */
export function splitProportionally(amountCentavos: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight === 0) {
    return splitEvenly(amountCentavos, weights.length);
  }
  const amount = BigInt(amountCentavos);
  const divisor = BigInt(totalWeight);
  const parts = weights.map((weight, index) => {
    const product = amount * BigInt(weight);
    return { index, floor: Number(product / divisor), remainder: product % divisor };
  });
  const allocated = parts.reduce((sum, part) => sum + part.floor, 0);
  const result = parts.map((part) => part.floor);
  const byRemainder = [...parts].sort((a, b) => {
    if (a.remainder === b.remainder) {
      return a.index - b.index;
    }
    return a.remainder > b.remainder ? -1 : 1;
  });
  for (const part of byRemainder.slice(0, amountCentavos - allocated)) {
    result[part.index] += 1;
  }
  return result;
}

function adjustmentAmount(adjustment: Adjustment | null, baseCentavos: number): number {
  if (adjustment === null) {
    return 0;
  }
  if (adjustment.kind === "amount") {
    return adjustment.centavos;
  }
  return Math.round((baseCentavos * adjustment.basisPoints) / 10_000);
}

export function computeTotals(bill: Bill): BillTotals {
  const itemSubtotalByPerson = new Map(bill.people.map((person) => [person.id, 0]));
  const unassignedItemIds: string[] = [];
  let subtotalCentavos = 0;

  for (const item of bill.items) {
    subtotalCentavos += item.priceCentavos;
    if (item.sharedBy.length === 0) {
      unassignedItemIds.push(item.id);
      continue;
    }
    const parts = splitEvenly(item.priceCentavos, item.sharedBy.length);
    item.sharedBy.forEach((personId, index) => {
      const current = itemSubtotalByPerson.get(personId) ?? 0;
      itemSubtotalByPerson.set(personId, current + parts[index]);
    });
  }

  const serviceChargeCentavos = adjustmentAmount(bill.serviceCharge, subtotalCentavos);
  const discountCentavos = Math.min(
    adjustmentAmount(bill.discount, subtotalCentavos),
    subtotalCentavos + serviceChargeCentavos,
  );
  const totalCentavos = subtotalCentavos + serviceChargeCentavos - discountCentavos;

  const personIds = bill.people.map((person) => person.id);
  const weights = personIds.map((id) => itemSubtotalByPerson.get(id) ?? 0);
  const shares = personIds.length > 0 ? splitProportionally(totalCentavos, weights) : [];
  const shareByPerson = new Map(personIds.map((id, index) => [id, shares[index]]));

  return {
    subtotalCentavos,
    serviceChargeCentavos,
    discountCentavos,
    totalCentavos,
    shareByPerson,
    unassignedItemIds,
  };
}
