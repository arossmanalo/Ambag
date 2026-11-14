import { Check } from "lucide-react";
import { avatarTones } from "../domain/avatar";
import type { Person } from "../domain/bill";
import { Avatar } from "./Avatar";

type PeopleChipsProps = {
  /** Read by screen readers, e.g. "Who ordered Sisig". */
  label: string;
  people: Person[];
  selectedIds: string[];
  onToggle: (personId: string) => void;
  onSelectAll: () => void;
};

/** One toggle per person, plus a shortcut that ticks everybody. */
export function PeopleChips({
  label,
  people,
  selectedIds,
  onToggle,
  onSelectAll,
}: PeopleChipsProps) {
  const tones = avatarTones(people);
  return (
    <div className="chips" role="group" aria-label={label}>
      {people.map((person) => {
        const isOn = selectedIds.includes(person.id);
        return (
          <button
            key={person.id}
            type="button"
            className="chip"
            aria-pressed={isOn}
            onClick={() => onToggle(person.id)}
          >
            <Avatar name={person.name} tone={tones.get(person.id)} size="sm" />
            {person.name}
            {isOn && <Check size={16} strokeWidth={2} aria-hidden="true" />}
          </button>
        );
      })}
      {people.length > 1 && selectedIds.length < people.length && (
        <button type="button" className="chip chip--action" onClick={onSelectAll}>
          All
        </button>
      )}
    </div>
  );
}
