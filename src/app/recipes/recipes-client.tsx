"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RecipeForm } from "@/components/recipe-form";

interface Recipe {
  id: number; name: string; kcal: number; proteinG: number; carbsG: number; fatG: number;
  servings: number; notes: string | null; category: "HEAVY" | "LIGHT"; createdAt: string;
}

export function RecipesClient({ recipes }: { recipes: Recipe[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Recipe | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "HEAVY" | "LIGHT">("all");

  const remove = async (id: number) => {
    if (!confirm("Delete this recipe?")) return;
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const matches = (r: Recipe) =>
    r.name.toLowerCase().includes(search.toLowerCase()) &&
    (filter === "all" || r.category === filter);
  const heavy = recipes.filter((r) => r.category === "HEAVY" && matches(r));
  const light = recipes.filter((r) => r.category === "LIGHT" && matches(r));

  const card = (r: Recipe) => (
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
  );

  const filterBtn = (key: typeof filter, label: string) => (
    <button
      onClick={() => setFilter(key)}
      className="px-3 py-1 rounded text-xs uppercase tracking-wider"
      style={{
        background: filter === key ? "var(--accent)" : "var(--paper-accent)",
        color: filter === key ? "#f4ecd8" : "var(--ink-soft)",
      }}
    >{label}</button>
  );

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Recipes</h1>
        <div className="flex gap-2 items-center flex-wrap">
          {filterBtn("all", "All")}
          {filterBtn("HEAVY", "Heavy")}
          {filterBtn("LIGHT", "Light")}
          <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 rounded" style={{ background: "var(--paper-accent)", color: "var(--ink)" }} />
          <button onClick={() => setEditing("new")} className="px-3 py-2 rounded text-xs uppercase font-bold"
            style={{ background: "var(--accent)", color: "#f4ecd8" }}>+ New</button>
        </div>
      </div>

      {(filter === "all" || filter === "HEAVY") && heavy.length > 0 && (
        <section className="space-y-3">
          <h2 className="uppercase tracking-widest text-xs" style={{ color: "var(--ink-faded)" }}>
            Heavy — Lunch / Dinner ({heavy.length})
          </h2>
          <div className="grid md:grid-cols-3 gap-4">{heavy.map(card)}</div>
        </section>
      )}

      {(filter === "all" || filter === "LIGHT") && light.length > 0 && (
        <section className="space-y-3">
          <h2 className="uppercase tracking-widest text-xs" style={{ color: "var(--ink-faded)" }}>
            Light — Breakfast / Snack / Drinks ({light.length})
          </h2>
          <div className="grid md:grid-cols-3 gap-4">{light.map(card)}</div>
        </section>
      )}

      {editing && <RecipeForm recipe={editing === "new" ? null : editing} onClose={() => { setEditing(null); router.refresh(); }} />}
    </div>
  );
}
