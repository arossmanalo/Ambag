import type { Dispatch } from "react";
import type { Bill } from "../domain/bill";
import { formatPesos } from "../domain/money";
import type { Settlement } from "../domain/settle";
import type { BillAction } from "../state/billReducer";
import { MoneyInput } from "./MoneyInput";

type PaymentsSectionProps = {
  bill: Bill;
  dispatch: Dispatch<BillAction>;
  totalCentavos: number;
  settlement: Settlement;
};

export function PaymentsSection({
  bill,
  dispatch,
  totalCentavos,
  settlement,
}: PaymentsSectionProps) {
  const handedByPerson = new Map(
    bill.payments.map((payment) => [payment.personId, payment.handedCentavos]),
  );

  return (
    <section className="section" aria-labelledby="payments-heading">
      <h2 id="payments-heading" className="section__heading">
        <span className="section__step">03</span>
        Who paid
      </h2>

      {bill.people.length === 0 ? (
        <p className="hint">Add people first, then enter the cash each one handed over.</p>
      ) : (
        <>
          <p className="hint">
            Enter the cash each person handed to the restaurant. Leave the rest blank.
          </p>
          <ul className="plain-list">
            {bill.people.map((person) => (
              <li key={person.id} className="payment-row">
                <label htmlFor={`paid-${person.id}`}>{person.name}</label>
                <MoneyInput
                  id={`paid-${person.id}`}
                  unit="peso"
                  value={handedByPerson.get(person.id) ?? null}
                  onChange={(handedCentavos) =>
                    dispatch({
                      type: "setPayment",
                      personId: person.id,
                      handedCentavos: handedCentavos ?? 0,
                    })
                  }
                />
              </li>
            ))}
          </ul>
          <dl className="receipt tally">
            <div className="receipt__row">
              <dt>Bill total</dt>
              <dd className="amount">{formatPesos(totalCentavos)}</dd>
            </div>
            <div className="receipt__row">
              <dt>Handed over</dt>
              <dd className="amount">{formatPesos(settlement.handedTotalCentavos)}</dd>
            </div>
            {settlement.unpaidCentavos > 0 && (
              <div className="receipt__row receipt__row--total tally__short">
                <dt>Still to cover</dt>
                <dd className="amount">{formatPesos(settlement.unpaidCentavos)}</dd>
              </div>
            )}
            {settlement.changeTotalCentavos > 0 && (
              <div className="receipt__row receipt__row--total">
                <dt>Change from the restaurant</dt>
                <dd className="amount">{formatPesos(settlement.changeTotalCentavos)}</dd>
              </div>
            )}
          </dl>
        </>
      )}
    </section>
  );
}
