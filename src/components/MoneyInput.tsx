import { useState } from "react";
import { formatAmount, formatPercent, parsePercent, parsePesos } from "../domain/money";

type Unit = "peso" | "percent";

type MoneyInputProps = {
  id: string;
  unit: Unit;
  /** Centavos for pesos, basis points for percent. Null shows an empty field. */
  value: number | null;
  /** Called with null when the field is cleared. Invalid text is not reported. */
  onChange: (value: number | null) => void;
  ariaLabel?: string;
  placeholder?: string;
};

function parse(unit: Unit, text: string): number | null {
  return unit === "peso" ? parsePesos(text) : parsePercent(text);
}

function displayText(unit: Unit, value: number | null): string {
  if (value === null) {
    return "";
  }
  return unit === "peso" ? formatAmount(value) : formatPercent(value);
}

/** Plain digits are easier to edit than "1,500.00". */
function editingText(unit: Unit, value: number | null): string {
  if (value === null || value === 0) {
    return "";
  }
  return displayText(unit, value).replace(/,/g, "").replace(/\.00$/, "");
}

export function MoneyInput({ id, unit, value, onChange, ariaLabel, placeholder }: MoneyInputProps) {
  // While focused the field shows what was typed; otherwise it shows the saved value,
  // so text that could not be read simply reverts on blur.
  const [draft, setDraft] = useState<string | null>(null);
  const isInvalid = draft !== null && draft.trim() !== "" && parse(unit, draft) === null;

  function handleChange(text: string) {
    setDraft(text);
    if (text.trim() === "") {
      onChange(null);
      return;
    }
    const parsed = parse(unit, text);
    if (parsed !== null) {
      onChange(parsed);
    }
  }

  return (
    <span className={`money-input money-input--${unit}`} data-invalid={isInvalid || undefined}>
      <span className="money-input__unit" aria-hidden="true">
        {unit === "peso" ? "₱" : "%"}
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={ariaLabel}
        aria-invalid={isInvalid}
        placeholder={placeholder ?? (unit === "peso" ? "0.00" : "0")}
        value={draft ?? displayText(unit, value)}
        onFocus={() => setDraft(editingText(unit, value))}
        onBlur={() => setDraft(null)}
        onChange={(event) => handleChange(event.target.value)}
      />
    </span>
  );
}
