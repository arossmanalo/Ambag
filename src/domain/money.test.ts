import { describe, expect, it } from "vitest";
import { formatPesos, parsePercent, parsePesos } from "./money";

describe("parsePesos", () => {
  it("reads plain, comma-grouped and peso-signed amounts", () => {
    expect(parsePesos("1500")).toBe(150_000);
    expect(parsePesos("1,500.50")).toBe(150_050);
    expect(parsePesos("₱ 250")).toBe(25_000);
    expect(parsePesos(".5")).toBe(50);
    expect(parsePesos("0.07")).toBe(7);
    expect(parsePesos("0")).toBe(0);
  });

  it("stays exact where floats would not", () => {
    expect(parsePesos("0.29")).toBe(29);
    expect(parsePesos("1.15")).toBe(115);
  });

  it("rejects empty, negative, wordy and over-precise input", () => {
    expect(parsePesos("")).toBeNull();
    expect(parsePesos(".")).toBeNull();
    expect(parsePesos("-5")).toBeNull();
    expect(parsePesos("abc")).toBeNull();
    expect(parsePesos("1.234")).toBeNull();
    expect(parsePesos("1234567890")).toBeNull();
  });
});

describe("formatPesos", () => {
  it("groups thousands and always shows centavos", () => {
    expect(formatPesos(150_000)).toBe("₱1,500.00");
    expect(formatPesos(5)).toBe("₱0.05");
    expect(formatPesos(-45_050)).toBe("-₱450.50");
  });
});

describe("parsePercent", () => {
  it("reads percentages as basis points", () => {
    expect(parsePercent("10")).toBe(1_000);
    expect(parsePercent("12.5%")).toBe(1_250);
    expect(parsePercent("100")).toBe(10_000);
  });

  it("rejects more than 100 percent and non-numbers", () => {
    expect(parsePercent("100.01")).toBeNull();
    expect(parsePercent("")).toBeNull();
    expect(parsePercent("-1")).toBeNull();
  });
});
