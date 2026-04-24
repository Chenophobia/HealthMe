"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddMealModal } from "@/components/add-meal-modal";
import { scaleRecipe } from "@/lib/recipe-scale";

const SLOTS = ["BREAKFAST", "LUNCH", "SNACK", "DINNER"] as const;
type Slot = typeof SLOTS[number];

interface Meal {
  id: number;
  slot: Slot;
  servings: number | null;
  quickName: string | null;
  quickKcal: number | null;
  quickProteinG: number | null;
  quickCarbsG: number | null;
  quickFatG: number | null;
  recipe: { id: number; name: string; kcal: number; proteinG: number; carbsG: number; fatG: number; servings: number } | null;
}
interface Recipe { id: number; name: string; kcal: number; proteinG: number; carbsG: number; fatG: number; servings: number; }

export function MealsClient({ date, meals, recipes }: { date: string; meals: Meal[]; recipes: Recipe[] }) {
  const router = useRouter();
  const [modalSlot, setModalSlot] = useState<Slot | null>(null);

  const mealKcal = (m: Meal): number => {
    if (m.recipe && m.servings != null) return scaleRecipe(m.recipe, m.servings).kcal;
    return m.quickKcal ?? 0;
  };
  const mealName = (m: Meal) => m.recipe?.name ?? m.quickName ?? "?";

  const remove = async (id: number) => {
    await fetch(`/api/meals/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const copyYesterday = async (slot: Slot) => {
    const yesterday = new Date(new Date(date).getTime() - 86400_000).toISOString().slice(0, 10);
    await fetch("/api/meals/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromDate: yesterday, toDate: date, slots: [slot] }),
    });
    router.refresh();
  };

  const total = meals.reduce((s, m) => s + mealKcal(m), 0);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Meals</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => router.push(`/meals?date=${e.target.value}`)}
          className="px-3 py-2 rounded"
          style={{ background: "var(--paper-accent)", color: "var(--ink)" }}
        />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {SLOTS.map((slot) => {
          const entries = meals.filter((m) => m.slot === slot);
          const slotKcal = entries.reduce((s, m) => s + mealKcal(m), 0);
          return (
            <div key={slot} className="p-4 rounded" style={{ background: "var(--paper-accent)" }}>
              <div className="flex justify-between items-center mb-3">
                <div className="uppercase tracking-wider font-bold text-sm">{slot.toLowerCase()}</div>
                <div className="text-xs" style={{ color: "var(--ink-faded)" }}>{slotKcal} kcal</div>
              </div>
              <ul className="space-y-2 mb-3">
                {entries.map((e) => (
                  <li key={e.id} className="flex justify-between text-sm">
                    <span>{mealName(e)}{e.servings != null ? ` × ${e.servings}` : ""}</span>
                    <span>
                      <span className="mr-3">{mealKcal(e)} kcal</span>
                      <button onClick={() => remove(e.id)} style={{ color: "var(--accent)" }}>×</button>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <button
                  onClick={() => setModalSlot(slot)}
                  className="px-3 py-1 text-xs rounded uppercase"
                  style={{ background: "var(--accent)", color: "#f4ecd8" }}
                >+ Add</button>
                <button
                  onClick={() => copyYesterday(slot)}
                  className="px-3 py-1 text-xs rounded uppercase"
                  style={{ background: "var(--paper)", color: "var(--ink-soft)", border: "1px solid var(--divider)" }}
                >Copy yesterday</button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-right text-sm" style={{ color: "var(--ink-soft)" }}>
        Total: {total} kcal
      </div>
      {modalSlot && (
        <AddMealModal
          date={date}
          slot={modalSlot}
          recipes={recipes}
          onClose={() => { setModalSlot(null); router.refresh(); }}
        />
      )}
    </div>
  );
}
