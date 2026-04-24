import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb } from "./setup";

describe("activity log", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  beforeAll(async () => { ctx = await createTestDb(); });
  afterAll(() => ctx.cleanup());

  it("writes one row per (date, source)", async () => {
    const d = new Date("2026-04-24T00:00:00Z");
    await ctx.prisma.activityLog.create({ data: { loggedAt: d, activeKcal: 500, source: "SHORTCUT" } });
    await expect(
      ctx.prisma.activityLog.create({ data: { loggedAt: d, activeKcal: 600, source: "SHORTCUT" } })
    ).rejects.toThrow();
  });
});
