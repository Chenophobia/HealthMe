import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb } from "./setup";

describe("goals", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  beforeAll(async () => { ctx = await createTestDb(); });
  afterAll(() => ctx.cleanup());

  it("new goal for same metric deactivates prior", async () => {
    const g1 = await ctx.prisma.goal.create({
      data: { metric: "BODY_FAT_PCT", targetValue: 22, targetDate: new Date("2026-08-01"), active: true },
    });
    await ctx.prisma.goal.updateMany({
      where: { metric: "BODY_FAT_PCT", active: true },
      data: { active: false },
    });
    const g2 = await ctx.prisma.goal.create({
      data: { metric: "BODY_FAT_PCT", targetValue: 20, targetDate: new Date("2026-09-01"), active: true },
    });
    const refreshed = await ctx.prisma.goal.findUnique({ where: { id: g1.id } });
    expect(refreshed!.active).toBe(false);
    expect(g2.active).toBe(true);
  });
});
