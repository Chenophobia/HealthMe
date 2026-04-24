export interface RecipeMacros {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servings: number;
}

export interface ScaledMacros {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function scaleRecipe(recipe: RecipeMacros, servingsConsumed: number): ScaledMacros {
  const factor = servingsConsumed / recipe.servings;
  return {
    kcal: Math.round(recipe.kcal * factor),
    proteinG: +(recipe.proteinG * factor).toFixed(2),
    carbsG: +(recipe.carbsG * factor).toFixed(2),
    fatG: +(recipe.fatG * factor).toFixed(2),
  };
}
