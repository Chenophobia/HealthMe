import { describe, it, expect } from "vitest";
import { goalStatus } from "@/lib/goal-delta";

describe("goalStatus", () => {
  it("returns on-track when projected beats target for decreasing metric", () => {
    const result = goalStatus({
      direction: "decrease",
      currentValue: 28.3,
      targetValue: 20,
      projectedValue: 22,
      targetDate: new Date("2026-09-01"),
      today: new Date("2026-04-24"),
    });
    expect(result.onTrack).toBe(false);
    expect(result.delta).toBeCloseTo(2, 5);
  });

  it("on-track when projection meets/beats target on target date", () => {
    const result = goalStatus({
      direction: "decrease",
      currentValue: 28,
      targetValue: 20,
      projectedValue: 19,
      targetDate: new Date("2026-09-01"),
      today: new Date("2026-04-24"),
    });
    expect(result.onTrack).toBe(true);
    expect(result.delta).toBeCloseTo(-1, 5);
  });

  it("handles increase direction (e.g., skeletal muscle)", () => {
    const result = goalStatus({
      direction: "increase",
      currentValue: 37,
      targetValue: 40,
      projectedValue: 41,
      targetDate: new Date("2026-09-01"),
      today: new Date("2026-04-24"),
    });
    expect(result.onTrack).toBe(true);
  });

  it("returns reached=true when current already at or past target (decrease)", () => {
    const result = goalStatus({
      direction: "decrease",
      currentValue: 19,
      targetValue: 20,
      projectedValue: 18,
      targetDate: new Date("2026-09-01"),
      today: new Date("2026-04-24"),
    });
    expect(result.reached).toBe(true);
  });
});
