<script lang="ts">
  import { rollingAverage } from '$lib/rolling';
  import { formatSigned } from '$lib/readout';
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

<header>
  <p class="eyebrow text-ink-muted">Since you started</p>
  <h1 class="mt-2 text-2xl font-semibold tracking-tight">Progress</h1>
</header>

<!-- ============================= Headline change ============================= -->
<section class="card mt-4 grid grid-cols-2 gap-5 p-5 sm:p-6">
  <div class="flex flex-col gap-2">
    <p class="eyebrow text-ink-muted">Net change</p>
    {#if change !== null && first}
      <p class="tabular font-mono text-4xl leading-none font-semibold tracking-tight sm:text-5xl">
        {formatSigned(change)}<span class="text-ink-muted ml-1 text-base font-normal">kg</span>
      </p>
      <p class="text-ink-muted text-sm">Since {first.date}.</p>
    {:else}
      <p class="text-ink-muted text-sm">Two weigh-ins needed before there's a change to show.</p>
    {/if}
  </div>
  <div class="border-hairline flex flex-col gap-2 border-l pl-5 sm:pl-8">
    <p class="eyebrow text-ink-muted">Logging streak</p>
    <p class="tabular font-mono text-4xl leading-none font-semibold tracking-tight sm:text-5xl">
      {data.streak}<span class="text-ink-muted ml-1 text-base font-normal">days</span>
    </p>
    <p class="text-ink-muted text-sm">Days in a row with a meal logged.</p>
  </div>
</section>

<!-- ============================= Weight ============================= -->
<section class="card mt-4 p-4 sm:p-5">
  <h2 class="eyebrow text-ink-muted">Weight</h2>
  <div class="mt-3">
    <TrendChart series={weightSeries} average={weightAverage} unit="kg" />
  </div>
  <p class="text-ink-muted mt-3 text-sm">
    Judge the accent line — the seven-day average. Daily swings of 1–2 kg are water.
  </p>
</section>

<!-- ============================= Body fat % ============================= -->
{#if bodyFatSeries.length > 0}
  <section class="card mt-4 p-4 sm:p-5">
    <h2 class="eyebrow text-ink-muted">Body fat</h2>
    <div class="mt-3">
      <TrendChart series={bodyFatSeries} average={bodyFatAverage} unit="%" />
    </div>
  </section>
{/if}
