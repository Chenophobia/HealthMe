<script lang="ts">
  import { rollingAverage } from '$lib/rolling';
  import TrendChart from '$lib/components/TrendChart.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const weightSeries = $derived(data.metrics.map((m) => ({ date: m.date, value: m.weightKg })));
  const weightAverage = $derived(rollingAverage(weightSeries, 7));

  const bodyFatSeries = $derived(
    data.metrics
      .filter((m) => m.bodyFatPct !== null)
      .map((m) => ({ date: m.date, value: m.bodyFatPct as number }))
  );
  const bodyFatAverage = $derived(rollingAverage(bodyFatSeries, 7));

  const first = $derived(data.metrics[0] ?? null);
  const latest = $derived(data.metrics.at(-1) ?? null);
  const change = $derived(
    first && latest && data.metrics.length >= 2 ? latest.weightKg - first.weightKg : null
  );
</script>

<svelte:head><title>Progress — health-me</title></svelte:head>

<h1 class="text-2xl font-bold">Progress</h1>

<!-- ============================= Weight ============================= -->
<div class="bg-surface border-hairline mt-4 rounded-lg border p-4">
  <h2 class="font-semibold">Weight</h2>
  <div class="mt-3">
    <TrendChart series={weightSeries} average={weightAverage} unit="kg" />
  </div>
  <p class="text-ink-muted mt-2 text-sm">
    Judge the green weekly-average line, not the dots — daily swings of 1–2 kg are just water.
  </p>
</div>

<!-- ============================= Body fat % ============================= -->
{#if bodyFatSeries.length > 0}
  <div class="bg-surface border-hairline mt-4 rounded-lg border p-4">
    <h2 class="font-semibold">Body fat %</h2>
    <div class="mt-3">
      <TrendChart series={bodyFatSeries} average={bodyFatAverage} unit="%" />
    </div>
  </div>
{/if}

<!-- ============================= Consistency ============================= -->
<div class="bg-surface border-hairline mt-4 rounded-lg border p-4">
  <h2 class="font-semibold">Consistency</h2>
  <p class="mt-2 text-sm">
    {data.streak}-day logging streak
  </p>
</div>

<!-- ============================= Change summary ============================= -->
{#if change !== null && first}
  <p class="text-ink-muted mt-4 mb-4 text-sm">
    Since {first.date}: {change >= 0 ? '+' : ''}{change.toFixed(1)} kg
  </p>
{/if}
