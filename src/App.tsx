import { FilePlus2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { OrdersSection } from "./components/OrdersSection";
import { PaymentsSection } from "./components/PaymentsSection";
import { PeopleSection } from "./components/PeopleSection";
import { ResultBar } from "./components/ResultBar";
import { SETTLE_UP_ID, SettleUpSection } from "./components/SettleUpSection";
import { SharedBillView } from "./components/SharedBillView";
import { MAX_TITLE, emptyBill, isBillEmpty, type Bill } from "./domain/bill";
import { settle, unpaidTransferCount, type Settlement } from "./domain/settle";
import { computeTotals, type BillTotals } from "./domain/split";
import { settlementBlockers } from "./domain/summary";
import { useBill } from "./state/useBill";
import { isStorageAvailable } from "./storage/localBill";
import { readBillFromHash } from "./storage/shareLink";

function resultStatus(totals: BillTotals, settlement: Settlement): string {
  if (settlementBlockers(totals, settlement).length > 0) {
    return "Not settled yet";
  }
  if (settlement.transfers.length === 0) {
    return "Everyone is settled";
  }
  const count = unpaidTransferCount(settlement);
  if (count === 0) {
    return "All payments made";
  }
  return count === 1 ? "1 payment left" : `${count} payments left`;
}

export function App() {
  const { bill, dispatch } = useBill();
  const [link, setLink] = useState(() => readBillFromHash(window.location.hash));
  const [canSave] = useState(isStorageAvailable);

  useEffect(() => {
    const readLink = () => setLink(readBillFromHash(window.location.hash));
    window.addEventListener("hashchange", readLink);
    return () => window.removeEventListener("hashchange", readLink);
  }, []);

  function closeLink() {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setLink({ kind: "none" });
  }

  function editCopyOf(sharedBill: Bill) {
    const confirmed =
      isBillEmpty(bill) ||
      window.confirm("This replaces the bill already saved on this device. Continue?");
    if (confirmed) {
      dispatch({ type: "replace", bill: sharedBill });
      closeLink();
    }
  }

  function startNewBill() {
    if (window.confirm("Clear this bill and start a new one? This cannot be undone.")) {
      dispatch({ type: "replace", bill: emptyBill() });
    }
  }

  const totals = computeTotals(bill);
  const settlement = settle(bill, totals);
  const isEditing = link.kind !== "bill";
  const hasResult = bill.people.length > 0 && bill.items.length > 0;

  return (
    <div className="page">
      <header className="masthead">
        <div>
          <h1 className="masthead__name">Ambag</h1>
          <p className="masthead__purpose">
            Split a bill by what each person ordered, then see who pays whom.
          </p>
        </div>
        {isEditing && !isBillEmpty(bill) && (
          <button type="button" className="button button--quiet" onClick={startNewBill}>
            <FilePlus2 size={18} strokeWidth={1.75} aria-hidden="true" />
            New bill
          </button>
        )}
      </header>

      <main>
        {link.kind === "bill" ? (
          <SharedBillView
            bill={link.bill}
            onEditCopy={() => editCopyOf(link.bill)}
            onClose={closeLink}
          />
        ) : (
          <>
            {link.kind === "invalid" && (
              <div className="notice notice--error" role="alert">
                <p>
                  This link could not be read. It may have been cut off when it was copied. Ask for
                  the link again, or enter the bill below.
                </p>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Dismiss this message"
                  onClick={closeLink}
                >
                  <X size={18} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>
            )}
            {!canSave && (
              <div className="notice notice--error">
                <p>
                  This browser is not letting Ambag save, so this bill will be lost when the tab
                  closes. Copy the link to the bill to keep it.
                </p>
              </div>
            )}

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
                status={resultStatus(totals, settlement)}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
