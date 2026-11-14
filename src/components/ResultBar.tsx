import { ArrowDown } from "lucide-react";
import { useEffect, useState } from "react";
import { formatPesos } from "../domain/money";

type ResultBarProps = {
  /** Id of the section holding the full result. */
  targetId: string;
  totalCentavos: number;
  status: string;
};

/**
 * On narrow screens the result sits below a long form. This bar keeps the
 * total and status in view and jumps to the result; it steps aside once the
 * result itself is on screen.
 */
export function ResultBar({ targetId, totalCentavos, status }: ResultBarProps) {
  const [isResultOnScreen, setIsResultOnScreen] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setIsResultOnScreen(entry.isIntersecting);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  function showResult() {
    const target = document.getElementById(targetId);
    target?.scrollIntoView({ block: "start" });
    target?.focus({ preventScroll: true });
  }

  if (isResultOnScreen) {
    return null;
  }

  return (
    <div className="result-bar">
      <p className="result-bar__total">
        <span className="result-bar__label">Bill total</span>
        <span className="amount">{formatPesos(totalCentavos)}</span>
      </p>
      <button type="button" className="button" onClick={showResult}>
        {status}
        <ArrowDown size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}
