import type { Bill, PayMethod, PayTo } from "./bill";
import { formatPesos } from "./money";
import type { PersonBalance, Settlement } from "./settle";
import type { BillTotals } from "./split";

export function personNames(bill: Bill): Map<string, string> {
  return new Map(bill.people.map((person) => [person.id, person.name]));
}

/** Sentences explaining why the bill cannot be settled yet. Empty when it can. */
export function settlementBlockers(totals: BillTotals, settlement: Settlement): string[] {
  const blockers: string[] = [];
  const unassigned = totals.unassignedItemIds.length;
  if (unassigned > 0) {
    blockers.push(
      unassigned === 1
        ? "1 order has nobody assigned. Pick who ordered it."
        : `${unassigned} orders have nobody assigned. Pick who ordered them.`,
    );
  }
  if (settlement.unpaidCentavos > 0) {
    blockers.push(
      `${formatPesos(settlement.unpaidCentavos)} is still unpaid to the restaurant. ` +
        "Enter who covered it under Who paid.",
    );
  }
  return blockers;
}

export const PAY_METHOD_LABELS: Record<PayMethod, string> = {
  gcash: "GCash",
  maya: "Maya",
  bank: "Bank",
  other: "Other",
};

/** "GCash 0917 123 4567". For "other" the account text already says what it is. */
export function formatPayTo(payTo: PayTo): string {
  return payTo.method === "other"
    ? payTo.account
    : `${PAY_METHOD_LABELS[payTo.method]} ${payTo.account}`;
}

/**
 * One line saying where a person stands once the restaurant's change and
 * any transfers ticked as paid are accounted for.
 */
export function balanceNote(entry: PersonBalance): string {
  const paidCentavos = entry.handedCentavos - entry.changeCentavos;
  const paid = paidCentavos > 0 ? `Paid ${formatPesos(paidCentavos)}` : null;
  const outstanding = entry.outstandingCentavos;
  if (outstanding > 0) {
    const verb = outstanding === entry.balanceCentavos ? "gets back" : "still to get back";
    return `${paid}, ${verb} ${formatPesos(outstanding)}`;
  }
  if (outstanding < 0) {
    const owed = formatPesos(-outstanding);
    return paid === null ? `Owes ${owed}` : `${paid}, still owes ${owed}`;
  }
  if (entry.balanceCentavos !== 0) {
    return paid === null ? "All settled" : `${paid}, all settled`;
  }
  return paid === null ? "Nothing to pay" : `${paid}, all square`;
}

/** Plain text for pasting into a group chat. */
export function buildSummary(bill: Bill, totals: BillTotals, settlement: Settlement): string {
  const names = personNames(bill);
  const nameOf = (personId: string) => names.get(personId) ?? "Someone";
  const lines: string[] = [
    bill.title.trim() === "" ? "Bill split" : bill.title.trim(),
    `Total: ${formatPesos(totals.totalCentavos)}`,
    "",
    "Shares",
    ...settlement.balances.map(
      (entry) => `${nameOf(entry.personId)}: ${formatPesos(entry.shareCentavos)}`,
    ),
  ];

  const payers = settlement.balances.filter((entry) => entry.handedCentavos > 0);
  if (payers.length > 0) {
    lines.push("", "Paid the restaurant");
    for (const payer of payers) {
      lines.push(`${nameOf(payer.personId)}: ${formatPesos(payer.handedCentavos)}`);
    }
    for (const payer of payers.filter((entry) => entry.changeCentavos > 0)) {
      lines.push(`Change: ${formatPesos(payer.changeCentavos)} back to ${nameOf(payer.personId)}`);
    }
  }

  const blockers = settlementBlockers(totals, settlement);
  if (blockers.length > 0) {
    lines.push("", "Not settled yet", ...blockers);
  } else if (settlement.transfers.length === 0) {
    lines.push("", "Everyone is settled.");
  } else {
    const payToByPerson = new Map(bill.people.map((person) => [person.id, person.payTo]));
    lines.push("", "Who pays whom");
    for (const transfer of settlement.transfers) {
      const from = nameOf(transfer.fromPersonId);
      const to = nameOf(transfer.toPersonId);
      const amount = formatPesos(transfer.amountCentavos);
      if (transfer.isPaid) {
        lines.push(`${from} paid ${to} ${amount}`);
        continue;
      }
      const payTo = payToByPerson.get(transfer.toPersonId);
      const via = payTo === undefined ? "" : ` via ${formatPayTo(payTo)}`;
      lines.push(`${from} pays ${to} ${amount}${via}`);
    }
  }
  return lines.join("\n");
}
