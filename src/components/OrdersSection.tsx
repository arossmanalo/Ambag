import { Check, Plus, X } from "lucide-react";
import { useRef, useState, type Dispatch, type FormEvent } from "react";
import {
  MAX_ITEMS,
  MAX_ITEM_NAME,
  newId,
  type Adjustment,
  type Bill,
  type Item,
} from "../domain/bill";
import type { BillAction } from "../state/billReducer";
import { MoneyInput } from "./MoneyInput";

type SectionProps = {
  bill: Bill;
  dispatch: Dispatch<BillAction>;
};

type OrderRowProps = SectionProps & { item: Item; position: number };

function OrderRow({ bill, dispatch, item, position }: OrderRowProps) {
  const label = item.name.trim() === "" ? `order ${position}` : item.name;
  const isUnassigned = item.sharedBy.length === 0;

  return (
    <li className="order-row" data-flagged={isUnassigned || undefined}>
      <div className="order-row__main">
        <input
          className="text-input text-input--quiet"
          aria-label={`Name of ${label}`}
          placeholder={`Order ${position}`}
          maxLength={MAX_ITEM_NAME}
          value={item.name}
          onChange={(event) =>
            dispatch({ type: "renameItem", itemId: item.id, name: event.target.value })
          }
        />
        <MoneyInput
          id={`price-${item.id}`}
          unit="peso"
          ariaLabel={`Price of ${label}`}
          value={item.priceCentavos}
          onChange={(priceCentavos) => {
            if (priceCentavos !== null) {
              dispatch({ type: "setItemPrice", itemId: item.id, priceCentavos });
            }
          }}
        />
      </div>

      <div className="order-row__people">
        {bill.people.length === 0 ? (
          <p className="hint">Add people above, then pick who ordered this.</p>
        ) : (
          <div className="chips" role="group" aria-label={`Who ordered ${label}`}>
            {bill.people.map((person) => {
              const isOn = item.sharedBy.includes(person.id);
              return (
                <button
                  key={person.id}
                  type="button"
                  className="chip"
                  aria-pressed={isOn}
                  onClick={() =>
                    dispatch({ type: "toggleSharer", itemId: item.id, personId: person.id })
                  }
                >
                  {isOn && <Check size={16} strokeWidth={2} aria-hidden="true" />}
                  {person.name}
                </button>
              );
            })}
            {bill.people.length > 1 && item.sharedBy.length < bill.people.length && (
              <button
                type="button"
                className="chip chip--action"
                onClick={() => dispatch({ type: "shareWithEveryone", itemId: item.id })}
              >
                All
              </button>
            )}
          </div>
        )}
        <button
          type="button"
          className="icon-button"
          aria-label={`Remove ${label}`}
          onClick={() => dispatch({ type: "removeItem", itemId: item.id })}
        >
          <X size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
      {isUnassigned && bill.people.length > 0 && (
        <p className="field-error">Pick who ordered this.</p>
      )}
    </li>
  );
}

type AdjustmentFieldProps = {
  id: string;
  label: string;
  defaultKind: Adjustment["kind"];
  adjustment: Adjustment | null;
  onChange: (adjustment: Adjustment | null) => void;
};

function AdjustmentField({ id, label, defaultKind, adjustment, onChange }: AdjustmentFieldProps) {
  const [emptyKind, setEmptyKind] = useState(defaultKind);
  const kind = adjustment?.kind ?? emptyKind;
  const value =
    adjustment === null
      ? null
      : adjustment.kind === "percent"
        ? adjustment.basisPoints
        : adjustment.centavos;

  function switchKind(nextKind: Adjustment["kind"]) {
    if (nextKind !== kind) {
      setEmptyKind(nextKind);
      onChange(null);
    }
  }

  function changeValue(next: number | null) {
    if (next === null) {
      onChange(null);
    } else if (kind === "percent") {
      onChange({ kind: "percent", basisPoints: next });
    } else {
      onChange({ kind: "amount", centavos: next });
    }
  }

  return (
    <div className="adjustment">
      <label htmlFor={id} className="adjustment__label">
        {label}
      </label>
      <div className="segmented" role="group" aria-label={`${label} type`}>
        <button
          type="button"
          aria-pressed={kind === "percent"}
          aria-label="Percent of the orders"
          onClick={() => switchKind("percent")}
        >
          %
        </button>
        <button
          type="button"
          aria-pressed={kind === "amount"}
          aria-label="Fixed amount in pesos"
          onClick={() => switchKind("amount")}
        >
          ₱
        </button>
      </div>
      <MoneyInput
        key={kind}
        id={id}
        unit={kind === "percent" ? "percent" : "peso"}
        value={value}
        onChange={changeValue}
      />
    </div>
  );
}

export function OrdersSection({ bill, dispatch }: SectionProps) {
  const [name, setName] = useState("");
  const [priceCentavos, setPriceCentavos] = useState<number | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const isFull = bill.items.length >= MAX_ITEMS;

  function addOrder(event: FormEvent) {
    event.preventDefault();
    if (priceCentavos === null || isFull) {
      return;
    }
    dispatch({ type: "addItem", id: newId(), name: name.trim(), priceCentavos });
    setName("");
    setPriceCentavos(null);
    nameInput.current?.focus();
  }

  return (
    <section className="section" aria-labelledby="orders-heading">
      <h2 id="orders-heading" className="section__heading">
        <span className="section__step">02</span>
        Orders
      </h2>

      {bill.items.length === 0 ? (
        <p className="hint">
          No orders yet. Add each dish or drink from the receipt with its price.
        </p>
      ) : (
        <ul className="plain-list">
          {bill.items.map((item, index) => (
            <OrderRow
              key={item.id}
              bill={bill}
              dispatch={dispatch}
              item={item}
              position={index + 1}
            />
          ))}
        </ul>
      )}

      <form className="add-order" onSubmit={addOrder}>
        <div className="add-order__fields">
          <label className="visually-hidden" htmlFor="new-order-name">
            Name of the order to add
          </label>
          <input
            id="new-order-name"
            ref={nameInput}
            className="text-input"
            placeholder="Dish or drink"
            maxLength={MAX_ITEM_NAME}
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <MoneyInput
            id="new-order-price"
            unit="peso"
            ariaLabel="Price of the order to add"
            value={priceCentavos}
            onChange={setPriceCentavos}
          />
        </div>
        <button type="submit" className="button" disabled={priceCentavos === null || isFull}>
          <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
          Add order
        </button>
      </form>
      {isFull && (
        <p className="field-error">
          A bill holds up to {MAX_ITEMS} orders. Remove one to add another.
        </p>
      )}

      <div className="adjustments">
        <AdjustmentField
          id="service-charge"
          label="Service charge"
          defaultKind="percent"
          adjustment={bill.serviceCharge}
          onChange={(adjustment) => dispatch({ type: "setServiceCharge", adjustment })}
        />
        <AdjustmentField
          id="discount"
          label="Discount"
          defaultKind="amount"
          adjustment={bill.discount}
          onChange={(adjustment) => dispatch({ type: "setDiscount", adjustment })}
        />
      </div>
    </section>
  );
}
