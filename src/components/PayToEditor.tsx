import { useState, type FormEvent } from "react";
import { MAX_PAY_ACCOUNT, PAY_METHODS, type PayMethod, type PayTo } from "../domain/bill";
import { PAY_METHOD_LABELS } from "../domain/summary";

type PayToEditorProps = {
  personId: string;
  personName: string;
  payTo: PayTo | undefined;
  /** Null clears the details. */
  onSave: (payTo: PayTo | null) => void;
  onClose: () => void;
};

const ACCOUNT_PLACEHOLDERS: Record<PayMethod, string> = {
  gcash: "Mobile number",
  maya: "Mobile number",
  bank: "Bank and account number",
  other: "How to pay them",
};

function isPayMethod(value: string): value is PayMethod {
  return PAY_METHODS.some((method) => method === value);
}

/** Where a person wants to receive money, so others can pay them back. */
export function PayToEditor({ personId, personName, payTo, onSave, onClose }: PayToEditorProps) {
  const [method, setMethod] = useState<PayMethod>(payTo?.method ?? "gcash");
  const [account, setAccount] = useState(payTo?.account ?? "");
  const methodId = `pay-method-${personId}`;
  const accountId = `pay-account-${personId}`;

  function save(event: FormEvent) {
    event.preventDefault();
    const trimmed = account.trim();
    onSave(trimmed === "" ? null : { method, account: trimmed });
    onClose();
  }

  return (
    <form
      className="pay-to-editor"
      onSubmit={save}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
    >
      <div className="pay-to-editor__fields">
        <label className="visually-hidden" htmlFor={methodId}>
          How {personName} receives money
        </label>
        <select
          id={methodId}
          className="select"
          value={method}
          onChange={(event) => {
            if (isPayMethod(event.target.value)) {
              setMethod(event.target.value);
            }
          }}
        >
          {PAY_METHODS.map((option) => (
            <option key={option} value={option}>
              {PAY_METHOD_LABELS[option]}
            </option>
          ))}
        </select>
        <label className="visually-hidden" htmlFor={accountId}>
          {personName}'s account
        </label>
        <input
          id={accountId}
          className="text-input"
          // The editor opens because the person asked to type here.
          autoFocus
          autoComplete="off"
          inputMode={method === "gcash" || method === "maya" ? "tel" : "text"}
          maxLength={MAX_PAY_ACCOUNT}
          placeholder={ACCOUNT_PLACEHOLDERS[method]}
          value={account}
          onChange={(event) => setAccount(event.target.value)}
        />
      </div>
      <div className="pay-to-editor__actions">
        <button type="submit" className="button">
          Save
        </button>
        <button type="button" className="button button--quiet" onClick={onClose}>
          Cancel
        </button>
        {payTo !== undefined && (
          <button
            type="button"
            className="button button--quiet"
            onClick={() => {
              onSave(null);
              onClose();
            }}
          >
            Remove details
          </button>
        )}
      </div>
    </form>
  );
}
