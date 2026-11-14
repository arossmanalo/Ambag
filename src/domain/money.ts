import { MAX_BASIS_POINTS } from "./bill";

/**
 * Reads what a person typed ("1,500.50", "₱250", ".5") as centavos.
 * Works on the digits directly so no float rounding can creep in.
 */
export function parsePesos(text: string): number | null {
  const cleaned = text.replace(/[₱,\s]/g, "");
  const match = /^(\d{0,9})(?:\.(\d{0,2}))?$/.exec(cleaned);
  if (!match || !/\d/.test(cleaned)) {
    return null;
  }
  const whole = match[1] === "" ? 0 : Number(match[1]);
  const fraction = (match[2] ?? "").padEnd(2, "0");
  return whole * 100 + Number(fraction);
}

export function formatPesos(centavos: number): string {
  const sign = centavos < 0 ? "-" : "";
  return `${sign}₱${formatAmount(Math.abs(centavos))}`;
}

/** "1,500.00", without the peso sign. */
export function formatAmount(centavos: number): string {
  const whole = Math.floor(centavos / 100).toLocaleString("en-US");
  const fraction = String(centavos % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}

/** Reads "10" or "12.5" as basis points (hundredths of a percent). */
export function parsePercent(text: string): number | null {
  const cleaned = text.replace(/[%\s]/g, "");
  const match = /^(\d{0,3})(?:\.(\d{0,2}))?$/.exec(cleaned);
  if (!match || !/\d/.test(cleaned)) {
    return null;
  }
  const whole = match[1] === "" ? 0 : Number(match[1]);
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const basisPoints = whole * 100 + Number(fraction);
  return basisPoints <= MAX_BASIS_POINTS ? basisPoints : null;
}

export function formatPercent(basisPoints: number): string {
  return String(basisPoints / 100);
}
