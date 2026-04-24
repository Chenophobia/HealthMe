import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb } from "./setup";

describe("predict math", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  beforeAll(async () => {
    ctx = await createTestDb();
    for (let i = 0; i < 5; i++) {
      await ctx.prisma.bodyMetric.create({
        data: {
          capturedAt: new Date(Date.now() - (5 - i) * 86400_000),
          weightKg: 80 - i * 0.2,
          source: "MANUAL",
        },
      });
    }
  });
  afterAll(() => ctx.cleanup());

  it("has enough data", async () => {
    const rows = await ctx.prisma.bodyMetric.count();
    expect(rows).toBe(5);
  });
});
