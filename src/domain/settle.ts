import type { Bill } from "./bill";
import type { BillTotals } from "./split";

export type PersonBalance = {
  personId: string;
  shareCentavos: number;
  handedCentavos: number;
  /** Change the restaurant gives back to this person. */
  changeCentavos: number;
  /** Positive: others owe this person. Negative: this person owes. */
  balanceCentavos: number;
};

export type Transfer = {
  fromPersonId: string;
  toPersonId: string;
  amountCentavos: number;
};

export type Settlement = {
  handedTotalCentavos: number;
  changeTotalCentavos: number;
  /** How much of the bill nobody has covered yet. Transfers wait until this is zero. */
  unpaidCentavos: number;
  balances: PersonBalance[];
  transfers: Transfer[];
};

/**
 * Change goes back to whoever handed over the most. If the change is more
 * than that person handed over, the rest goes to the next largest payer.
 */
function assignChange(
  bill: Bill,
  handedByPerson: Map<string, number>,
  changeTotalCentavos: number,
): Map<string, number> {
  // Starting from the people list makes ties go to whoever is listed first.
  const payersLargestFirst = bill.people
    .map((person): [string, number] => [person.id, handedByPerson.get(person.id) ?? 0])
    .sort(([, a], [, b]) => b - a);
  const changeByPerson = new Map<string, number>();
  let remaining = changeTotalCentavos;
  for (const [personId, handed] of payersLargestFirst) {
    if (remaining === 0) {
      break;
    }
    const returned = Math.min(handed, remaining);
    changeByPerson.set(personId, returned);
    remaining -= returned;
  }
  return changeByPerson;
}

/** Pairs the person who owes the most with the person owed the most until all are square. */
function planTransfers(balances: PersonBalance[]): Transfer[] {
  const open = balances.map((entry) => ({ id: entry.personId, amount: entry.balanceCentavos }));
  const transfers: Transfer[] = [];
  for (;;) {
    const debtor = open.reduce((worst, entry) => (entry.amount < worst.amount ? entry : worst));
    const creditor = open.reduce((best, entry) => (entry.amount > best.amount ? entry : best));
    if (debtor.amount === 0 || creditor.amount === 0) {
      return transfers;
    }
    const amountCentavos = Math.min(-debtor.amount, creditor.amount);
    transfers.push({ fromPersonId: debtor.id, toPersonId: creditor.id, amountCentavos });
    debtor.amount += amountCentavos;
    creditor.amount -= amountCentavos;
  }
}

export function settle(bill: Bill, totals: BillTotals): Settlement {
  const handedByPerson = new Map(
    bill.payments.map((payment) => [payment.personId, payment.handedCentavos]),
  );
  const handedTotalCentavos = bill.payments.reduce(
    (sum, payment) => sum + payment.handedCentavos,
    0,
  );
  const changeTotalCentavos = Math.max(0, handedTotalCentavos - totals.totalCentavos);
  const unpaidCentavos = Math.max(0, totals.totalCentavos - handedTotalCentavos);
  const changeByPerson = assignChange(bill, handedByPerson, changeTotalCentavos);

  const balances = bill.people.map((person) => {
    const shareCentavos = totals.shareByPerson.get(person.id) ?? 0;
    const handedCentavos = handedByPerson.get(person.id) ?? 0;
    const changeCentavos = changeByPerson.get(person.id) ?? 0;
    return {
      personId: person.id,
      shareCentavos,
      handedCentavos,
      changeCentavos,
      balanceCentavos: handedCentavos - changeCentavos - shareCentavos,
    };
  });

  const isComplete = unpaidCentavos === 0 && totals.unassignedItemIds.length === 0;
  const transfers = isComplete && balances.length > 0 ? planTransfers(balances) : [];

  return { handedTotalCentavos, changeTotalCentavos, unpaidCentavos, balances, transfers };
}
