import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb } from "./setup";

describe("meal logs", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  beforeAll(async () => { ctx = await createTestDb(); });
  afterAll(() => ctx.cleanup());

  it("creates recipe-based and quick entries", async () => {
    const recipe = await ctx.prisma.recipe.create({
      data: { name: "Eggs", kcal: 200, proteinG: 15, carbsG: 2, fatG: 14, servings: 1 },
    });
    const r1 = await ctx.prisma.mealLog.create({
      data: {
        consumedAt: new Date("2026-04-24T00:00:00Z"),
        slot: "BREAKFAST",
        recipeId: recipe.id,
        servings: 1,
      },
    });
    expect(r1.recipeId).toBe(recipe.id);

    const r2 = await ctx.prisma.mealLog.create({
      data: {
        consumedAt: new Date("2026-04-24T00:00:00Z"),
        slot: "SNACK",
        quickName: "Coffee",
        quickKcal: 5,
        quickProteinG: 0,
        quickCarbsG: 1,
        quickFatG: 0,
      },
    });
    expect(r2.quickName).toBe("Coffee");
  });

  it("queries meals by date", async () => {
    const rows = await ctx.prisma.mealLog.findMany({
      where: { consumedAt: new Date("2026-04-24T00:00:00Z") },
    });
    expect(rows.length).toBeGreaterThan(0);
  });
});
