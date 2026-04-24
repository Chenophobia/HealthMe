export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { RecipesClient } from "./recipes-client";

export default async function RecipesPage() {
  const recipes = await prisma.recipe.findMany({ orderBy: { name: "asc" } });
  return <RecipesClient recipes={recipes.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} />;
}
