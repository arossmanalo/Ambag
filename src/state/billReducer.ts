import {
  MAX_ITEMS,
  MAX_PEOPLE,
  type Adjustment,
  type Bill,
  type Item,
  type PaidTransfer,
  type PayTo,
} from "../domain/bill";

function isSameTransfer(a: PaidTransfer, b: PaidTransfer): boolean {
  return (
    a.fromPersonId === b.fromPersonId &&
    a.toPersonId === b.toPersonId &&
    a.amountCentavos === b.amountCentavos
  );
}

export type BillAction =
  | { type: "setTitle"; title: string }
  | { type: "addPerson"; id: string; name: string }
  | { type: "renamePerson"; personId: string; name: string }
  | { type: "removePerson"; personId: string }
  | { type: "addItem"; id: string; name: string; priceCentavos: number; sharedBy: string[] }
  | { type: "renameItem"; itemId: string; name: string }
  | { type: "setItemPrice"; itemId: string; priceCentavos: number }
  | { type: "toggleSharer"; itemId: string; personId: string }
  | { type: "shareWithEveryone"; itemId: string }
  | { type: "removeItem"; itemId: string }
  | { type: "setServiceCharge"; adjustment: Adjustment | null }
  | { type: "setDiscount"; adjustment: Adjustment | null }
  | { type: "setPayment"; personId: string; handedCentavos: number }
  | { type: "setPayTo"; personId: string; payTo: PayTo | null }
  | { type: "toggleTransferPaid"; transfer: PaidTransfer };

function updateItem(bill: Bill, itemId: string, change: (item: Item) => Item): Bill {
  return {
    ...bill,
    items: bill.items.map((item) => (item.id === itemId ? change(item) : item)),
  };
}

export function billReducer(bill: Bill, action: BillAction): Bill {
  switch (action.type) {
    case "setTitle":
      return { ...bill, title: action.title };
    case "addPerson":
      if (bill.people.length >= MAX_PEOPLE) {
        return bill;
      }
      return { ...bill, people: [...bill.people, { id: action.id, name: action.name }] };
    case "renamePerson":
      return {
        ...bill,
        people: bill.people.map((person) =>
          person.id === action.personId ? { ...person, name: action.name } : person,
        ),
      };
    case "removePerson":
      return {
        ...bill,
        people: bill.people.filter((person) => person.id !== action.personId),
        items: bill.items.map((item) => ({
          ...item,
          sharedBy: item.sharedBy.filter((id) => id !== action.personId),
        })),
        payments: bill.payments.filter((payment) => payment.personId !== action.personId),
        paidTransfers: bill.paidTransfers.filter(
          (mark) => mark.fromPersonId !== action.personId && mark.toPersonId !== action.personId,
        ),
      };
    case "setPayTo":
      return {
        ...bill,
        people: bill.people.map((person) => {
          if (person.id !== action.personId) {
            return person;
          }
          if (action.payTo === null) {
            const { id, name } = person;
            return { id, name };
          }
          return { ...person, payTo: action.payTo };
        }),
      };
    case "toggleTransferPaid": {
      const isMarked = bill.paidTransfers.some((mark) => isSameTransfer(mark, action.transfer));
      const { fromPersonId, toPersonId, amountCentavos } = action.transfer;
      return {
        ...bill,
        paidTransfers: isMarked
          ? bill.paidTransfers.filter((mark) => !isSameTransfer(mark, action.transfer))
          : [...bill.paidTransfers, { fromPersonId, toPersonId, amountCentavos }],
      };
    }
    case "addItem":
      if (bill.items.length >= MAX_ITEMS) {
        return bill;
      }
      return {
        ...bill,
        items: [
          ...bill.items,
          {
            id: action.id,
            name: action.name,
            priceCentavos: action.priceCentavos,
            sharedBy: action.sharedBy,
          },
        ],
      };
    case "renameItem":
      return updateItem(bill, action.itemId, (item) => ({ ...item, name: action.name }));
    case "setItemPrice":
      return updateItem(bill, action.itemId, (item) => ({
        ...item,
        priceCentavos: action.priceCentavos,
      }));
    case "toggleSharer":
      return updateItem(bill, action.itemId, (item) => ({
        ...item,
        sharedBy: item.sharedBy.includes(action.personId)
          ? item.sharedBy.filter((id) => id !== action.personId)
          : [...item.sharedBy, action.personId],
      }));
    case "shareWithEveryone":
      return updateItem(bill, action.itemId, (item) => ({
        ...item,
        sharedBy: bill.people.map((person) => person.id),
      }));
    case "removeItem":
      return { ...bill, items: bill.items.filter((item) => item.id !== action.itemId) };
    case "setServiceCharge":
      return { ...bill, serviceCharge: action.adjustment };
    case "setDiscount":
      return { ...bill, discount: action.adjustment };
    case "setPayment": {
      const others = bill.payments.filter((payment) => payment.personId !== action.personId);
      if (action.handedCentavos === 0) {
        return { ...bill, payments: others };
      }
      return {
        ...bill,
        payments: [
          ...others,
          { personId: action.personId, handedCentavos: action.handedCentavos },
        ],
      };
    }
  }
}
