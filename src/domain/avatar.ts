import type { Person } from "./bill";

/** How many monogram colours tokens.css defines (--tone-0 to --tone-5). */
export const AVATAR_TONE_COUNT = 6;

/** "Ana" → "A", "Ana Cruz" → "AC". */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toLocaleUpperCase();
}

function hashTone(personId: string): number {
  let hash = 0;
  for (const char of personId) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  }
  return hash % AVATAR_TONE_COUNT;
}

/**
 * A colour for each person. It comes from the person's id, so removing
 * someone rarely changes anyone else's colour, and it moves to the next free
 * colour on a clash, so nobody shares a colour until there are more people
 * than colours.
 */
export function avatarTones(people: Person[]): Map<string, number> {
  const used = new Set<number>();
  const tones = new Map<string, number>();
  for (const person of people) {
    let tone = hashTone(person.id);
    while (used.has(tone) && used.size < AVATAR_TONE_COUNT) {
      tone = (tone + 1) % AVATAR_TONE_COUNT;
    }
    used.add(tone);
    tones.set(person.id, tone);
  }
  return tones;
}
