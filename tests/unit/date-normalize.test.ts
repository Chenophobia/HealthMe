import { describe, it, expect } from "vitest";
import { normalizeToLocalMidnight, daysBetween } from "@/lib/date-normalize";

describe("normalizeToLocalMidnight", () => {
  it("returns midnight for a given date in given tz", () => {
    const result = normalizeToLocalMidnight("2026-04-24", "America/New_York");
    expect(result.toISOString()).toBe("2026-04-24T04:00:00.000Z");
  });

  it("works for UTC", () => {
    const result = normalizeToLocalMidnight("2026-04-24", "UTC");
    expect(result.toISOString()).toBe("2026-04-24T00:00:00.000Z");
  });
});

describe("daysBetween", () => {
  it("counts whole days between two Date objects", () => {
    const a = new Date("2026-04-01T00:00:00Z");
    const b = new Date("2026-04-11T00:00:00Z");
    expect(daysBetween(a, b)).toBe(10);
  });

  it("is signed", () => {
    const a = new Date("2026-04-11T00:00:00Z");
    const b = new Date("2026-04-01T00:00:00Z");
    expect(daysBetween(a, b)).toBe(-10);
  });
});
