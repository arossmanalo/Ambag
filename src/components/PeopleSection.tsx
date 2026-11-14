import { Plus, X } from "lucide-react";
import { useState, type Dispatch, type FormEvent } from "react";
import {
  MAX_PEOPLE,
  MAX_PERSON_NAME,
  isNameTaken,
  newId,
  type Bill,
  type Person,
} from "../domain/bill";
import type { BillAction } from "../state/billReducer";

type SectionProps = {
  bill: Bill;
  dispatch: Dispatch<BillAction>;
};

type PersonRowProps = SectionProps & { person: Person };

function PersonRow({ bill, dispatch, person }: PersonRowProps) {
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    const name = (draft ?? "").trim();
    if (name !== "" && !isNameTaken(bill.people, name, person.id)) {
      dispatch({ type: "renamePerson", personId: person.id, name });
    }
    setDraft(null);
  }

  function remove() {
    const isInUse =
      bill.items.some((item) => item.sharedBy.includes(person.id)) ||
      bill.payments.some((payment) => payment.personId === person.id);
    const confirmed =
      !isInUse ||
      window.confirm(`Remove ${person.name}? They will be taken off their orders and payments.`);
    if (confirmed) {
      dispatch({ type: "removePerson", personId: person.id });
    }
  }

  return (
    <li className="person-row">
      <input
        className="text-input text-input--quiet"
        aria-label={`Name of ${person.name}`}
        maxLength={MAX_PERSON_NAME}
        value={draft ?? person.name}
        onFocus={() => setDraft(person.name)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
      />
      <button
        type="button"
        className="icon-button"
        aria-label={`Remove ${person.name}`}
        onClick={remove}
      >
        <X size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </li>
  );
}

export function PeopleSection({ bill, dispatch }: SectionProps) {
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const isDuplicate = trimmed !== "" && isNameTaken(bill.people, trimmed);
  const isFull = bill.people.length >= MAX_PEOPLE;

  function addPerson(event: FormEvent) {
    event.preventDefault();
    if (trimmed === "" || isDuplicate || isFull) {
      return;
    }
    dispatch({ type: "addPerson", id: newId(), name: trimmed });
    setName("");
  }

  return (
    <section className="section" aria-labelledby="people-heading">
      <h2 id="people-heading" className="section__heading">
        <span className="section__step">01</span>
        People
      </h2>

      {bill.people.length === 0 ? (
        <p className="hint">Nobody yet. Add everyone who ate, including whoever paid.</p>
      ) : (
        <ul className="plain-list">
          {bill.people.map((person) => (
            <PersonRow key={person.id} bill={bill} dispatch={dispatch} person={person} />
          ))}
        </ul>
      )}

      <form className="add-row" onSubmit={addPerson}>
        <label className="visually-hidden" htmlFor="new-person">
          Name of the person to add
        </label>
        <input
          id="new-person"
          className="text-input"
          placeholder="Name"
          maxLength={MAX_PERSON_NAME}
          autoComplete="off"
          aria-invalid={isDuplicate}
          aria-describedby={isDuplicate || isFull ? "new-person-error" : undefined}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button type="submit" className="button" disabled={trimmed === "" || isDuplicate || isFull}>
          <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
          Add person
        </button>
      </form>
      {(isFull || isDuplicate) && (
        <p id="new-person-error" className="field-error">
          {isFull
            ? `A bill holds up to ${MAX_PEOPLE} people. Remove someone to add another.`
            : `${trimmed} is already on the list. Use a different name, like a nickname.`}
        </p>
      )}
    </section>
  );
}
