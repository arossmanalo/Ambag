import { Check, Copy, Link2 } from "lucide-react";
import { useState } from "react";
import type { Bill } from "../domain/bill";
import { formatPesos } from "../domain/money";
import type { Settlement } from "../domain/settle";
import type { BillTotals } from "../domain/split";
import {
  balanceNote,
  buildSummary,
  personNames,
  settlementBlockers,
} from "../domain/summary";
import { buildShareUrl } from "../storage/shareLink";

export const SETTLE_UP_ID = "settle-up";

type SettleUpSectionProps = {
  bill: Bill;
  totals: BillTotals;
  settlement: Settlement;
};

type CopyTarget = "summary" | "link";

export function SettleUpSection({ bill, totals, settlement }: SettleUpSectionProps) {
  const [copied, setCopied] = useState<CopyTarget | null>(null);
  const [manualCopyText, setManualCopyText] = useState<string | null>(null);

  const names = personNames(bill);
  const nameOf = (personId: string) => names.get(personId) ?? "Someone";
  const blockers = settlementBlockers(totals, settlement);
  const isSettled = blockers.length === 0;
  const changeLines = settlement.balances.filter((entry) => entry.changeCentavos > 0);
  const hasContent = bill.people.length > 0 && bill.items.length > 0;
  const hasAdjustments = totals.serviceChargeCentavos > 0 || totals.discountCentavos > 0;

  async function copy(target: CopyTarget) {
    const text =
      target === "summary"
        ? buildSummary(bill, totals, settlement)
        : buildShareUrl(bill, window.location.href);
    try {
      await navigator.clipboard.writeText(text);
      setManualCopyText(null);
      setCopied(target);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // The browser refused clipboard access, so show the text to copy by hand.
      setCopied(null);
      setManualCopyText(text);
    }
  }

  return (
    <section
      id={SETTLE_UP_ID}
      className="section settle"
      aria-labelledby="settle-heading"
      tabIndex={-1}
    >
      <h2 id="settle-heading" className="section__heading">
        <span className="section__step">04</span>
        Settle up
      </h2>

      {!hasContent ? (
        <p className="hint">
          Add people and their orders. Each share and who pays whom will show up here.
        </p>
      ) : (
        <>
          <div aria-live="polite">
            {!isSettled ? (
              <ul className="blockers">
                {blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            ) : settlement.transfers.length === 0 ? (
              <p className="settle__done">
                <Check size={20} strokeWidth={2} aria-hidden="true" />
                Everyone is settled. Nobody owes anything.
              </p>
            ) : (
              <ol className="transfers">
                {settlement.transfers.map((transfer) => (
                  <li key={`${transfer.fromPersonId}-${transfer.toPersonId}`} className="transfer">
                    <span className="transfer__people">
                      <strong>{nameOf(transfer.fromPersonId)}</strong> pays{" "}
                      <strong>{nameOf(transfer.toPersonId)}</strong>
                    </span>
                    <span className="amount transfer__amount">
                      {formatPesos(transfer.amountCentavos)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {changeLines.map((entry) => (
              <p key={entry.personId} className="settle__note">
                <span className="amount">{formatPesos(entry.changeCentavos)}</span> change from the
                restaurant goes back to {nameOf(entry.personId)}.
              </p>
            ))}
          </div>

          <h3 className="settle__subheading">Each person's share</h3>
          <ul className="plain-list">
            {settlement.balances.map((entry) => (
              <li key={entry.personId} className="share-row">
                <span className="share-row__person">
                  {nameOf(entry.personId)}
                  {isSettled && <span className="share-row__note">{balanceNote(entry)}</span>}
                </span>
                <span className="amount">{formatPesos(entry.shareCentavos)}</span>
              </li>
            ))}
          </ul>

          <h3 className="settle__subheading">The bill</h3>
          <dl className="receipt">
            {hasAdjustments && (
              <div className="receipt__row">
                <dt>Orders</dt>
                <dd className="amount">{formatPesos(totals.subtotalCentavos)}</dd>
              </div>
            )}
            {totals.serviceChargeCentavos > 0 && (
              <div className="receipt__row">
                <dt>Service charge</dt>
                <dd className="amount">{formatPesos(totals.serviceChargeCentavos)}</dd>
              </div>
            )}
            {totals.discountCentavos > 0 && (
              <div className="receipt__row">
                <dt>Discount</dt>
                <dd className="amount">{formatPesos(-totals.discountCentavos)}</dd>
              </div>
            )}
            <div className="receipt__row receipt__row--total">
              <dt>Bill total</dt>
              <dd className="amount">{formatPesos(totals.totalCentavos)}</dd>
            </div>
          </dl>

          <div className="settle__actions">
            <button type="button" className="button" onClick={() => copy("summary")}>
              {copied === "summary" ? (
                <Check size={18} strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <Copy size={18} strokeWidth={1.75} aria-hidden="true" />
              )}
              {copied === "summary" ? "Summary copied" : "Copy summary"}
            </button>
            <button type="button" className="button button--quiet" onClick={() => copy("link")}>
              {copied === "link" ? (
                <Check size={18} strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <Link2 size={18} strokeWidth={1.75} aria-hidden="true" />
              )}
              {copied === "link" ? "Link copied" : "Copy link to this bill"}
            </button>
          </div>
          {manualCopyText !== null && (
            <div className="manual-copy">
              <label htmlFor="manual-copy" className="field-error">
                This browser blocked copying. Select the text below and copy it yourself.
              </label>
              <textarea id="manual-copy" readOnly rows={5} value={manualCopyText} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
