import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb } from "./setup";

describe("POST /api/metrics", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  beforeAll(async () => { ctx = await createTestDb(); });
  afterAll(() => ctx.cleanup());

  it("saves a manual metric entry", async () => {
    const metric = await ctx.prisma.bodyMetric.create({
      data: { capturedAt: new Date(), weightKg: 80, source: "MANUAL" },
    });
    expect(metric.id).toBeDefined();
    expect(metric.weightKg).toBe(80);
  });

  it("queries by range", async () => {
    const since = new Date(Date.now() - 7 * 86400_000);
    const rows = await ctx.prisma.bodyMetric.findMany({
      where: { capturedAt: { gte: since } },
      orderBy: { capturedAt: "asc" },
    });
    expect(rows.length).toBeGreaterThan(0);
  });
});
