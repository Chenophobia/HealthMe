<script lang="ts">
  import { searchFoods, scaleFood, formatQuantity, type FoodUnit } from '$lib/foods';

  export type PickableFood = {
    id: number;
    name: string;
    unit: string;
    baseQty: number;
    kcal: number;
    proteinG: number;
    defaultQty: number;
  };

  let { foods }: { foods: PickableFood[] } = $props();

  let query = $state('');
  let selected: PickableFood | null = $state(null);
  let quantity = $state('');

  const results = $derived(selected ? [] : searchFoods(foods, query));
  const preview = $derived(selected ? scaleFood(selected, Number(quantity)) : null);

  function pick(food: PickableFood) {
    selected = food;
    quantity = String(food.defaultQty);
    query = '';
  }

  function clear() {
    selected = null;
    quantity = '';
    query = '';
  }
</script>

{#if selected}
  <input type="hidden" name="foodId" value={selected.id} />
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-3">
      <span class="font-medium">{selected.name}</span>
      <button type="button" class="text-ink-muted hover:text-ink text-sm" onclick={clear}>
        Change
      </button>
    </div>

    <div class="flex items-end gap-3">
      <label class="flex flex-1 flex-col gap-1.5">
        <span class="eyebrow text-ink-muted">
          How much · {selected.unit === 'item' ? 'items' : selected.unit}
        </span>
        <!-- svelte-ignore a11y_autofocus -->
        <input
          name="quantity"
          type="number"
          step="any"
          min="0"
          required
          autofocus
          bind:value={quantity}
          class="field"
        />
      </label>
      <button class="btn-primary">Add</button>
    </div>

    <!-- What the portion actually costs, before you commit it. -->
    <p class="text-ink-muted tabular font-mono text-xs">
      {#if preview}
        {formatQuantity(Number(quantity), selected.unit as FoodUnit)} · {preview.kcal} kcal · {preview.proteinG}
        g P
      {:else}
        Enter a portion.
      {/if}
    </p>
  </div>
{:else}
  <div class="flex flex-col gap-2">
    <label class="flex flex-col gap-1.5">
      <span class="eyebrow text-ink-muted">Search food</span>
      <input
        type="search"
        bind:value={query}
        placeholder="chicken, banana, whey…"
        autocomplete="off"
        class="field"
      />
    </label>

    {#if query.trim() !== ''}
      {#if results.length === 0}
        <p class="text-ink-muted text-sm">
          Nothing matches. <a href="/foods" class="text-accent font-medium">Add it →</a>
        </p>
      {:else}
        <ul class="border-hairline divide-hairline divide-y rounded-sm border">
          {#each results as food (food.id)}
            <li>
              <button
                type="button"
                class="hover:bg-accent/8 flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left"
                onclick={() => pick(food)}
              >
                <span class="truncate">{food.name}</span>
                <span class="text-ink-muted tabular font-mono text-xs whitespace-nowrap">
                  {food.kcal} kcal / {food.baseQty}{food.unit === 'item' ? '' : food.unit}
                </span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    {/if}
  </div>
{/if}
