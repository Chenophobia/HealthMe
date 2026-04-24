import { prisma } from "@/lib/prisma";
import { MealsClient } from "./meals-client";
import { normalizeToLocalMidnight } from "@/lib/date-normalize";

const TZ = process.env.APP_TZ ?? "UTC";

export default async function MealsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: dateParam } = await searchParams;
  const dateStr = dateParam ?? new Date().toISOString().slice(0, 10);
  const day = normalizeToLocalMidnight(dateStr, TZ);
  const [meals, recipes] = await Promise.all([
    prisma.mealLog.findMany({ where: { consumedAt: day }, include: { recipe: true } }),
    prisma.recipe.findMany({ orderBy: { name: "asc" } }),
  ]);
  const serMeals = meals.map((m) => ({
    ...m,
    consumedAt: m.consumedAt.toISOString(),
    createdAt: m.createdAt.toISOString(),
    recipe: m.recipe ? { ...m.recipe, createdAt: m.recipe.createdAt.toISOString() } : null,
  }));
  return <MealsClient date={dateStr} meals={serMeals} recipes={recipes.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} />;
}
