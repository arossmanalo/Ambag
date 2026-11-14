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
  /** The balance left once transfers ticked as paid are counted. */
  outstandingCentavos: number;
};

export type Transfer = {
  fromPersonId: string;
  toPersonId: string;
  amountCentavos: number;
  isPaid: boolean;
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
function planTransfers(
  balances: { personId: string; balanceCentavos: number }[],
): Omit<Transfer, "isPaid">[] {
  const open = balances.map((entry) => ({ id: entry.personId, amount: entry.balanceCentavos }));
  const transfers: Omit<Transfer, "isPaid">[] = [];
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

  const rawBalances = bill.people.map((person) => {
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
  const planned = isComplete && rawBalances.length > 0 ? planTransfers(rawBalances) : [];
  const transfers = planned.map((transfer) => ({
    ...transfer,
    isPaid: bill.paidTransfers.some(
      (mark) =>
        mark.fromPersonId === transfer.fromPersonId &&
        mark.toPersonId === transfer.toPersonId &&
        mark.amountCentavos === transfer.amountCentavos,
    ),
  }));

  const paidTransfers = transfers.filter((transfer) => transfer.isPaid);
  const balances = rawBalances.map((entry) => {
    const sent = paidTransfers
      .filter((transfer) => transfer.fromPersonId === entry.personId)
      .reduce((sum, transfer) => sum + transfer.amountCentavos, 0);
    const received = paidTransfers
      .filter((transfer) => transfer.toPersonId === entry.personId)
      .reduce((sum, transfer) => sum + transfer.amountCentavos, 0);
    return { ...entry, outstandingCentavos: entry.balanceCentavos + sent - received };
  });

  return { handedTotalCentavos, changeTotalCentavos, unpaidCentavos, balances, transfers };
}

export function unpaidTransferCount(settlement: Settlement): number {
  return settlement.transfers.filter((transfer) => !transfer.isPaid).length;
}
