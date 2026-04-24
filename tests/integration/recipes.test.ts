import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb } from "./setup";

describe("recipes DB", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  beforeAll(async () => { ctx = await createTestDb(); });
  afterAll(() => ctx.cleanup());

  it("creates, lists, updates, deletes", async () => {
    const r = await ctx.prisma.recipe.create({
      data: { name: "Oats", kcal: 300, proteinG: 10, carbsG: 50, fatG: 5, servings: 1 },
    });
    expect(r.id).toBeDefined();

    const list = await ctx.prisma.recipe.findMany();
    expect(list).toHaveLength(1);

    const updated = await ctx.prisma.recipe.update({
      where: { id: r.id }, data: { kcal: 320 },
    });
    expect(updated.kcal).toBe(320);

    await ctx.prisma.recipe.delete({ where: { id: r.id } });
    expect(await ctx.prisma.recipe.count()).toBe(0);
  });
});
