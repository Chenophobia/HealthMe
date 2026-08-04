<script lang="ts">
  import { enhance } from '$app/forms';
  import { PROTEIN_TARGET_G, PROTEIN_AIM_G } from '$lib/targets';
  import { weekdayOf } from '$lib/dates';
  import DateNav from '$lib/components/DateNav.svelte';
  import FoodPicker from '$lib/components/FoodPicker.svelte';
  import Gauge from '$lib/components/Gauge.svelte';
  import { formatQuantity, type FoodUnit } from '$lib/foods';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const mealSlotLabels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack'
  };

  const isToday = $derived(data.date === data.today);

  /* One card, two ways to fill it. Splitting these across separate cards made
     the page read as two unrelated jobs. */
  let logMode: 'food' | 'custom' = $state('food');
</script>

<svelte:head><title>Meals — health-me</title></svelte:head>

<header>
  <p class="eyebrow text-ink-muted">{weekdayOf(data.date)} · {data.date}</p>
  <h1 class="mt-2 text-2xl font-semibold tracking-tight">Meals</h1>
</header>

<DateNav
  date={data.date}
  prevDate={data.prevDate}
  nextDate={data.nextDate}
  today={data.today}
  basePath="/meals"
/>

<!-- ============================= Totals ============================= -->
<section class="card mt-4 p-4 sm:p-5">
  <div class="flex flex-col gap-5 sm:flex-row sm:gap-8">
    <div class="flex-1">
      <Gauge label="Calories" value={data.totals.kcal} target={data.kcalTarget} unit="kcal" />
    </div>
    <div class="flex-1">
      <Gauge
        label="Protein"
        value={data.totals.proteinG}
        target={PROTEIN_TARGET_G}
        aim={PROTEIN_AIM_G}
        unit="g"
        kind="floor"
      />
    </div>
  </div>
</section>

<!-- ============================= The day's log ============================= -->
<section class="mt-8">
  <h2 class="eyebrow text-ink-muted">Logged{isToday ? ' today' : ` on ${data.date}`}</h2>
  <div class="card mt-3">
    {#if data.logs.length === 0}
      <p class="text-ink-muted p-4 text-sm">Nothing logged yet. Add the first meal below.</p>
    {:else}
      <ul>
        {#each data.logs as log (log.id)}
          <li class="border-hairline flex items-center gap-3 border-b p-4 last:border-0">
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{log.name}</p>
              <p class="text-ink-muted tabular mt-0.5 font-mono text-xs">
                <!-- Non-breaking so a wrap can't orphan the "P" on its own line. -->
                {mealSlotLabels[log.mealSlot]}{log.quantity && log.unit
                  ? ` · ${formatQuantity(log.quantity, log.unit as FoodUnit)}`
                  : ''} · {log.kcal}&nbsp;kcal · {log.proteinG}&nbsp;g&nbsp;P
              </p>
            </div>
            <form method="POST" action="?/delete" use:enhance>
              <input type="hidden" name="id" value={log.id} />
              <button
                class="text-ink-muted hover:text-over flex min-h-11 items-center px-2 text-sm whitespace-nowrap"
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

<!-- ============================= Log ============================= -->
<section class="card mt-8 overflow-hidden">
  <div class="flex items-center justify-between gap-3 p-4">
    <span class="eyebrow text-ink-muted">Log</span>
    <div class="border-hairline flex rounded-sm border p-0.5" role="group" aria-label="Entry type">
      {#each [{ id: 'food', label: 'Food' }, { id: 'custom', label: 'Custom' }] as mode (mode.id)}
        <button
          type="button"
          aria-pressed={logMode === mode.id}
          class="rounded-xs px-3 py-1.5 text-sm font-medium {logMode === mode.id
            ? 'bg-accent text-on-accent'
            : 'text-ink-muted hover:text-ink'}"
          onclick={() => (logMode = mode.id as 'food' | 'custom')}
        >
          {mode.label}
        </button>
      {/each}
    </div>
  </div>

  {#if logMode === 'food'}
    <form
      method="POST"
      action="?/food"
      use:enhance
      class="border-hairline flex flex-col gap-3 border-t p-4"
    >
      <input type="hidden" name="date" value={data.date} />
      <label class="flex flex-col gap-1.5 sm:w-36">
        <span class="eyebrow text-ink-muted">Slot</span>
        <select name="mealSlot" value="lunch" class="field">
          {#each Object.entries(mealSlotLabels) as [value, label] (value)}
            <option {value}>{label}</option>
          {/each}
        </select>
      </label>

      <!-- Keyed on the log count so the picker resets itself after each add,
           ready for the next ingredient rather than holding the last one. -->
      {#key data.logs.length}
        <FoodPicker foods={data.foods} />
      {/key}

      {#if form?.foodError}
        <p class="text-over text-sm">{form.foodError}</p>
      {/if}
    </form>
    <p class="border-hairline text-ink-muted border-t px-4 py-3 text-sm">
      <a href="/foods" class="text-accent font-medium">Manage foods →</a>
    </p>
  {:else}
    <form
      method="POST"
      action="?/custom"
      use:enhance
      class="border-hairline grid grid-cols-2 gap-3 border-t p-4 sm:grid-cols-[8rem_1fr_6rem_6rem_auto] sm:items-end"
    >
      <input type="hidden" name="date" value={data.date} />
      <label class="flex flex-col gap-1.5">
        <span class="eyebrow text-ink-muted">Slot</span>
        <select name="mealSlot" value="lunch" class="field">
          {#each Object.entries(mealSlotLabels) as [value, label] (value)}
            <option {value}>{label}</option>
          {/each}
        </select>
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="eyebrow text-ink-muted">Name</span>
        <input name="name" required class="field" />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="eyebrow text-ink-muted">Kcal</span>
        <input name="kcal" type="number" min="0" required class="field" />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="eyebrow text-ink-muted">Protein g</span>
        <input name="proteinG" type="number" min="0" required class="field" />
      </label>
      <button class="btn-primary col-span-2 sm:col-span-1">Add</button>
      {#if form?.error}
        <p class="text-over col-span-2 text-sm sm:col-span-5">{form.error}</p>
      {/if}
    </form>
  {/if}
</section>
