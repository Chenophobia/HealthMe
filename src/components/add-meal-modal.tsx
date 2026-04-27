"use client";
import { useState } from "react";

interface Recipe { id: number; name: string; kcal: number; proteinG: number; carbsG: number; fatG: number; servings: number; category?: "HEAVY" | "LIGHT"; }

export function AddMealModal({ date, slot, recipes, onClose }: {
  date: string; slot: string; recipes: Recipe[]; onClose: () => void;
}) {
  const [tab, setTab] = useState<"recipe" | "quick">("recipe");
  const [recipeId, setRecipeId] = useState<number | null>(recipes[0]?.id ?? null);
  const [servings, setServings] = useState(1);
  const [quick, setQuick] = useState({ name: "", kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  const [search, setSearch] = useState("");

  const save = async () => {
    const body = tab === "recipe"
      ? { date, slot, recipeId, servings }
      : { date, slot, quick };
    await fetch("/api/meals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    onClose();
  };

  const slotPreferred = slot === "LUNCH" || slot === "DINNER" ? "HEAVY" : "LIGHT";
  const filtered = recipes
    .filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aMatch = a.category === slotPreferred ? 0 : 1;
      const bMatch = b.category === slotPreferred ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="p-6 rounded max-w-md w-full mx-4" style={{ background: "var(--paper)", color: "var(--ink)" }}>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab("recipe")} className="px-3 py-1 rounded text-xs uppercase"
            style={{ background: tab === "recipe" ? "var(--accent)" : "var(--paper-accent)", color: tab === "recipe" ? "#f4ecd8" : "var(--ink-soft)" }}>Recipe</button>
          <button onClick={() => setTab("quick")} className="px-3 py-1 rounded text-xs uppercase"
            style={{ background: tab === "quick" ? "var(--accent)" : "var(--paper-accent)", color: tab === "quick" ? "#f4ecd8" : "var(--ink-soft)" }}>Quick entry</button>
        </div>
        {tab === "recipe" ? (
          <div className="space-y-3">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search recipes…"
              className="w-full px-3 py-2 rounded" style={{ background: "var(--paper-accent)", color: "var(--ink)" }} />
            <select value={recipeId ?? ""} onChange={(e) => setRecipeId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded" style={{ background: "var(--paper-accent)", color: "var(--ink)" }}>
              {filtered.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.kcal} kcal/serving)</option>)}
            </select>
            <label className="flex items-center gap-2">
              Servings:
              <input type="number" step="0.25" value={servings} onChange={(e) => setServings(Number(e.target.value))}
                className="px-2 py-1 w-20 rounded" style={{ background: "var(--paper-accent)", color: "var(--ink)" }} />
            </label>
          </div>
        ) : (
          <div className="space-y-2">
            <input placeholder="Name" value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })}
              className="w-full px-3 py-2 rounded" style={{ background: "var(--paper-accent)", color: "var(--ink)" }} />
            {(["kcal", "proteinG", "carbsG", "fatG"] as const).map((k) => (
              <label key={k} className="flex justify-between items-center">
                <span className="text-sm">{k}</span>
                <input type="number" step="0.1" value={quick[k]}
                  onChange={(e) => setQuick({ ...quick, [k]: Number(e.target.value) })}
                  className="px-2 py-1 w-24 rounded text-right" style={{ background: "var(--paper-accent)", color: "var(--ink)" }} />
              </label>
            ))}
          </div>
        )}
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose} className="px-3 py-2 rounded text-xs uppercase" style={{ background: "var(--paper-accent)", color: "var(--ink-soft)" }}>Cancel</button>
          <button onClick={save} className="px-3 py-2 rounded text-xs uppercase font-bold" style={{ background: "var(--accent)", color: "#f4ecd8" }}>Save</button>
        </div>
      </div>
    </div>
  );
}
