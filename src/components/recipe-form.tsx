"use client";
import { useState } from "react";

interface Recipe { id: number; name: string; kcal: number; proteinG: number; carbsG: number; fatG: number; servings: number; notes: string | null; }

export function RecipeForm({ recipe, onClose }: { recipe: Recipe | null; onClose: () => void }) {
  const [r, setR] = useState({
    name: recipe?.name ?? "", kcal: recipe?.kcal ?? 0, proteinG: recipe?.proteinG ?? 0,
    carbsG: recipe?.carbsG ?? 0, fatG: recipe?.fatG ?? 0, servings: recipe?.servings ?? 1,
    notes: recipe?.notes ?? "",
  });
  const save = async () => {
    const url = recipe ? `/api/recipes/${recipe.id}` : "/api/recipes";
    await fetch(url, {
      method: recipe ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(r),
    });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="p-6 rounded max-w-md w-full mx-4 space-y-3" style={{ background: "var(--paper)", color: "var(--ink)" }}>
        <h2 className="font-bold text-lg">{recipe ? "Edit" : "New"} Recipe</h2>
        <input placeholder="Name" value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })}
          className="w-full px-3 py-2 rounded" style={{ background: "var(--paper-accent)", color: "var(--ink)" }} />
        {(["kcal", "proteinG", "carbsG", "fatG", "servings"] as const).map((k) => (
          <label key={k} className="flex justify-between items-center">
            <span className="text-sm">{k}</span>
            <input type="number" step="0.1" value={r[k] as number}
              onChange={(e) => setR({ ...r, [k]: Number(e.target.value) })}
              className="px-2 py-1 w-24 rounded text-right" style={{ background: "var(--paper-accent)", color: "var(--ink)" }} />
          </label>
        ))}
        <textarea placeholder="Notes" value={r.notes} onChange={(e) => setR({ ...r, notes: e.target.value })}
          className="w-full px-3 py-2 rounded" style={{ background: "var(--paper-accent)", color: "var(--ink)" }} />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 rounded text-xs uppercase" style={{ background: "var(--paper-accent)", color: "var(--ink-soft)" }}>Cancel</button>
          <button onClick={save} className="px-3 py-2 rounded text-xs uppercase font-bold" style={{ background: "var(--accent)", color: "#f4ecd8" }}>Save</button>
        </div>
      </div>
    </div>
  );
}
