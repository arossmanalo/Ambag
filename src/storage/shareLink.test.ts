import { describe, expect, it } from "vitest";
import { emptyBill, type Bill } from "../domain/bill";
import { buildShareUrl, encodeBill, readBillFromHash } from "./shareLink";

const bill: Bill = {
  ...emptyBill(),
  title: "Kainan sa Niño's ₱",
  people: [
    { id: "ana", name: "Ana" },
    { id: "ben", name: "Ben" },
  ],
  items: [{ id: "i1", name: "Sisig", priceCentavos: 30_000, sharedBy: ["ana", "ben"] }],
  serviceCharge: { kind: "percent", basisPoints: 1_000 },
  payments: [{ personId: "ana", handedCentavos: 50_000 }],
};

describe("share link", () => {
  it("round-trips a bill, including non-ASCII text", () => {
    const url = buildShareUrl(bill, "https://example.test/ambag/#b=old");
    expect(url.startsWith("https://example.test/ambag/#b=")).toBe(true);
    const hash = url.slice(url.indexOf("#"));
    expect(readBillFromHash(hash)).toEqual({ kind: "bill", bill });
  });

  it("uses only URL-safe characters", () => {
    expect(encodeBill(bill)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("reports no bill when the hash is something else", () => {
    expect(readBillFromHash("")).toEqual({ kind: "none" });
    expect(readBillFromHash("#top")).toEqual({ kind: "none" });
  });

  it("rejects a cut-off or altered link", () => {
    const encoded = encodeBill(bill);
    expect(readBillFromHash(`#b=${encoded.slice(0, 20)}`)).toEqual({ kind: "invalid" });
    expect(readBillFromHash("#b=!!!")).toEqual({ kind: "invalid" });
  });

  it("rejects a bill that refers to people who are not on it", () => {
    const broken = {
      ...bill,
      payments: [{ personId: "ghost", handedCentavos: 100 }],
    };
    expect(readBillFromHash(`#b=${encodeBill(broken)}`)).toEqual({ kind: "invalid" });
  });
});
