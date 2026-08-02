<script lang="ts">
  import { enhance } from '$app/forms';
  import { rollingAverage } from '$lib/rolling';
  import { KCAL_TARGET, PROTEIN_TARGET_G, PROTEIN_AIM_G } from '$lib/targets';
  import MacroBar from '$lib/components/MacroBar.svelte';
  import TrendChart from '$lib/components/TrendChart.svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const SESSION_LABELS: Record<string, string> = { push: 'Push', pull: 'Pull', legs: 'Legs' };

  const weightSeries = $derived(data.recent.map((m) => ({ date: m.date, value: m.weightKg })));
  const weightAverage = $derived(rollingAverage(weightSeries, 7));
</script>

<svelte:head><title>Today — health-me</title></svelte:head>

<h1 class="text-2xl font-bold">Today · {data.date}</h1>

<!-- ============================= Scheduled session ============================= -->
{#if data.scheduled}
  <a
    href="/workouts"
    class="border-hairline bg-surface mt-4 flex items-center justify-between gap-3 rounded-lg border p-4 text-sm"
  >
    <span
      ><span class="font-medium">{SESSION_LABELS[data.scheduled]} day</span> — see today's exercises</span
    >
    <span class="text-accent font-medium whitespace-nowrap">Go →</span>
  </a>
{:else}
  <p class="text-ink-muted border-hairline bg-surface mt-4 rounded-lg border p-4 text-sm">
    Rest day — no session scheduled.
  </p>
{/if}

<!-- ============================= Today's nutrition ============================= -->
<div class="bg-surface border-hairline mt-4 rounded-lg border p-4">
  <div class="flex items-baseline justify-between gap-2">
    <h2 class="font-semibold">Today's nutrition</h2>
    <a href="/meals" class="text-accent text-sm font-medium whitespace-nowrap">Meals →</a>
  </div>
  <div class="mt-3 flex flex-col gap-3">
    <MacroBar label="Calories" value={data.totals.kcal} target={KCAL_TARGET} unit="kcal" />
    <MacroBar
      label="Protein"
      value={data.totals.proteinG}
      target={PROTEIN_TARGET_G}
      unit="g"
      aim={PROTEIN_AIM_G}
    />
  </div>
</div>

<!-- ============================= Weigh-in ============================= -->
<div class="bg-surface border-hairline mt-4 rounded-lg border p-4">
  <h2 class="font-semibold">Weigh-in</h2>
  {#if data.latest}
    <p class="mt-2 text-sm">
      <span class="font-medium"
        >{data.latest.weightKg} kg{data.latest.bodyFatPct !== null
          ? ` · ${data.latest.bodyFatPct}%`
          : ''}</span
      >
      on {data.latest.date}
    </p>
  {:else}
    <p class="text-ink-muted mt-2 text-sm">No weigh-ins yet.</p>
  {/if}

  <form method="POST" action="?/weighin" use:enhance class="mt-3 flex flex-wrap items-end gap-3">
    <label class="flex flex-col gap-1 text-sm">
      Date
      <input
        name="date"
        type="date"
        value={data.date}
        max={data.date}
        required
        class="border-hairline bg-surface rounded-md border px-3 py-2"
      />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Weight (kg)
      <input
        name="weightKg"
        type="number"
        step="0.1"
        min="1"
        required
        class="border-hairline bg-surface w-28 rounded-md border px-3 py-2"
      />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Body fat %
      <input
        name="bodyFatPct"
        type="number"
        step="0.1"
        placeholder="optional"
        class="border-hairline bg-surface w-28 rounded-md border px-3 py-2"
      />
    </label>
    <button class="bg-accent text-on-accent rounded-md px-4 py-2 font-semibold whitespace-nowrap">
      Log weigh-in
    </button>
  </form>
  {#if form?.error}
    <p class="text-over mt-3 text-sm">{form.error}</p>
  {:else if form?.ok}
    <p class="text-accent mt-3 text-sm">Weigh-in saved for {form.date}.</p>
  {/if}
  <p class="text-ink-muted mt-2 text-xs">Re-submitting a day replaces that day's entry.</p>
</div>

<!-- ============================= Consistency ============================= -->
<div class="bg-surface border-hairline mt-4 rounded-lg border p-4">
  <h2 class="font-semibold">Consistency</h2>
  <p class="mt-2 text-sm">
    {data.streak}-day logging streak
  </p>
</div>

<!-- ============================= Weight trend ============================= -->
<div class="bg-surface border-hairline mt-4 mb-4 rounded-lg border p-4">
  <div class="flex items-baseline justify-between gap-2">
    <h2 class="font-semibold">Weight (last 30 entries)</h2>
    <a href="/progress" class="text-accent text-sm font-medium whitespace-nowrap">Progress →</a>
  </div>
  <div class="mt-3">
    <TrendChart series={weightSeries} average={weightAverage} unit="kg" />
  </div>
</div>
