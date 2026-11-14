import type { Dispatch } from "react";
import type { Bill } from "../domain/bill";
import { formatPesos } from "../domain/money";
import type { BillAction } from "../state/billReducer";
import { MoneyInput } from "./MoneyInput";

type PaymentsSectionProps = {
  bill: Bill;
  dispatch: Dispatch<BillAction>;
  totalCentavos: number;
  handedTotalCentavos: number;
};

export function PaymentsSection({
  bill,
  dispatch,
  totalCentavos,
  handedTotalCentavos,
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
          <p className="tally">
            Handed over <span className="amount">{formatPesos(handedTotalCentavos)}</span> for a
            bill of <span className="amount">{formatPesos(totalCentavos)}</span>
          </p>
        </>
      )}
    </section>
  );
}
