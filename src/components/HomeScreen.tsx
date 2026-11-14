import { Check, Plus, Trash2 } from "lucide-react";
import { avatarTones } from "../domain/avatar";
import { formatPesos } from "../domain/money";
import { settle } from "../domain/settle";
import { computeTotals } from "../domain/split";
import { billStatus } from "../domain/summary";
import { formatUpdatedAt } from "../domain/when";
import type { SavedBill } from "../storage/localBill";
import { Avatar } from "./Avatar";

/** How many monograms a row shows before summing up the rest as "+N". */
const MAX_AVATARS = 5;

type HomeScreenProps = {
  bills: SavedBill[];
  onOpen: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
};

type BillRowProps = {
  saved: SavedBill;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
};

function billName(saved: SavedBill): string {
  const title = saved.bill.title.trim();
  return title === "" ? "Untitled bill" : title;
}

function BillRow({ saved, onOpen, onDelete }: BillRowProps) {
  const { bill } = saved;
  const totals = computeTotals(bill);
  const status = billStatus(totals, settle(bill, totals));
  const name = billName(saved);
  const tones = avatarTones(bill.people);
  const shown = bill.people.slice(0, MAX_AVATARS);
  const hidden = bill.people.length - shown.length;
  const peopleText =
    bill.people.length === 0
      ? "No people yet"
      : bill.people.length === 1
        ? "1 person"
        : `${bill.people.length} people`;

  function confirmDelete() {
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      onDelete(saved.id);
    }
  }

  return (
    <li className="bill-row">
      <button type="button" className="bill-row__open" onClick={() => onOpen(saved.id)}>
        <span className="bill-row__main">
          <span className="bill-row__title" data-untitled={bill.title.trim() === "" || undefined}>
            {name}
          </span>
          <span className="bill-row__meta">
            {peopleText} · {formatUpdatedAt(saved.updatedAt)}
          </span>
          {shown.length > 0 && (
            <span className="bill-row__people" aria-hidden="true">
              {shown.map((person) => (
                <Avatar key={person.id} name={person.name} tone={tones.get(person.id)} size="sm" />
              ))}
              {hidden > 0 && <span className="bill-row__more">+{hidden}</span>}
            </span>
          )}
        </span>
        <span className="bill-row__side">
          <span className="amount bill-row__total">{formatPesos(totals.totalCentavos)}</span>
          <span className="bill-row__status" data-tone={status.tone}>
            {status.tone === "done" && <Check size={16} strokeWidth={2} aria-hidden="true" />}
            {status.label}
          </span>
        </span>
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label={`Delete ${name}`}
        title={`Delete ${name}`}
        onClick={confirmDelete}
      >
        <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </li>
  );
}

/** Every bill saved on this device, most recently changed first. */
export function HomeScreen({ bills, onOpen, onCreate, onDelete }: HomeScreenProps) {
  const newestFirst = [...bills].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  if (newestFirst.length === 0) {
    return (
      <section className="home home--empty" aria-labelledby="home-heading">
        <h2 id="home-heading" className="home__title">
          No bills yet
        </h2>
        <p className="home__lede">
          Start one at the table: add who ate, what each person ordered, and who handed over the
          cash. Ambag works out each share and who pays whom.
        </p>
        <button type="button" className="button" onClick={onCreate}>
          <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
          Start a bill
        </button>
      </section>
    );
  }

  return (
    <section className="home" aria-labelledby="home-heading">
      <div className="home__header">
        <div>
          <h2 id="home-heading" className="home__title">
            Your bills
          </h2>
          <p className="hint">
            {newestFirst.length === 1 ? "1 bill" : `${newestFirst.length} bills`} saved on this
            device
          </p>
        </div>
        <button type="button" className="button" onClick={onCreate}>
          <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
          New bill
        </button>
      </div>
      <ul className="bill-list">
        {newestFirst.map((saved) => (
          <BillRow key={saved.id} saved={saved} onOpen={onOpen} onDelete={onDelete} />
        ))}
      </ul>
    </section>
  );
}
