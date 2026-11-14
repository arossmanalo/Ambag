import { MAX_TITLE, type Bill } from "../domain/bill";
import { settle } from "../domain/settle";
import { computeTotals } from "../domain/split";
import { billStatus } from "../domain/summary";
import type { BillAction } from "../state/billReducer";
import { OrdersSection } from "./OrdersSection";
import { PaymentsSection } from "./PaymentsSection";
import { PeopleSection } from "./PeopleSection";
import { ResultBar } from "./ResultBar";
import { SETTLE_UP_ID, SettleUpSection } from "./SettleUpSection";

type BillEditorProps = {
  bill: Bill;
  dispatch: (action: BillAction) => void;
};

/** One bill open for editing: the order pad and its receipt. */
export function BillEditor({ bill, dispatch }: BillEditorProps) {
  const totals = computeTotals(bill);
  const settlement = settle(bill, totals);
  const hasResult = bill.people.length > 0 && bill.items.length > 0;

  return (
    <>
      <label className="visually-hidden" htmlFor="bill-title">
        Bill name
      </label>
      <input
        id="bill-title"
        className="bill-title"
        placeholder="Name this bill, e.g. Friday dinner"
        maxLength={MAX_TITLE}
        autoComplete="off"
        value={bill.title}
        onChange={(event) => dispatch({ type: "setTitle", title: event.target.value })}
      />

      <div className="layout">
        <div className="entry">
          <PeopleSection bill={bill} dispatch={dispatch} />
          <OrdersSection bill={bill} dispatch={dispatch} />
          <PaymentsSection
            bill={bill}
            dispatch={dispatch}
            totalCentavos={totals.totalCentavos}
            settlement={settlement}
          />
        </div>
        <SettleUpSection
          bill={bill}
          totals={totals}
          settlement={settlement}
          onTogglePaid={(transfer) => dispatch({ type: "toggleTransferPaid", transfer })}
        />
      </div>
      {hasResult && (
        <ResultBar
          targetId={SETTLE_UP_ID}
          totalCentavos={totals.totalCentavos}
          status={billStatus(totals, settlement).label}
        />
      )}
    </>
  );
}
