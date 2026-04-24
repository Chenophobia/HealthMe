"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RecipeForm } from "@/components/recipe-form";

interface Recipe { id: number; name: string; kcal: number; proteinG: number; carbsG: number; fatG: number; servings: number; notes: string | null; createdAt: string; }

export function RecipesClient({ recipes }: { recipes: Recipe[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Recipe | "new" | null>(null);
  const [search, setSearch] = useState("");

  const remove = async (id: number) => {
    if (!confirm("Delete this recipe?")) return;
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const filtered = recipes.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Recipes</h1>
        <div className="flex gap-2">
          <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 rounded" style={{ background: "var(--paper-accent)", color: "var(--ink)" }} />
          <button onClick={() => setEditing("new")} className="px-3 py-2 rounded text-xs uppercase font-bold"
            style={{ background: "var(--accent)", color: "#f4ecd8" }}>+ New</button>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {filtered.map((r) => (
          <div key={r.id} className="p-4 rounded" style={{ background: "var(--paper-accent)" }}>
            <div className="flex justify-between">
              <h3 className="font-bold">{r.name}</h3>
              <div className="flex gap-2 text-xs">
                <button onClick={() => setEditing(r)}>edit</button>
                <button onClick={() => remove(r.id)} style={{ color: "var(--accent)" }}>×</button>
              </div>
            </div>
            <div className="text-sm mt-2" style={{ color: "var(--ink-soft)" }}>
              {r.kcal} kcal · {r.servings} serving{r.servings === 1 ? "" : "s"}
            </div>
            <div className="text-xs mt-1 flex gap-3" style={{ color: "var(--ink-faded)" }}>
              <span>P {r.proteinG}g</span><span>C {r.carbsG}g</span><span>F {r.fatG}g</span>
            </div>
          </div>
        ))}
      </div>
      {editing && <RecipeForm recipe={editing === "new" ? null : editing} onClose={() => { setEditing(null); router.refresh(); }} />}
    </div>
  );
}
