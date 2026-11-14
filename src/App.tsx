import { FilePlus2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { OrdersSection } from "./components/OrdersSection";
import { PaymentsSection } from "./components/PaymentsSection";
import { PeopleSection } from "./components/PeopleSection";
import { SettleUpSection } from "./components/SettleUpSection";
import { SharedBillView } from "./components/SharedBillView";
import { MAX_TITLE, emptyBill, isBillEmpty, type Bill } from "./domain/bill";
import { settle } from "./domain/settle";
import { computeTotals } from "./domain/split";
import { useBill } from "./state/useBill";
import { isStorageAvailable } from "./storage/localBill";
import { readBillFromHash } from "./storage/shareLink";

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

  return (
    <div className="page">
      <header className="masthead">
        <h1 className="masthead__name">Ambag</h1>
        <p className="masthead__purpose">
          Split a bill by what each person ordered, then see who pays whom.
        </p>
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

            <div className="bill-title">
              <label className="visually-hidden" htmlFor="bill-title">
                Bill name
              </label>
              <input
                id="bill-title"
                className="text-input text-input--title"
                placeholder="Name this bill, e.g. Friday dinner"
                maxLength={MAX_TITLE}
                autoComplete="off"
                value={bill.title}
                onChange={(event) => dispatch({ type: "setTitle", title: event.target.value })}
              />
              {!isBillEmpty(bill) && (
                <button type="button" className="button button--quiet" onClick={startNewBill}>
                  <FilePlus2 size={18} strokeWidth={1.75} aria-hidden="true" />
                  New bill
                </button>
              )}
            </div>

            <div className="layout">
              <div className="entry">
                <PeopleSection bill={bill} dispatch={dispatch} />
                <OrdersSection bill={bill} dispatch={dispatch} />
                <PaymentsSection
                  bill={bill}
                  dispatch={dispatch}
                  totalCentavos={totals.totalCentavos}
                  handedTotalCentavos={settlement.handedTotalCentavos}
                />
              </div>
              <SettleUpSection bill={bill} totals={totals} settlement={settlement} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
