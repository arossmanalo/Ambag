import { describe, expect, it } from "vitest";
import { emptyBill, type Bill } from "../domain/bill";
import { LIBRARY_KEY, loadLibrary, parseLibrary, saveLibrary, type SavedBill } from "./localBill";

const LEGACY_KEY = "ambag:bill:v1";
const NOW = new Date("2026-11-14T11:30:00.000Z");

function memoryStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

const dinner: Bill = {
  ...emptyBill(),
  title: "Friday dinner",
  people: [{ id: "ana", name: "Ana" }],
  items: [{ id: "i1", name: "Sisig", priceCentavos: 30_000, sharedBy: ["ana"] }],
};

const saved: SavedBill = {
  id: "b1",
  createdAt: "2026-11-13T10:00:00.000Z",
  updatedAt: "2026-11-13T12:00:00.000Z",
  bill: dinner,
};

describe("loadLibrary", () => {
  it("moves the single bill saved by earlier versions into the list", () => {
    const store = memoryStore({ [LEGACY_KEY]: JSON.stringify(dinner) });
    const bills = loadLibrary(store, NOW);
    expect(bills).toHaveLength(1);
    expect(bills[0].bill).toEqual(dinner);
    expect(bills[0].updatedAt).toBe(NOW.toISOString());
    expect(store.data.has(LEGACY_KEY)).toBe(false);
    expect(parseLibrary(store.getItem(LIBRARY_KEY))).toEqual(bills);
  });

  it("does not carry over an old bill that was still blank", () => {
    const store = memoryStore({ [LEGACY_KEY]: JSON.stringify(emptyBill()) });
    expect(loadLibrary(store, NOW)).toEqual([]);
    expect(store.data.has(LEGACY_KEY)).toBe(false);
  });

  it("starts empty on a fresh device", () => {
    expect(loadLibrary(memoryStore(), NOW)).toEqual([]);
  });

  it("reads back what was saved", () => {
    const store = memoryStore();
    saveLibrary([saved], store);
    expect(loadLibrary(store, NOW)).toEqual([saved]);
  });
});

describe("parseLibrary", () => {
  it("drops only the damaged entry and keeps the rest", () => {
    const broken = { ...saved, id: "b2", bill: { ...dinner, people: "nobody" } };
    expect(parseLibrary(JSON.stringify([saved, broken]))).toEqual([saved]);
  });

  it("keeps the first of two entries with the same id", () => {
    const twin = { ...saved, bill: { ...dinner, title: "Twin" } };
    expect(parseLibrary(JSON.stringify([saved, twin]))).toEqual([saved]);
  });

  it("returns nothing for text that is not a list", () => {
    expect(parseLibrary("not json")).toEqual([]);
    expect(parseLibrary(JSON.stringify(saved))).toEqual([]);
  });
});
