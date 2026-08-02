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
    { type: 'push', label: 'Push', when: 'Monday — chest, shoulders, triceps' },
    { type: 'pull', label: 'Pull', when: 'Wednesday — back, biceps, rear shoulders' },
    { type: 'legs', label: 'Legs', when: 'Friday — quads, hamstrings, glutes' }
  ];

  function repsLabel(sets: number, repsMin: number, repsMax: number) {
    return repsMin === repsMax ? `${sets} × ${repsMin}` : `${sets} × ${repsMin}–${repsMax}`;
  }
</script>

<svelte:head><title>Plan — health-me</title></svelte:head>

<header>
  <p class="eyebrow text-ink-muted">Reference</p>
  <h1 class="mt-2 text-2xl font-semibold tracking-tight">The plan</h1>
  <p class="text-ink-muted mt-2 text-sm">
    The nutrition and training reference the rest of the app is built around.
  </p>
</header>

<!-- ============================= Nutrition ============================= -->
<section class="mt-8">
  <h2 class="eyebrow text-accent">Nutrition</h2>

  <div class="card mt-3 p-4 sm:p-5">
    <h3 class="font-medium">Daily targets</h3>

    <!-- Phones get the same rows stacked. A three-column table with a column
         of prose in it cannot be read on a 375px screen, and side-scrolling
         a reference table is worse than reading it as a list. -->
    <dl class="mt-2 sm:hidden">
      {#each PLAN_PROSE.dailyTargets as row (row.what)}
        <div class="border-hairline border-b py-3 last:border-0">
          <dt class="flex items-baseline justify-between gap-3">
            <span class="font-medium">{row.what}</span>
            <span class="tabular font-mono text-sm">{row.target}</span>
          </dt>
          <dd class="text-ink-muted mt-1 text-sm">{row.why}</dd>
        </div>
      {/each}
    </dl>

    <div class="mt-3 hidden overflow-x-auto sm:block">
      <table class="w-full min-w-[30rem] text-left text-sm">
        <thead>
          <tr class="border-hairline border-b">
            <th class="eyebrow text-ink-muted py-2 pr-4 font-normal">What</th>
            <th class="eyebrow text-ink-muted py-2 pr-4 font-normal">Target</th>
            <th class="eyebrow text-ink-muted py-2 font-normal">Why it matters</th>
          </tr>
        </thead>
        <tbody>
          {#each PLAN_PROSE.dailyTargets as row (row.what)}
            <tr class="border-hairline border-b last:border-0">
              <td class="py-2 pr-4 font-medium">{row.what}</td>
              <td class="tabular py-2 pr-4 font-mono">{row.target}</td>
              <td class="text-ink-muted py-2">{row.why}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="mt-4 text-sm">{PLAN_PROSE.anchors}</p>
    <p class="text-ink-muted mt-2 text-sm">{PLAN_PROSE.dayFormula}</p>
  </div>

  {#each mealSections as section (section.type)}
    {@const recipes = byType(section.type)}
    {#if recipes.length > 0}
      <div class="mt-6">
        <h3 class="eyebrow text-ink-muted">{section.label}</h3>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          {#each recipes as recipe (recipe.code)}
            <article class="card p-4">
              <div class="flex items-baseline justify-between gap-3">
                <h4 class="font-medium">{recipe.name}</h4>
                <span class="eyebrow text-ink-muted">{recipe.code}</span>
              </div>
              <p class="tabular text-accent mt-1 font-mono text-sm">
                {recipe.kcal} kcal · {recipe.proteinG} g P
              </p>
              <ul class="border-hairline mt-3 list-disc border-t pt-3 pl-5 text-sm">
                {#each recipe.ingredients.split('\n') as line, i (i)}
                  <li>{line}</li>
                {/each}
              </ul>
              <p class="text-ink-muted mt-2 text-sm">{recipe.instructions}</p>
            </article>
          {/each}
        </div>
      </div>
    {/if}
  {/each}

  <div class="mt-6 grid gap-3 sm:grid-cols-2">
    <div class="card p-4">
      <h3 class="font-medium">Golden rules</h3>
      <ul class="mt-2 list-disc pl-5 text-sm">
        {#each PLAN_PROSE.goldenRules as rule (rule)}
          <li class="mt-1">{rule}</li>
        {/each}
      </ul>
    </div>
    <div class="card p-4">
      <h3 class="font-medium">If the scale stalls 10+ days</h3>
      <ol class="mt-2 list-decimal pl-5 text-sm">
        {#each PLAN_PROSE.stallProtocol as step (step)}
          <li class="mt-1">{step}</li>
        {/each}
      </ol>
    </div>
  </div>

  <div class="card mt-6 p-4">
    <h3 class="font-medium">Shopping list</h3>
    <p class="mt-2 text-sm">
      <span class="eyebrow text-ink-muted">Protein</span>
      <br />{PLAN_PROSE.shoppingList.protein}
    </p>
    <p class="text-ink-muted mt-3 text-sm">
      <span class="eyebrow">Produce · carbs · fats · extras</span>
      <br />{PLAN_PROSE.shoppingList.rest}
    </p>
  </div>
</section>

<!-- ============================== Training =============================== -->
<section class="mt-10">
  <h2 class="eyebrow text-accent">Training</h2>

  <div class="mt-3 grid gap-3 sm:grid-cols-2">
    <div class="card p-4">
      <h3 class="font-medium">Weekly schedule</h3>
      <table class="mt-3 w-full text-left text-sm">
        <thead>
          <tr class="border-hairline border-b">
            <th class="eyebrow text-ink-muted py-2 pr-4 font-normal">Day</th>
            <th class="eyebrow text-ink-muted py-2 font-normal">Session</th>
          </tr>
        </thead>
        <tbody>
          {#each PLAN_PROSE.weeklySchedule as row (row.day)}
            <tr class="border-hairline border-b last:border-0">
              <td class="py-2 pr-4 font-medium">{row.day}</td>
              <td class="text-ink-muted py-2">{row.session}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="card p-4">
      <h3 class="font-medium">How a session flows</h3>
      <table class="mt-3 w-full text-left text-sm">
        <thead>
          <tr class="border-hairline border-b">
            <th class="eyebrow text-ink-muted py-2 pr-4 font-normal">Stage</th>
            <th class="eyebrow text-ink-muted py-2 font-normal">What to do</th>
          </tr>
        </thead>
        <tbody>
          {#each PLAN_PROSE.sessionFlow as row (row.stage)}
            <tr class="border-hairline border-b last:border-0">
              <td class="py-2 pr-4 font-medium whitespace-nowrap">{row.stage}</td>
              <td class="text-ink-muted py-2">{row.what}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="text-ink-muted mt-3 text-sm">{PLAN_PROSE.straightSets}</p>
    </div>
  </div>

  <div class="card mt-6 p-4">
    <h3 class="font-medium">Cardio</h3>

    <dl class="mt-2 sm:hidden">
      {#each PLAN_PROSE.cardio as row (row.when)}
        <div class="border-hairline border-b py-3 last:border-0">
          <dt class="flex items-baseline justify-between gap-3">
            <span class="font-medium">{row.when}</span>
            <span class="text-sm">{row.what}</span>
          </dt>
          <dd class="text-ink-muted mt-1 text-sm">{row.purpose}</dd>
        </div>
      {/each}
    </dl>

    <div class="mt-3 hidden overflow-x-auto sm:block">
      <table class="w-full min-w-[30rem] text-left text-sm">
        <thead>
          <tr class="border-hairline border-b">
            <th class="eyebrow text-ink-muted py-2 pr-4 font-normal">When</th>
            <th class="eyebrow text-ink-muted py-2 pr-4 font-normal">Do</th>
            <th class="eyebrow text-ink-muted py-2 font-normal">Purpose</th>
          </tr>
        </thead>
        <tbody>
          {#each PLAN_PROSE.cardio as row (row.when)}
            <tr class="border-hairline border-b last:border-0">
              <td class="py-2 pr-4 font-medium">{row.when}</td>
              <td class="py-2 pr-4">{row.what}</td>
              <td class="text-ink-muted py-2">{row.purpose}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  {#each sessionSections as section (section.type)}
    {@const exercises = bySession(section.type)}
    {#if exercises.length > 0}
      <div class="card mt-6 p-4">
        <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 class="font-medium">{section.label}</h3>
          <span class="eyebrow text-ink-muted">{section.when}</span>
        </div>
        <div class="mt-3 overflow-x-auto">
          <table class="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr class="border-hairline border-b">
                <th class="eyebrow text-ink-muted py-2 pr-4 font-normal">Machine version</th>
                <th class="eyebrow text-ink-muted py-2 pr-4 font-normal">Dumbbell swap</th>
                <th class="eyebrow text-ink-muted py-2 font-normal">Sets × reps</th>
              </tr>
            </thead>
            <tbody>
              {#each exercises as exercise (exercise.id)}
                <tr class="border-hairline border-b last:border-0">
                  <td class="py-2 pr-4">{exercise.name}</td>
                  <td class="text-ink-muted py-2 pr-4">{exercise.dumbbellSwap ?? '—'}</td>
                  <td class="tabular py-2 font-mono whitespace-nowrap">
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

  <div class="card mt-6 p-4">
    <h3 class="font-medium">Optional home core</h3>
    <p class="text-ink-muted mt-1 text-sm">Off-days, 8 minutes.</p>
    <table class="mt-3 w-full text-left text-sm">
      <thead>
        <tr class="border-hairline border-b">
          <th class="eyebrow text-ink-muted py-2 pr-4 font-normal">Exercise</th>
          <th class="eyebrow text-ink-muted py-2 font-normal">Sets</th>
        </tr>
      </thead>
      <tbody>
        {#each PLAN_PROSE.homeCore as row (row.exercise)}
          <tr class="border-hairline border-b last:border-0">
            <td class="py-2 pr-4">{row.exercise}</td>
            <td class="tabular py-2 font-mono">{row.sets}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="mt-6 grid gap-3 sm:grid-cols-2">
    <div class="card p-4">
      <h3 class="font-medium">Progression</h3>
      <p class="text-ink-muted mt-2 text-sm">{PLAN_PROSE.progression}</p>
    </div>
    <div class="card p-4">
      <h3 class="font-medium">Staying safe</h3>
      <p class="text-ink-muted mt-2 text-sm">{PLAN_PROSE.safety}</p>
    </div>
  </div>

  <p class="text-ink-muted mt-6 text-xs">{PLAN_PROSE.disclaimer}</p>
</section>
