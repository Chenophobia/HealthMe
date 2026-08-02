<script lang="ts">
  import { PLAN_PROSE } from '$lib/plan-content';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const byType = (type: string) => data.recipes.filter((r) => r.mealType === type);
  const bySession = (s: string) => data.exercises.filter((e) => e.sessionType === s);

  const mealSections = [
    { type: 'breakfast', label: 'Breakfast' },
    { type: 'lunch', label: 'Lunch' },
    { type: 'dinner', label: 'Dinner' },
    { type: 'snack', label: 'Snacks' }
  ];

  const sessionSections = [
    { type: 'push', label: 'Push — Monday (chest, shoulders, triceps)' },
    { type: 'pull', label: 'Pull — Wednesday (back, biceps, rear shoulders)' },
    { type: 'legs', label: 'Legs — Friday (quads, hamstrings, glutes)' }
  ];

  function repsLabel(sets: number, repsMin: number, repsMax: number) {
    return repsMin === repsMax ? `${sets} × ${repsMin}` : `${sets} × ${repsMin}–${repsMax}`;
  }
</script>

<svelte:head><title>Plan — health-me</title></svelte:head>

<h1 class="text-2xl font-bold">The plan</h1>
<p class="text-ink-muted mt-1 text-sm">
  The full nutrition and training reference — everything the rest of the app is built around.
</p>

<!-- ============================= Nutrition ============================= -->
<section class="mt-8">
  <h2 class="text-xl font-bold">Nutrition</h2>

  <div class="bg-surface border-hairline mt-4 rounded-lg border p-4">
    <h3 class="font-semibold">Daily targets</h3>
    <div class="mt-3 overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="text-ink-muted border-hairline border-b">
            <th class="py-1.5 pr-3 font-medium">What</th>
            <th class="py-1.5 pr-3 font-medium">Target</th>
            <th class="py-1.5 font-medium">Why it matters</th>
          </tr>
        </thead>
        <tbody>
          {#each PLAN_PROSE.dailyTargets as row (row.what)}
            <tr class="border-hairline border-b last:border-0">
              <td class="py-1.5 pr-3 font-medium">{row.what}</td>
              <td class="py-1.5 pr-3">{row.target}</td>
              <td class="text-ink-muted py-1.5">{row.why}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="mt-3 text-sm">{PLAN_PROSE.anchors}</p>
    <p class="text-ink-muted mt-2 text-sm">{PLAN_PROSE.dayFormula}</p>
  </div>

  {#each mealSections as section (section.type)}
    {@const recipes = byType(section.type)}
    {#if recipes.length > 0}
      <div class="mt-6">
        <h3 class="font-semibold">{section.label}</h3>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          {#each recipes as recipe (recipe.code)}
            <div class="bg-surface border-hairline rounded-lg border p-4">
              <p class="font-medium">{recipe.code} · {recipe.name}</p>
              <p class="text-ink-muted text-sm">{recipe.kcal} kcal · {recipe.proteinG} g P</p>
              <ul class="mt-2 list-disc pl-5 text-sm">
                {#each recipe.ingredients.split('\n') as line, i (i)}
                  <li>{line}</li>
                {/each}
              </ul>
              <p class="text-ink-muted mt-2 text-sm">{recipe.instructions}</p>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/each}

  <div class="mt-6 grid gap-3 sm:grid-cols-2">
    <div class="bg-surface border-hairline rounded-lg border p-4">
      <h3 class="font-semibold">Golden rules</h3>
      <ul class="mt-2 list-disc pl-5 text-sm">
        {#each PLAN_PROSE.goldenRules as rule (rule)}
          <li>{rule}</li>
        {/each}
      </ul>
    </div>
    <div class="bg-surface border-hairline rounded-lg border p-4">
      <h3 class="font-semibold">If the scale stalls 10+ days</h3>
      <ol class="mt-2 list-decimal pl-5 text-sm">
        {#each PLAN_PROSE.stallProtocol as step (step)}
          <li>{step}</li>
        {/each}
      </ol>
    </div>
  </div>

  <div class="bg-surface border-hairline mt-6 rounded-lg border p-4">
    <h3 class="font-semibold">Shopping list</h3>
    <p class="mt-2 text-sm">
      <span class="font-medium">Protein:</span>
      {PLAN_PROSE.shoppingList.protein}
    </p>
    <p class="text-ink-muted mt-2 text-sm">
      <span class="text-ink font-medium">Produce · carbs · fats · extras:</span>
      {PLAN_PROSE.shoppingList.rest}
    </p>
  </div>
</section>

<!-- ============================== Training =============================== -->
<section class="mt-10">
  <h2 class="text-xl font-bold">Training</h2>

  <div class="bg-surface border-hairline mt-4 rounded-lg border p-4">
    <h3 class="font-semibold">Weekly schedule</h3>
    <div class="mt-3 overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="text-ink-muted border-hairline border-b">
            <th class="py-1.5 pr-3 font-medium">Day</th>
            <th class="py-1.5 font-medium">Session</th>
          </tr>
        </thead>
        <tbody>
          {#each PLAN_PROSE.weeklySchedule as row (row.day)}
            <tr class="border-hairline border-b last:border-0">
              <td class="py-1.5 pr-3 font-medium">{row.day}</td>
              <td class="py-1.5">{row.session}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <div class="bg-surface border-hairline mt-6 rounded-lg border p-4">
    <h3 class="font-semibold">How a session flows</h3>
    <div class="mt-3 overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="text-ink-muted border-hairline border-b">
            <th class="py-1.5 pr-3 font-medium">Stage</th>
            <th class="py-1.5 font-medium">What to do</th>
          </tr>
        </thead>
        <tbody>
          {#each PLAN_PROSE.sessionFlow as row (row.stage)}
            <tr class="border-hairline border-b last:border-0">
              <td class="py-1.5 pr-3 font-medium whitespace-nowrap">{row.stage}</td>
              <td class="py-1.5">{row.what}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="text-ink-muted mt-3 text-sm">{PLAN_PROSE.straightSets}</p>
  </div>

  <div class="bg-surface border-hairline mt-6 rounded-lg border p-4">
    <h3 class="font-semibold">Cardio</h3>
    <div class="mt-3 overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="text-ink-muted border-hairline border-b">
            <th class="py-1.5 pr-3 font-medium">When</th>
            <th class="py-1.5 pr-3 font-medium">Do</th>
            <th class="py-1.5 font-medium">Purpose</th>
          </tr>
        </thead>
        <tbody>
          {#each PLAN_PROSE.cardio as row (row.when)}
            <tr class="border-hairline border-b last:border-0">
              <td class="py-1.5 pr-3 font-medium">{row.when}</td>
              <td class="py-1.5 pr-3">{row.what}</td>
              <td class="text-ink-muted py-1.5">{row.purpose}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  {#each sessionSections as section (section.type)}
    {@const exercises = bySession(section.type)}
    {#if exercises.length > 0}
      <div class="bg-surface border-hairline mt-6 rounded-lg border p-4">
        <h3 class="font-semibold">{section.label}</h3>
        <div class="mt-3 overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="text-ink-muted border-hairline border-b">
                <th class="py-1.5 pr-3 font-medium">Machine version</th>
                <th class="py-1.5 pr-3 font-medium">Dumbbell swap</th>
                <th class="py-1.5 font-medium">Sets × reps</th>
              </tr>
            </thead>
            <tbody>
              {#each exercises as exercise (exercise.id)}
                <tr class="border-hairline border-b last:border-0">
                  <td class="py-1.5 pr-3">{exercise.name}</td>
                  <td class="text-ink-muted py-1.5 pr-3">{exercise.dumbbellSwap ?? '—'}</td>
                  <td class="py-1.5">
                    {repsLabel(exercise.sets, exercise.repsMin, exercise.repsMax)}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  {/each}

  <div class="bg-surface border-hairline mt-6 rounded-lg border p-4">
    <h3 class="font-semibold">Optional home core (off-days, 8 min)</h3>
    <div class="mt-3 overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="text-ink-muted border-hairline border-b">
            <th class="py-1.5 pr-3 font-medium">Exercise</th>
            <th class="py-1.5 font-medium">Sets</th>
          </tr>
        </thead>
        <tbody>
          {#each PLAN_PROSE.homeCore as row (row.exercise)}
            <tr class="border-hairline border-b last:border-0">
              <td class="py-1.5 pr-3">{row.exercise}</td>
              <td class="py-1.5">{row.sets}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <div class="mt-6 grid gap-3 sm:grid-cols-2">
    <div class="bg-surface border-hairline rounded-lg border p-4">
      <h3 class="font-semibold">Progression</h3>
      <p class="text-ink-muted mt-2 text-sm">{PLAN_PROSE.progression}</p>
    </div>
    <div class="bg-surface border-hairline rounded-lg border p-4">
      <h3 class="font-semibold">Staying safe</h3>
      <p class="text-ink-muted mt-2 text-sm">{PLAN_PROSE.safety}</p>
    </div>
  </div>

  <p class="text-ink-muted mt-6 text-xs">{PLAN_PROSE.disclaimer}</p>
</section>
