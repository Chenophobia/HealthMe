import { describe, it, expect } from "vitest";

describe("photo route (shape only)", () => {
  it("is a module that exports POST", async () => {
    const mod = await import("@/app/api/metrics/photo/route");
    expect(typeof mod.POST).toBe("function");
  });
});
