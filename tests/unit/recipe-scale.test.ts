import { describe, it, expect } from "vitest";
import { scaleRecipe } from "@/lib/recipe-scale";

describe("scaleRecipe", () => {
  it("multiplies all macros by servings factor", () => {
    const recipe = { kcal: 400, proteinG: 30, carbsG: 50, fatG: 10, servings: 2 };
    const scaled = scaleRecipe(recipe, 1);
    expect(scaled.kcal).toBe(200);
    expect(scaled.proteinG).toBe(15);
    expect(scaled.carbsG).toBe(25);
    expect(scaled.fatG).toBe(5);
  });

  it("handles fractional consumption", () => {
    const recipe = { kcal: 100, proteinG: 10, carbsG: 10, fatG: 10, servings: 1 };
    const scaled = scaleRecipe(recipe, 0.5);
    expect(scaled.kcal).toBe(50);
  });

  it("rounds kcal to integer", () => {
    const recipe = { kcal: 333, proteinG: 20, carbsG: 30, fatG: 10, servings: 3 };
    const scaled = scaleRecipe(recipe, 1);
    expect(scaled.kcal).toBe(111);
    expect(Number.isInteger(scaled.kcal)).toBe(true);
  });
});
