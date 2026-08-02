<script lang="ts">
  import { enhance } from '$app/forms';
  import { KCAL_TARGET, PROTEIN_TARGET_G, PROTEIN_AIM_G } from '$lib/targets';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const mealSlotLabels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack'
  };

  const recipeGroups = [
    { type: 'breakfast', label: 'Breakfast' },
    { type: 'lunch', label: 'Lunch' },
    { type: 'dinner', label: 'Dinner' },
    { type: 'snack', label: 'Snacks' }
  ];

  const kcalOver = $derived(data.totals.kcal > KCAL_TARGET);
  const proteinUnder = $derived(data.totals.proteinG < PROTEIN_TARGET_G);
</script>

<svelte:head><title>Meals — health-me</title></svelte:head>

<h1 class="text-2xl font-bold">Meals</h1>
<p class="text-ink-muted mt-1 text-sm">{data.date}</p>

<!-- ============================= Totals ============================= -->
<div class="bg-surface border-hairline mt-4 rounded-lg border p-4">
  <h2 class="font-semibold">Today's totals</h2>
  <p class="mt-2 text-sm">
    <span class={kcalOver ? 'text-over font-medium' : 'font-medium'}
      >{data.totals.kcal} / {KCAL_TARGET} kcal</span
    >
    ·
    <span class={proteinUnder ? 'text-over font-medium' : 'font-medium'}
      >{data.totals.proteinG} / {PROTEIN_TARGET_G}+ g protein</span
    >
  </p>
  <p class="text-ink-muted mt-1 text-xs">Aim for {PROTEIN_AIM_G} g protein when you can.</p>
</div>

<!-- ============================= Today's log ============================= -->
<section class="mt-6">
  <h2 class="text-xl font-bold">Today's log</h2>
  <div class="bg-surface border-hairline mt-3 rounded-lg border p-4">
    {#if data.logs.length === 0}
      <p class="text-ink-muted text-sm">Nothing logged yet today.</p>
    {:else}
      <ul>
        {#each data.logs as log (log.id)}
          <li
            class="border-hairline flex items-center justify-between gap-3 border-b py-2 last:border-0"
          >
            <div>
              <p class="font-medium">
                <span class="text-ink-muted">[{log.recipeCode ?? 'custom'}]</span>
                {log.name}
              </p>
              <p class="text-ink-muted text-sm">
                {mealSlotLabels[log.mealSlot]} · {log.kcal} kcal · {log.proteinG} g P
              </p>
            </div>
            <form method="POST" action="?/delete" use:enhance>
              <input type="hidden" name="id" value={log.id} />
              <button
                class="text-ink-muted hover:text-over rounded-md px-2 py-1 text-sm whitespace-nowrap"
              >
                Remove
              </button>
            </form>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>

<!-- ============================= Log a recipe ============================= -->
<section class="mt-6">
  <h2 class="text-xl font-bold">Log a recipe</h2>
  <form
    method="POST"
    action="?/recipe"
    use:enhance
    class="bg-surface border-hairline mt-3 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-end"
  >
    <label class="flex flex-1 flex-col gap-1 text-sm">
      Slot
      <select
        name="mealSlot"
        value="lunch"
        class="border-hairline bg-surface rounded-md border px-3 py-2"
      >
        {#each Object.entries(mealSlotLabels) as [value, label] (value)}
          <option {value}>{label}</option>
        {/each}
      </select>
    </label>
    <label class="flex flex-[2] flex-col gap-1 text-sm">
      Recipe
      <select name="recipeId" class="border-hairline bg-surface rounded-md border px-3 py-2">
        {#each recipeGroups as group (group.type)}
          {@const recipes = data.recipes.filter((r) => r.mealType === group.type)}
          {#if recipes.length > 0}
            <optgroup label={group.label}>
              {#each recipes as recipe (recipe.id)}
                <option value={recipe.id}>
                  {recipe.code} · {recipe.name} · {recipe.kcal} kcal / {recipe.proteinG} g P
                </option>
              {/each}
            </optgroup>
          {/if}
        {/each}
      </select>
    </label>
    <button class="bg-accent rounded-md px-4 py-2 font-semibold whitespace-nowrap text-white">
      Log recipe
    </button>
  </form>
</section>

<!-- ============================= Log custom ============================= -->
<section class="mt-6 mb-6">
  <h2 class="text-xl font-bold">Log custom</h2>
  <form
    method="POST"
    action="?/custom"
    use:enhance
    class="bg-surface border-hairline mt-3 rounded-lg border p-4"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label class="flex flex-col gap-1 text-sm sm:w-32">
        Slot
        <select
          name="mealSlot"
          value="lunch"
          class="border-hairline bg-surface rounded-md border px-3 py-2"
        >
          {#each Object.entries(mealSlotLabels) as [value, label] (value)}
            <option {value}>{label}</option>
          {/each}
        </select>
      </label>
      <label class="flex flex-[2] flex-col gap-1 text-sm">
        Name
        <input
          name="name"
          required
          class="border-hairline bg-surface rounded-md border px-3 py-2"
        />
      </label>
      <label class="flex flex-col gap-1 text-sm sm:w-28">
        Kcal
        <input
          name="kcal"
          type="number"
          min="0"
          required
          class="border-hairline bg-surface rounded-md border px-3 py-2"
        />
      </label>
      <label class="flex flex-col gap-1 text-sm sm:w-28">
        Protein (g)
        <input
          name="proteinG"
          type="number"
          min="0"
          required
          class="border-hairline bg-surface rounded-md border px-3 py-2"
        />
      </label>
      <button class="bg-accent rounded-md px-4 py-2 font-semibold whitespace-nowrap text-white">
        Log custom
      </button>
    </div>
    {#if form?.error}
      <p class="text-over mt-3 text-sm">{form.error}</p>
    {/if}
  </form>
</section>
