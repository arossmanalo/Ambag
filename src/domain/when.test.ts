import { describe, expect, it } from "vitest";
import { formatUpdatedAt } from "./when";

// Built from local dates, so the results hold in any time zone the tests run in.
const now = new Date(2026, 10, 14, 21, 0);

describe("formatUpdatedAt", () => {
  it("gives the time for a bill changed today", () => {
    const at = new Date(2026, 10, 14, 19, 42).toISOString();
    expect(formatUpdatedAt(at, now, "en-US")).toBe("Today, 7:42 PM");
  });

  it("gives the day for an earlier date this year", () => {
    const at = new Date(2026, 10, 13, 23, 59).toISOString();
    expect(formatUpdatedAt(at, now, "en-GB")).toBe("13 Nov");
  });

  it("adds the year for an earlier year", () => {
    const at = new Date(2025, 11, 31, 12, 0).toISOString();
    expect(formatUpdatedAt(at, now, "en-GB")).toBe("31 Dec 2025");
  });
});
