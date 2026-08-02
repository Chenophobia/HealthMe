export const PLAN_PROSE = {
  dailyTargets: [
    { what: 'Calories', target: '~1,750 kcal', why: 'Below ~2,300 maintenance → steady fat loss' },
    { what: 'Protein', target: '150–170 g (aim 160)', why: 'Protects muscle, keeps you full' },
    { what: 'Carbs', target: '~140–160 g', why: 'Energy for training; rice & potatoes fine' },
    { what: 'Fat', target: '~55–65 g', why: 'Needed for hormones & health' },
    { what: 'Water', target: '2.5–3 L', why: 'Controls hunger; reduces face puffiness' }
  ],
  anchors:
    'Only two numbers really matter: stay near 1,750 kcal and hit 150+ g protein. Never drop below ~1,600 kcal (near baseline burn).',
  dayFormula:
    'Breakfast + Lunch + Dinner + 1–2 snacks ≈ 1,750 kcal / ~160 g protein. Pick one option per section, mix and match freely.',
  goldenRules: [
    'Protein at every meal.',
    'Volume beats hunger — pile on veg & yogurt.',
    'Liquid calories (juice, sugary coffee, alcohol) quietly wreck a deficit — keep alcohol rare.',
    'Weigh yourself 3×/week, same time; judge the weekly average (daily swings of 1–2 kg are just water).',
    'One flexible meal a week — enjoy it, then back to plan.',
    'Less salt + alcohol + more water de-puffs the face fast.'
  ],
  stallProtocol: [
    'Recount 3 days honestly — cashews, oil and ready-meal calories are the usual hidden culprits.',
    'Add your weekend walk before cutting food.',
    'Only then trim ~100–150 kcal (smaller rice/potato). Never below ~1,600 kcal.'
  ],
  shoppingList: {
    protein:
      'Chicken breast, Lean beef mince (5% fat), Frozen prawns, Eggs, Greek yogurt (0% / high-protein), Quark, Ready grilled chicken trays',
    rest: 'Frozen blueberries + bananas, Broccoli/green beans/carrot/stir-fry veg, Tomato/cucumber/onion/salad/spring onion, Rice/potato/sweet potato, Canned chickpeas/lentils, Cashews/oats, Olive oil/ginger/garlic/paprika/chili, Semi-skimmed milk'
  },
  weeklySchedule: [
    { day: 'Mon', session: 'Push — chest, shoulders, triceps' },
    { day: 'Tue', session: 'Rest (optional 8-min home core)' },
    { day: 'Wed', session: 'Pull — back, biceps, rear shoulders' },
    { day: 'Thu', session: 'Rest (optional 8-min home core)' },
    { day: 'Fri', session: 'Legs — quads, hamstrings, glutes' },
    { day: 'Weekend', session: 'One easy 30–60 min walk' }
  ],
  sessionFlow: [
    { stage: '1 · Warm-up', what: 'Treadmill: incline 10, speed 5.0, 10 min' },
    { stage: '2 · Weights', what: 'The 5 exercises for the day (below). Straight sets.' },
    { stage: '3 · Finish', what: '10–15 min steady spin bike or rower' }
  ],
  straightSets:
    'Do all sets of one exercise, resting ~60–75 seconds between them, then move to next exercise. Push each set until it feels hard — stop about 2 reps before failure.',
  cardio: [
    {
      when: 'Open',
      what: 'Incline 10, speed 5.0 — 10 min',
      purpose: 'Warm-up + high-intensity fat burn'
    },
    {
      when: 'Close',
      what: 'Spin or row, steady — 10–15 min',
      purpose: 'Extra calorie burn, easy on joints'
    }
  ],
  homeCore: [
    { exercise: 'Plank', sets: '3 × 30–45 s' },
    { exercise: 'Reverse lunges', sets: '3 × 10 / leg' },
    { exercise: 'Glute bridge', sets: '3 × 15' },
    { exercise: 'Dead bug / bird-dog', sets: '3 × 10' }
  ],
  progression:
    "When you can hit the top of the rep range on all sets with clean form, add a little weight next time (~2.5 kg on machines/bars, 1–2 kg on dumbbells) and drop back to the bottom of the range. Write down weight × reps every session — numbers going up means it's working, even on days the scale won't move. Take a deload occasionally (same weights, drop the last exercise, ease off cardio) whenever you feel run down, then go back to pushing harder.",
  safety:
    'Form before weight — watch one short technique video per lift before your first try. Machines are safe to push to your limit alone. Sharp or joint pain = stop and swap the exercise; muscle burn is normal. Take rest days — muscle grows during recovery, not in the gym. If you ever feel chest pain or dizziness during hard cardio, stop and get checked.',
  disclaimer:
    'Educational plan built from RENPHO body-composition data and peer-reviewed research. Not medical or dietary advice. Check with a doctor before starting a new exercise/nutrition program, especially with existing health conditions.'
} as const;
