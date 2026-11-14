import { z } from "zod";

/** ₱999,999,999.99. Keeps every sum well inside the safe integer range. */
export const MAX_CENTAVOS = 99_999_999_999;
export const MAX_BASIS_POINTS = 10_000;
export const MAX_PEOPLE = 50;
export const MAX_ITEMS = 200;
export const MAX_PERSON_NAME = 40;
export const MAX_ITEM_NAME = 60;
export const MAX_TITLE = 80;

const centavosSchema = z.number().int().min(0).max(MAX_CENTAVOS);
const idSchema = z.string().min(1).max(40);

const adjustmentSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("percent"),
    basisPoints: z.number().int().min(0).max(MAX_BASIS_POINTS),
  }),
  z.object({ kind: z.literal("amount"), centavos: centavosSchema }),
]);

export const billSchema = z
  .object({
    version: z.literal(1),
    title: z.string().max(MAX_TITLE),
    people: z
      .array(z.object({ id: idSchema, name: z.string().min(1).max(MAX_PERSON_NAME) }))
      .max(MAX_PEOPLE),
    items: z
      .array(
        z.object({
          id: idSchema,
          name: z.string().max(MAX_ITEM_NAME),
          priceCentavos: centavosSchema,
          sharedBy: z.array(idSchema),
        }),
      )
      .max(MAX_ITEMS),
    serviceCharge: adjustmentSchema.nullable(),
    discount: adjustmentSchema.nullable(),
    payments: z.array(z.object({ personId: idSchema, handedCentavos: centavosSchema })),
  })
  .superRefine((bill, context) => {
    const personIds = new Set(bill.people.map((person) => person.id));
    if (personIds.size !== bill.people.length) {
      context.addIssue({ code: "custom", message: "Two people share the same id" });
    }
    const itemIds = new Set(bill.items.map((item) => item.id));
    if (itemIds.size !== bill.items.length) {
      context.addIssue({ code: "custom", message: "Two items share the same id" });
    }
    for (const item of bill.items) {
      const sharers = new Set(item.sharedBy);
      const allKnown = item.sharedBy.every((id) => personIds.has(id));
      if (!allKnown || sharers.size !== item.sharedBy.length) {
        context.addIssue({ code: "custom", message: "An item lists an unknown or repeated person" });
      }
    }
    const payerIds = new Set(bill.payments.map((payment) => payment.personId));
    const payersKnown = bill.payments.every((payment) => personIds.has(payment.personId));
    if (!payersKnown || payerIds.size !== bill.payments.length) {
      context.addIssue({ code: "custom", message: "A payment lists an unknown or repeated person" });
    }
  });

export type Bill = z.infer<typeof billSchema>;
export type Person = Bill["people"][number];
export type Item = Bill["items"][number];
export type Adjustment = z.infer<typeof adjustmentSchema>;

export function emptyBill(): Bill {
  return {
    version: 1,
    title: "",
    people: [],
    items: [],
    serviceCharge: null,
    discount: null,
    payments: [],
  };
}

export function isBillEmpty(bill: Bill): boolean {
  return bill.title === "" && bill.people.length === 0 && bill.items.length === 0;
}

export function isNameTaken(people: Person[], name: string, exceptPersonId?: string): boolean {
  const wanted = name.trim().toLowerCase();
  return people.some(
    (person) => person.id !== exceptPersonId && person.name.toLowerCase() === wanted,
  );
}

/** Short ids keep the share link small. */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0")).join("");
}
