import { describe, it, expect } from "vitest";
import { linearRegression, project } from "@/lib/regression";

describe("linearRegression", () => {
  it("returns null for fewer than 3 points", () => {
    expect(linearRegression([])).toBeNull();
    expect(linearRegression([{ x: 0, y: 1 }, { x: 1, y: 2 }])).toBeNull();
  });

  it("computes slope and intercept for a straight line", () => {
    const r = linearRegression([
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 6 },
    ]);
    expect(r).not.toBeNull();
    expect(r!.slope).toBeCloseTo(2, 5);
    expect(r!.intercept).toBeCloseTo(0, 5);
  });

  it("handles noisy data", () => {
    const r = linearRegression([
      { x: 0, y: 1 },
      { x: 1, y: 2.9 },
      { x: 2, y: 5.1 },
      { x: 3, y: 6.8 },
    ]);
    expect(r!.slope).toBeGreaterThan(1.9);
    expect(r!.slope).toBeLessThan(2.1);
  });
});

describe("project", () => {
  it("extrapolates at a given x", () => {
    const r = { slope: 2, intercept: 1 };
    expect(project(r, 5)).toBe(11);
  });
});
