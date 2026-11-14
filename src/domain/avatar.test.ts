import { describe, expect, it } from "vitest";
import { AVATAR_TONE_COUNT, avatarTones, initialsOf } from "./avatar";

function peopleNamed(count: number) {
  return Array.from({ length: count }, (_, index) => ({ id: `p${index}`, name: `P${index}` }));
}

describe("initialsOf", () => {
  it("takes the first letter of up to two words", () => {
    expect(initialsOf("ana")).toBe("A");
    expect(initialsOf("  Ana  dela Cruz ")).toBe("AD");
    expect(initialsOf("Ñino")).toBe("Ñ");
  });
});

describe("avatarTones", () => {
  it("gives everyone a different colour while there are colours left", () => {
    const tones = avatarTones(peopleNamed(AVATAR_TONE_COUNT));
    expect(new Set(tones.values()).size).toBe(AVATAR_TONE_COUNT);
  });

  it("reuses colours once there are more people than colours", () => {
    const tones = avatarTones(peopleNamed(AVATAR_TONE_COUNT + 3));
    expect(tones.size).toBe(AVATAR_TONE_COUNT + 3);
    for (const tone of tones.values()) {
      expect(tone).toBeGreaterThanOrEqual(0);
      expect(tone).toBeLessThan(AVATAR_TONE_COUNT);
    }
  });

  it("ties a colour to the person, not to their place in the list", () => {
    const [ana, ...others] = peopleNamed(10);
    const soloTone = (person: { id: string; name: string }) => avatarTones([person]).get(person.id);
    const ben = others.find((person) => soloTone(person) !== soloTone(ana));
    if (ben === undefined) {
      throw new Error("expected two people with different colours");
    }
    expect(avatarTones([ana, ben]).get(ben.id)).toBe(soloTone(ben));
    expect(avatarTones([ben, ana]).get(ben.id)).toBe(soloTone(ben));
    expect(avatarTones([ben, ana]).get(ana.id)).toBe(soloTone(ana));
  });
});
