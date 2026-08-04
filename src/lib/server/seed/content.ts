import type { recipes, exercises, foods } from '../db/schema';

export type RecipeSeed = Omit<typeof recipes.$inferInsert, 'id' | 'displayOrder'>;
export type ExerciseSeed = Omit<typeof exercises.$inferInsert, 'id' | 'displayOrder'>;
export type FoodSeed = Omit<typeof foods.$inferInsert, 'id' | 'userId' | 'createdAt'>;

/*
 * Starter foods, drawn from the program's own shopping list and recipes.
 *
 * Figures are the usual reference values per 100 g/ml (or per item), rounded —
 * good enough to log against, and every one of them editable in the app,
 * because the packet in your cupboard is the authority, not this list.
 */
const per100 = (
  name: string,
  kcal: number,
  proteinG: number,
  defaultQty: number,
  unit: 'g' | 'ml' = 'g'
): FoodSeed => ({ name, unit, baseQty: 100, kcal, proteinG, defaultQty, archivedAt: null });

const perItem = (name: string, kcal: number, proteinG: number): FoodSeed => ({
  name,
  unit: 'item',
  baseQty: 1,
  kcal,
  proteinG,
  defaultQty: 1,
  archivedAt: null
});

export const FOODS: FoodSeed[] = [
  // Protein
  per100('Chicken breast', 165, 31, 150),
  per100('Turkey breast', 135, 29, 150),
  per100('Beef mince 5%', 137, 21, 150),
  per100('Salmon fillet', 208, 20, 130),
  per100('Tuna, canned in water', 116, 26, 100),
  per100('Prawns', 99, 24, 120),
  perItem('Egg, medium', 78, 6.3),
  per100('Egg whites', 52, 11, 200, 'ml'),
  per100('Greek yogurt 0%', 59, 10, 150),
  per100('Skyr', 63, 11, 150),
  per100('Cottage cheese', 98, 11, 150),
  per100('Whey protein, chocolate', 380, 76, 30),
  per100('Whey protein, vanilla', 380, 76, 30),
  // Carbs
  per100('Oats, dry', 379, 13, 40),
  per100('Rice, cooked', 130, 2.7, 180),
  per100('Rice, dry', 360, 7, 60),
  per100('Pasta, dry', 371, 13, 70),
  per100('Potato', 77, 2, 200),
  per100('Sweet potato', 86, 1.6, 200),
  per100('Wholemeal bread', 247, 10, 60),
  per100('Couscous, dry', 376, 13, 60),
  // Fruit and veg
  perItem('Banana, medium', 105, 1.3),
  perItem('Apple, medium', 95, 0.5),
  per100('Blueberries', 57, 0.7, 100),
  per100('Strawberries', 32, 0.7, 100),
  per100('Broccoli', 34, 2.8, 150),
  per100('Green beans', 31, 1.8, 150),
  per100('Spinach', 23, 2.9, 100),
  per100('Mixed salad', 15, 1.4, 100),
  per100('Tomato', 18, 0.9, 100),
  per100('Cucumber', 15, 0.7, 100),
  // Fats and extras
  per100('Olive oil', 884, 0, 10, 'ml'),
  per100('Semi-skimmed milk', 50, 3.6, 250, 'ml'),
  per100('Cashews', 553, 18, 20),
  per100('Almonds', 579, 21, 20),
  per100('Peanut butter', 588, 25, 20),
  per100('Avocado', 160, 2, 80),
  per100('Cheddar', 403, 25, 30),
  per100('Feta', 264, 14, 40),
  per100('Hummus', 166, 8, 50),
  per100('Dark chocolate 85%', 592, 10, 20)
];

export const RECIPES: RecipeSeed[] = [
  // Breakfast — codes B1–B6 assigned here (the source lists them uncoded)
  {
    code: 'B1',
    mealType: 'breakfast',
    name: 'Chocolate–Banana smoothie',
    kcal: 440,
    proteinG: 49,
    ingredients:
      'Chocolate whey 1 scoop (~30 g)\nSemi-skimmed milk 250 ml\nBanana 120 g\nGreek yogurt (0% / high-protein) 150 g — recommended',
    instructions: 'Blend 2 min.'
  },
  {
    code: 'B2',
    mealType: 'breakfast',
    name: 'Chocolate–Blueberry smoothie',
    kcal: 420,
    proteinG: 48,
    ingredients:
      'Chocolate whey 1 scoop (~30 g)\nSemi-skimmed milk 250 ml\nBlueberries 100 g\nGreek yogurt (0% / high-protein) 150 g — recommended',
    instructions: 'Blend 2 min.'
  },
  {
    code: 'B3',
    mealType: 'breakfast',
    name: 'Overnight oats — banana',
    kcal: 620,
    proteinG: 51,
    ingredients:
      'Oats (dry) 40 g\nChocolate whey 1 scoop\nSemi-skimmed milk 200 ml\nBanana 120 g\nGreek yogurt 100 g (optional)\nCashews 15 g (optional)',
    instructions:
      "Mix in a jar at night, eat cold in the morning. Stir the whey into the milk first until smooth, then add oats and fruit — won't clump. Macros shown are the with-yogurt-and-cashews version."
  },
  {
    code: 'B4',
    mealType: 'breakfast',
    name: 'Overnight oats — blueberry',
    kcal: 575,
    proteinG: 50,
    ingredients:
      'Oats (dry) 40 g\nChocolate whey 1 scoop\nSemi-skimmed milk 200 ml\nBlueberries 100 g\nGreek yogurt 100 g (optional)\nCashews 15 g (optional)',
    instructions:
      "Mix in a jar at night, eat cold in the morning. Stir the whey into the milk first until smooth, then add oats and fruit — won't clump. Macros shown are the with-yogurt-and-cashews version."
  },
  {
    code: 'B5',
    mealType: 'breakfast',
    name: 'Greek yogurt bowl',
    kcal: 330,
    proteinG: 25,
    ingredients: 'Greek yogurt 200 g\nBlueberries 100 g\nCashews 20 g\nCinnamon',
    instructions: 'No blender needed — combine and eat.'
  },
  {
    code: 'B6',
    mealType: 'breakfast',
    name: 'Eggs & toast',
    kcal: 320,
    proteinG: 22,
    ingredients: 'Eggs 3\nWholegrain toast 1 slice\nTomato',
    instructions: 'Scramble or air-fry the eggs. No blender needed.'
  },

  // Lunch — batch-prep recipes, codes from the source. All weights raw/before
  // cooking. Each = one portion; multiply ×4–6 to batch a week.
  {
    code: 'R1',
    mealType: 'lunch',
    name: 'Chicken, rice & broccoli',
    kcal: 530,
    proteinG: 54,
    ingredients: 'Chicken breast 200 g\nWhite rice (dry) 60 g\nBroccoli 150 g\nOlive oil 5 g',
    instructions:
      'Air-fry chicken 190°C, 18–22 min. Boil rice. Steam/air-fry broccoli 200°C, 10–12 min.'
  },
  {
    code: 'R2',
    mealType: 'lunch',
    name: 'Lean beef & potato',
    kcal: 490,
    proteinG: 40,
    ingredients:
      'Lean beef mince (5% fat) 150 g\nPotato 250 g\nBroccoli/green beans 150 g\nOlive oil 5 g',
    instructions:
      'Pan-fry mince (no oil — fat renders) with spices. Air-fry potato cubes 200°C, 20 min. Steam veg.'
  },
  {
    code: 'R3',
    mealType: 'lunch',
    name: 'Chicken rice porridge (congee)',
    kcal: 410,
    proteinG: 38,
    ingredients:
      'Chicken breast 150 g\nWhite rice (dry) 50 g\nWater/stock ~600 ml\nCarrot 80 g\nGinger/garlic/spring onion to taste',
    instructions:
      'One pot: simmer rice + chicken + stock + carrot 30–40 min until porridge-like; shred chicken back in. Reheats great — add water.'
  },
  {
    code: 'R4',
    mealType: 'lunch',
    name: 'Garlic prawns, rice & broccoli',
    kcal: 460,
    proteinG: 40,
    ingredients:
      'Prawns (frozen, peeled) 180 g\nWhite rice (dry) 60 g\nBroccoli/green beans 150 g\nOlive oil + garlic + chili 5 g',
    instructions: 'Prawns air-fry from frozen 200°C, 6–8 min. Fastest recipe here.'
  },

  // Dinner — lighter than lunch; any lunch recipe works here too.
  {
    code: 'D1',
    mealType: 'dinner',
    name: 'Beef or chicken stir-fry',
    kcal: 450,
    proteinG: 40,
    ingredients:
      'Chicken or 5% beef 150 g\nFrozen stir-fry veg 200 g\nWhite rice (dry) 40 g\nOil + garlic/ginger/soy 5 g',
    instructions: 'Pan or air-fry, high heat, 8–10 min.'
  },
  {
    code: 'D2',
    mealType: 'dinner',
    name: 'Prawns & veg (low-carb)',
    kcal: 300,
    proteinG: 35,
    ingredients:
      'Prawns (frozen, peeled) 180 g\nSalad/mixed veg 200 g\nOlive oil + garlic + lemon 5 g',
    instructions: 'Prawns air-fry from frozen 200°C, 6–8 min.'
  },
  {
    code: 'D3',
    mealType: 'dinner',
    name: 'Egg & chicken salad',
    kcal: 465,
    proteinG: 51,
    ingredients:
      'Eggs 3 (150 g)\nCold cooked chicken 100 g\nTomato + cucumber 200 g\nOlive oil 5 g',
    instructions: 'No cooking — boil/air-fry eggs in a batch.'
  },
  {
    code: 'D4',
    mealType: 'dinner',
    name: 'Chickpea bowl',
    kcal: 460,
    proteinG: 42,
    ingredients:
      'Chickpeas (1 tin, drained) 240 g\nPrawns or cold chicken 100 g\nVeg + onion 150 g\nOlive oil + lemon 5 g',
    instructions: 'No cooking if using pre-cooked protein.'
  },
  {
    code: 'D5',
    mealType: 'dinner',
    name: 'Omelette',
    kcal: 355,
    proteinG: 27,
    ingredients: 'Eggs 4 (200 g)\nTomato/onion + side salad 150 g\nOlive oil 3 g',
    instructions: 'Pan 5–6 min.'
  },
  {
    code: 'D6',
    mealType: 'dinner',
    name: 'Greek yogurt bowl (light night)',
    kcal: 315,
    proteinG: 29,
    ingredients: 'Greek yogurt (0%) 250 g\nBerries 100 g\nCashews 20 g',
    instructions: 'No cooking.'
  },

  // Snacks — codes S1–S4 assigned here (the source lists them in a table)
  {
    code: 'S1',
    mealType: 'snack',
    name: 'Greek yogurt / quark pot',
    kcal: 150,
    proteinG: 20,
    ingredients: 'Greek yogurt or quark ~150 g',
    instructions: 'Straight from the pot.'
  },
  {
    code: 'S2',
    mealType: 'snack',
    name: 'Cashews + fruit',
    kcal: 245,
    proteinG: 5,
    ingredients: 'Cashews 25 g\nFruit 1 piece',
    instructions: 'No prep.'
  },
  {
    code: 'S3',
    mealType: 'snack',
    name: 'Boiled eggs',
    kcal: 185,
    proteinG: 16,
    ingredients: 'Boiled eggs 2–3 (batch 6 ahead)',
    instructions:
      'Source lists 155–215 kcal and 13–19 g protein for 2–3 eggs; logged values are the midpoints.'
  },
  {
    code: 'S4',
    mealType: 'snack',
    name: 'Quark + berries',
    kcal: 180,
    proteinG: 20,
    ingredients: 'Quark 150 g\nBerries 80 g',
    instructions: 'No prep.'
  }
];

export const EXERCISES: ExerciseSeed[] = [
  // Push — Monday (chest, shoulders, triceps)
  {
    sessionType: 'push',
    name: 'Chest press',
    dumbbellSwap: 'Flat DB press',
    sets: 3,
    repsMin: 10,
    repsMax: 12
  },
  {
    sessionType: 'push',
    name: 'Incline chest press',
    dumbbellSwap: 'Incline DB press',
    sets: 3,
    repsMin: 10,
    repsMax: 12
  },
  {
    sessionType: 'push',
    name: 'Shoulder press',
    dumbbellSwap: 'Seated DB shoulder press',
    sets: 3,
    repsMin: 10,
    repsMax: 12
  },
  {
    sessionType: 'push',
    name: 'Cable lateral raise',
    dumbbellSwap: 'DB lateral raise',
    sets: 3,
    repsMin: 12,
    repsMax: 15
  },
  {
    sessionType: 'push',
    name: 'Triceps pushdown (cable)',
    dumbbellSwap: 'DB overhead extension',
    sets: 2,
    repsMin: 12,
    repsMax: 12
  },

  // Pull — Wednesday (back, biceps, rear shoulders)
  {
    sessionType: 'pull',
    name: 'Lat pulldown',
    dumbbellSwap: null,
    sets: 3,
    repsMin: 10,
    repsMax: 12
  },
  {
    sessionType: 'pull',
    name: 'Seated row',
    dumbbellSwap: 'Bent-over DB row',
    sets: 3,
    repsMin: 10,
    repsMax: 12
  },
  {
    sessionType: 'pull',
    name: 'Chest-supported row',
    dumbbellSwap: '1-arm DB row',
    sets: 3,
    repsMin: 10,
    repsMax: 12
  },
  {
    sessionType: 'pull',
    name: 'Rear-delt fly',
    dumbbellSwap: 'Bent-over DB rear fly',
    sets: 3,
    repsMin: 12,
    repsMax: 15
  },
  {
    sessionType: 'pull',
    name: 'Biceps curl',
    dumbbellSwap: 'DB curl',
    sets: 3,
    repsMin: 12,
    repsMax: 12
  },

  // Legs — Friday (quads, hamstrings, glutes)
  { sessionType: 'legs', name: 'Leg press', dumbbellSwap: null, sets: 3, repsMin: 10, repsMax: 12 },
  {
    sessionType: 'legs',
    name: 'Hack squat',
    dumbbellSwap: 'DB goblet squat',
    sets: 3,
    repsMin: 10,
    repsMax: 12
  },
  {
    sessionType: 'legs',
    name: 'Seated leg curl',
    dumbbellSwap: null,
    sets: 3,
    repsMin: 12,
    repsMax: 12
  },
  {
    sessionType: 'legs',
    name: 'Leg extension',
    dumbbellSwap: null,
    sets: 2,
    repsMin: 12,
    repsMax: 12
  },
  {
    sessionType: 'legs',
    name: 'Romanian deadlift',
    dumbbellSwap: 'DB or barbell',
    sets: 3,
    repsMin: 10,
    repsMax: 12
  }
];
