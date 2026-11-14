import { Check, Copy, Link2 } from "lucide-react";
import { useState } from "react";
import { avatarTones } from "../domain/avatar";
import type { Bill, PayTo } from "../domain/bill";
import { formatPesos } from "../domain/money";
import { unpaidTransferCount, type Settlement, type Transfer } from "../domain/settle";
import type { BillTotals } from "../domain/split";
import {
  PAY_METHOD_LABELS,
  accountForCopy,
  balanceNote,
  buildSummary,
  formatPayTo,
  personNames,
  settlementBlockers,
} from "../domain/summary";
import { buildShareUrl } from "../storage/shareLink";
import { Avatar } from "./Avatar";

export const SETTLE_UP_ID = "settle-up";

type SettleUpSectionProps = {
  bill: Bill;
  totals: BillTotals;
  settlement: Settlement;
  /** Left out where the bill is read-only, so paid marks show without a control. */
  onTogglePaid?: (transfer: Transfer) => void;
};

type TransferRowProps = {
  transfer: Transfer;
  fromName: string;
  toName: string;
  fromTone: number | undefined;
  toTone: number | undefined;
  payTo: PayTo | undefined;
  isCopied: boolean;
  onCopyAccount: (account: string) => void;
  onTogglePaid?: (transfer: Transfer) => void;
};

function TransferRow({
  transfer,
  fromName,
  toName,
  fromTone,
  toTone,
  payTo,
  isCopied,
  onCopyAccount,
  onTogglePaid,
}: TransferRowProps) {
  const paidId = `paid-${transfer.fromPersonId}-${transfer.toPersonId}`;
  const showPayTo = payTo !== undefined && !transfer.isPaid;

  return (
    <li className="transfer" data-paid={transfer.isPaid || undefined}>
      <div className="transfer__main">
        <span className="transfer__people">
          <Avatar name={fromName} tone={fromTone} size="sm" />
          <strong>{fromName}</strong> {transfer.isPaid ? "paid" : "pays"}{" "}
          <Avatar name={toName} tone={toTone} size="sm" />
          <strong>{toName}</strong>
        </span>
        <span className="amount transfer__amount">{formatPesos(transfer.amountCentavos)}</span>
      </div>
      {(showPayTo || onTogglePaid || transfer.isPaid) && (
        <div className="transfer__meta">
          {showPayTo && (
            <span className="transfer__pay-to">
              <span className="transfer__account">{formatPayTo(payTo)}</span>
              <button
                type="button"
                className="text-button"
                aria-label={`Copy ${toName}'s ${PAY_METHOD_LABELS[payTo.method]} details`}
                onClick={() => onCopyAccount(accountForCopy(payTo))}
              >
                {isCopied ? (
                  <Check size={16} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <Copy size={16} strokeWidth={1.75} aria-hidden="true" />
                )}
                {isCopied ? "Copied" : "Copy"}
              </button>
            </span>
          )}
          {onTogglePaid ? (
            <span className="paid-toggle">
              <input
                id={paidId}
                type="checkbox"
                checked={transfer.isPaid}
                onChange={() => onTogglePaid(transfer)}
              />
              <label htmlFor={paidId}>
                Paid
                <span className="visually-hidden">
                  : {fromName} to {toName}
                </span>
              </label>
            </span>
          ) : (
            transfer.isPaid && <span className="paid-badge">Paid</span>
          )}
        </div>
      )}
    </li>
  );
}

export function SettleUpSection({ bill, totals, settlement, onTogglePaid }: SettleUpSectionProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [manualCopyText, setManualCopyText] = useState<string | null>(null);

  const names = personNames(bill);
  const nameOf = (personId: string) => names.get(personId) ?? "Someone";
  const payToByPerson = new Map(bill.people.map((person) => [person.id, person.payTo]));
  const tones = avatarTones(bill.people);
  const blockers = settlementBlockers(totals, settlement);
  const isSettled = blockers.length === 0;
  const transferCount = settlement.transfers.length;
  const paidCount = transferCount - unpaidTransferCount(settlement);
  const allPaid = transferCount > 0 && paidCount === transferCount;
  const changeLines = settlement.balances.filter((entry) => entry.changeCentavos > 0);
  const hasContent = bill.people.length > 0 && bill.items.length > 0;
  const hasAdjustments = totals.serviceChargeCentavos > 0 || totals.discountCentavos > 0;

  /** `key` says which button shows "copied", since several can copy. */
  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setManualCopyText(null);
      setCopied(key);
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 2000);
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
      <div className="settle__paper">
        <div className="settle__head">
          <h2 id="settle-heading" className="section__heading">
            <span className="section__step">4</span>
            Settle up
          </h2>
          {hasContent && (
            <>
              <p className="settle__bill-name">
                {bill.title.trim() === "" ? "Bill split" : bill.title.trim()}
              </p>
              <p className="settle__total">
                <span className="settle__total-label">Bill total</span>
                <span className="amount">{formatPesos(totals.totalCentavos)}</span>
              </p>
              {isSettled && transferCount > 0 && (
                <div className="progress">
                  <p className="progress__label">
                    {paidCount} of {transferCount} {transferCount === 1 ? "payment" : "payments"}{" "}
                    made
                  </p>
                  <ol className="progress__steps" aria-hidden="true">
                    {settlement.transfers.map((transfer) => (
                      <li
                        key={`${transfer.fromPersonId}-${transfer.toPersonId}`}
                        data-paid={transfer.isPaid || undefined}
                      />
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}
        </div>

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
                <>
                  {allPaid && (
                    <p className="settle__done">
                      <Check size={20} strokeWidth={2} aria-hidden="true" />
                      All payments made.
                    </p>
                  )}
                  <ol className="transfers">
                    {settlement.transfers.map((transfer) => {
                      const key = `${transfer.fromPersonId}-${transfer.toPersonId}`;
                      return (
                        <TransferRow
                          key={key}
                          transfer={transfer}
                          fromName={nameOf(transfer.fromPersonId)}
                          toName={nameOf(transfer.toPersonId)}
                          fromTone={tones.get(transfer.fromPersonId)}
                          toTone={tones.get(transfer.toPersonId)}
                          payTo={payToByPerson.get(transfer.toPersonId)}
                          isCopied={copied === `account-${key}`}
                          onCopyAccount={(account) => copy(`account-${key}`, account)}
                          onTogglePaid={onTogglePaid}
                        />
                      );
                    })}
                  </ol>
                </>
              )}
              {changeLines.map((entry) => (
                <p key={entry.personId} className="settle__note">
                  <span className="amount">{formatPesos(entry.changeCentavos)}</span> change from
                  the restaurant goes back to {nameOf(entry.personId)}.
                </p>
              ))}
            </div>

            <h3 className="settle__subheading">Each person's share</h3>
            <ul className="plain-list">
              {settlement.balances.map((entry) => (
                <li key={entry.personId} className="share-row">
                  <Avatar name={nameOf(entry.personId)} tone={tones.get(entry.personId)} />
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
              <button
                type="button"
                className="button"
                onClick={() => copy("summary", buildSummary(bill, totals, settlement))}
              >
                {copied === "summary" ? (
                  <Check size={18} strokeWidth={1.75} aria-hidden="true" />
                ) : (
                  <Copy size={18} strokeWidth={1.75} aria-hidden="true" />
                )}
                {copied === "summary" ? "Summary copied" : "Copy summary"}
              </button>
              <button
                type="button"
                className="button button--quiet"
                onClick={() => copy("link", buildShareUrl(bill, window.location.href))}
              >
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
      </div>
    </section>
  );
}
