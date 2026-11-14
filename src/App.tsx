import { ArrowLeft, X } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";
import { BillEditor } from "./components/BillEditor";
import { HomeScreen } from "./components/HomeScreen";
import { SharedBillView } from "./components/SharedBillView";
import type { Bill } from "./domain/bill";
import { useBillLibrary } from "./state/useBillLibrary";
import { isStorageAvailable } from "./storage/localBill";
import { readBillFromHash } from "./storage/shareLink";

/** The open bill lives in the address as ?bill=<id>, so reload and Back keep working. */
function billIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("bill");
}

export function App() {
  const { bills, createBill, updateBill, deleteBill, discardIfBlank } = useBillLibrary();
  const [link, setLink] = useState(() => readBillFromHash(window.location.hash));
  const [openId, setOpenId] = useState(billIdFromUrl);
  const [canSave] = useState(isStorageAvailable);

  function switchBill(nextId: string | null) {
    // Leaving a bill by any route (All bills, Back, a new bill) tidies it away if blank.
    if (openId !== null && openId !== nextId) {
      discardIfBlank(openId);
    }
    setOpenId(nextId);
  }

  const onUrlChange = useEffectEvent(() => {
    setLink(readBillFromHash(window.location.hash));
    switchBill(billIdFromUrl());
  });

  useEffect(() => {
    const readUrl = () => onUrlChange();
    window.addEventListener("hashchange", readUrl);
    window.addEventListener("popstate", readUrl);
    return () => {
      window.removeEventListener("hashchange", readUrl);
      window.removeEventListener("popstate", readUrl);
    };
  }, []);

  // A bill deleted here or in another tab, or an old address, falls back to the list.
  const openBill = openId === null ? undefined : bills.find((saved) => saved.id === openId);

  function goTo(id: string | null) {
    const search = id === null ? "" : `?bill=${encodeURIComponent(id)}`;
    window.history.pushState(null, "", window.location.pathname + search);
    switchBill(id);
    setLink({ kind: "none" });
    window.scrollTo(0, 0);
  }

  function closeLink() {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setLink({ kind: "none" });
  }

  function editCopyOf(sharedBill: Bill) {
    goTo(createBill(sharedBill));
  }

  return (
    <>
      <header className="masthead">
        <div className="masthead__inner">
          <div>
            <h1 className="masthead__name">Ambag</h1>
            <p className="masthead__purpose">
              Split a bill by what each person ordered, then see who pays whom.
            </p>
          </div>
          {link.kind !== "bill" && openBill !== undefined && (
            <button type="button" className="button button--on-dark" onClick={() => goTo(null)}>
              <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
              All bills
            </button>
          )}
        </div>
      </header>

      <main className="page">
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
                  the link again, or start a bill of your own.
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
                  This browser is not letting Ambag save, so your bills will be lost when the tab
                  closes. Copy the link to a bill to keep it.
                </p>
              </div>
            )}

            {openBill === undefined ? (
              <HomeScreen
                bills={bills}
                onOpen={goTo}
                onCreate={() => goTo(createBill())}
                onDelete={deleteBill}
              />
            ) : (
              <BillEditor
                key={openBill.id}
                bill={openBill.bill}
                dispatch={(action) => updateBill(openBill.id, action)}
              />
            )}
          </>
        )}
      </main>
    </>
  );
}
