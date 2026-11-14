import { Pencil } from "lucide-react";
import type { Bill } from "../domain/bill";
import { formatPesos } from "../domain/money";
import { settle } from "../domain/settle";
import { computeTotals } from "../domain/split";
import { personNames } from "../domain/summary";
import { SettleUpSection } from "./SettleUpSection";

type SharedBillViewProps = {
  bill: Bill;
  onEditCopy: () => void;
  onClose: () => void;
};

/** A bill opened from a link: read-only until the viewer chooses to edit a copy. */
export function SharedBillView({ bill, onEditCopy, onClose }: SharedBillViewProps) {
  const totals = computeTotals(bill);
  const settlement = settle(bill, totals);
  const names = personNames(bill);

  return (
    <>
      <div className="notice">
        <p>
          You are viewing a bill someone shared with you. It is read-only and is not saved on this
          device.
        </p>
        <div className="notice__actions">
          <button type="button" className="button" onClick={onEditCopy}>
            <Pencil size={18} strokeWidth={1.75} aria-hidden="true" />
            Edit a copy
          </button>
          <button type="button" className="button button--quiet" onClick={onClose}>
            Go to my bills
          </button>
        </div>
      </div>

      <div className="layout">
        <section className="section entry" aria-labelledby="shared-orders-heading">
          <h2 id="shared-orders-heading" className="section__heading">
            {bill.title.trim() === "" ? "Orders" : bill.title}
          </h2>
          {bill.items.length === 0 ? (
            <p className="hint">This bill has no orders on it.</p>
          ) : (
            <ul className="plain-list">
              {bill.items.map((item, index) => (
                <li key={item.id} className="shared-order">
                  <span>
                    {item.name.trim() === "" ? `Order ${index + 1}` : item.name}
                    <span className="shared-order__people">
                      {item.sharedBy.length === 0
                        ? "Nobody assigned"
                        : item.sharedBy.map((id) => names.get(id) ?? "Someone").join(", ")}
                    </span>
                  </span>
                  <span className="amount">{formatPesos(item.priceCentavos)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <SettleUpSection bill={bill} totals={totals} settlement={settlement} />
      </div>
    </>
  );
}
