<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { searchFoods } from '$lib/foods';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let query = $state('');
  let adding = $state(false);
  let editingId: number | null = $state(null);

  const active = $derived(data.foods.filter((f) => f.archivedAt === null));
  const archived = $derived(data.foods.filter((f) => f.archivedAt !== null));
  const shown = $derived(query.trim() === '' ? active : searchFoods(active, query, 50));

  function closeOnSuccess(close: () => void): SubmitFunction {
    return () =>
      async ({ result, update }) => {
        await update();
        if (result.type === 'success') close();
      };
  }

  /** `per 100 g`, `per item` — how the figures on the row should be read. */
  const per = (unit: string) => (unit === 'item' ? 'per item' : `per 100 ${unit}`);
</script>

<svelte:head><title>Foods — health-me</title></svelte:head>

<header class="flex items-baseline justify-between gap-3">
  <div>
    <p class="eyebrow text-ink-muted">Reference</p>
    <h1 class="mt-2 text-2xl font-semibold tracking-tight">Foods</h1>
  </div>
  <a href="/meals" class="text-accent text-sm font-semibold whitespace-nowrap">← Meals</a>
</header>

<p class="text-ink-muted mt-2 text-sm">
  Nutrition per 100 g, or per item for things you count. Edit anything — the packet in your cupboard
  wins over the starter figures.
</p>

<!-- ============================= Add ============================= -->
<section class="card mt-4 overflow-hidden">
  <div class="flex items-center justify-between gap-3 p-4">
    <span class="eyebrow text-ink-muted">Add a food</span>
    {#if !adding}
      <button type="button" class="btn-quiet" onclick={() => (adding = true)}>New</button>
    {/if}
  </div>
  {#if adding}
    <form
      method="POST"
      action="?/add"
      use:enhance={closeOnSuccess(() => (adding = false))}
      class="border-hairline grid grid-cols-2 gap-3 border-t p-4 sm:grid-cols-[1fr_6rem_6rem_6rem_7rem_auto] sm:items-end"
    >
      <label class="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
        <span class="eyebrow text-ink-muted">Name</span>
        <!-- svelte-ignore a11y_autofocus -->
        <input name="name" required autofocus class="field" />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="eyebrow text-ink-muted">Unit</span>
        <select name="unit" value="g" class="field">
          <option value="g">g</option>
          <option value="ml">ml</option>
          <option value="item">item</option>
        </select>
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="eyebrow text-ink-muted">Kcal</span>
        <input name="kcal" type="number" step="any" min="0" required class="field" />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="eyebrow text-ink-muted">Protein g</span>
        <input name="proteinG" type="number" step="any" min="0" required class="field" />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="eyebrow text-ink-muted">Usual portion</span>
        <input name="defaultQty" type="number" step="any" min="0" class="field" />
      </label>
      <div class="col-span-2 flex gap-3 sm:col-span-1">
        <button class="btn-primary flex-1">Save</button>
        <button type="button" class="btn-quiet" onclick={() => (adding = false)}>Cancel</button>
      </div>
      <p class="text-ink-muted col-span-2 text-xs sm:col-span-6">
        Kcal and protein are per 100 g/ml, or per single item.
      </p>
    </form>
  {/if}
  {#if form?.error}
    <p class="text-over border-hairline border-t px-4 py-3 text-sm">{form.error}</p>
  {/if}
</section>

<!-- ============================= List ============================= -->
<section class="mt-8">
  <label class="flex flex-col gap-1.5">
    <span class="eyebrow text-ink-muted">Search</span>
    <input type="search" bind:value={query} placeholder="Filter…" class="field" />
  </label>

  <div class="card mt-3">
    {#if shown.length === 0}
      <p class="text-ink-muted p-4 text-sm">No foods match.</p>
    {:else}
      <ul>
        {#each shown as food (food.id)}
          <li class="border-hairline border-b p-4 last:border-0">
            {#if editingId === food.id}
              <form
                method="POST"
                action="?/update"
                use:enhance={closeOnSuccess(() => (editingId = null))}
                class="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_6rem_6rem_6rem_7rem_auto] sm:items-end"
              >
                <input type="hidden" name="id" value={food.id} />
                <label class="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
                  <span class="eyebrow text-ink-muted">Name</span>
                  <input name="name" required value={food.name} class="field" />
                </label>
                <label class="flex flex-col gap-1.5">
                  <span class="eyebrow text-ink-muted">Unit</span>
                  <select name="unit" value={food.unit} class="field">
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="item">item</option>
                  </select>
                </label>
                <label class="flex flex-col gap-1.5">
                  <span class="eyebrow text-ink-muted">Kcal</span>
                  <input
                    name="kcal"
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={food.kcal}
                    class="field"
                  />
                </label>
                <label class="flex flex-col gap-1.5">
                  <span class="eyebrow text-ink-muted">Protein g</span>
                  <input
                    name="proteinG"
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={food.proteinG}
                    class="field"
                  />
                </label>
                <label class="flex flex-col gap-1.5">
                  <span class="eyebrow text-ink-muted">Usual portion</span>
                  <input
                    name="defaultQty"
                    type="number"
                    step="any"
                    min="0"
                    value={food.defaultQty}
                    class="field"
                  />
                </label>
                <div class="col-span-2 flex gap-3 sm:col-span-1">
                  <button class="btn-primary flex-1">Save</button>
                  <button type="button" class="btn-quiet" onclick={() => (editingId = null)}>
                    Cancel
                  </button>
                </div>
              </form>
            {:else}
              <div class="flex items-center gap-3">
                <div class="min-w-0 flex-1">
                  <p class="truncate font-medium">{food.name}</p>
                  <p class="text-ink-muted tabular mt-0.5 font-mono text-xs">
                    {food.kcal} kcal · {food.proteinG} g P {per(food.unit)} · usual {food.defaultQty}{food.unit ===
                    'item'
                      ? ''
                      : food.unit}
                  </p>
                </div>
                <button
                  type="button"
                  class="text-ink-muted hover:text-ink flex min-h-11 items-center px-2 text-sm"
                  onclick={() => (editingId = food.id)}
                >
                  Edit
                </button>
                <form method="POST" action="?/archive" use:enhance>
                  <input type="hidden" name="id" value={food.id} />
                  <button
                    class="text-ink-muted hover:text-over flex min-h-11 items-center px-2 text-sm"
                  >
                    Hide
                  </button>
                </form>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>

<!-- Archived rather than deleted, because every meal logged with a food points
     at it — hiding keeps that history readable. -->
{#if archived.length > 0}
  <section class="mt-8">
    <details class="card p-4">
      <summary class="eyebrow text-ink-muted flex min-h-11 cursor-pointer items-center">
        Hidden ({archived.length})
      </summary>
      <ul class="mt-2">
        {#each archived as food (food.id)}
          <li class="border-hairline flex items-center gap-3 border-b py-2 last:border-0">
            <span class="text-ink-muted min-w-0 flex-1 truncate text-sm">{food.name}</span>
            <form method="POST" action="?/restore" use:enhance>
              <input type="hidden" name="id" value={food.id} />
              <button class="text-accent flex min-h-11 items-center px-2 text-sm">Restore</button>
            </form>
          </li>
        {/each}
      </ul>
    </details>
  </section>
{/if}
