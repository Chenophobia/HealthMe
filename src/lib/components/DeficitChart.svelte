<script lang="ts">
  import { rollingAverage } from '$lib/rolling';
  import { formatNumber } from '$lib/readout';

  type Day = { date: string; deficitKcal: number | null };
  let { days }: { days: Day[] } = $props();

  /* Days without both a resting figure and food logged are dropped rather than
     drawn as zero — a gap in the record isn't a day that balanced. */
  const shown = $derived(
    days
      .filter((d): d is { date: string; deficitKcal: number } => d.deficitKcal !== null)
      .slice(-30)
  );

  /* Same grammar as the weight chart: quiet dots for the daily figure, one
     line for the average, because a single day's balance is as noisy as a
     single day's weight and neither is worth reading on its own. */
  const series = $derived(shown.map((d) => ({ date: d.date, value: d.deficitKcal })));
  const average = $derived(rollingAverage(series, 7));

  const W = 520;
  const H = 160;
  const PAD = { top: 12, right: 8, bottom: 12, left: 8 };

  const all = $derived([...series, ...average].map((p) => p.value));
  // Zero has to be in range or the baseline can't be drawn where it belongs.
  const vMin = $derived(Math.min(0, ...all));
  const vMax = $derived(Math.max(0, ...all));
  const span = $derived(vMax - vMin || 1);

  const t0 = $derived(new Date(`${shown[0]?.date ?? '1970-01-01'}T00:00:00Z`).getTime());
  const t1 = $derived(new Date(`${shown.at(-1)?.date ?? '1970-01-01'}T00:00:00Z`).getTime());

  function x(date: string): number {
    const t = new Date(`${date}T00:00:00Z`).getTime();
    const f = t1 === t0 ? 0.5 : (t - t0) / (t1 - t0);
    return PAD.left + f * (W - PAD.left - PAD.right);
  }
  function y(value: number): number {
    const f = (value - vMin) / span;
    return H - PAD.bottom - f * (H - PAD.top - PAD.bottom);
  }
  const path = (pts: { date: string; value: number }[]) =>
    pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date)},${y(p.value)}`).join(' ');

  const latestAverage = $derived(average.at(-1)?.value ?? null);
</script>

{#if shown.length === 0}
  <p class="text-ink-muted py-10 text-center text-sm">
    Nothing to plot yet — a day needs food logged before it has a balance.
  </p>
{:else}
  <figure class="flex flex-col gap-2">
    <figcaption class="flex items-baseline justify-between gap-3">
      <span class="eyebrow text-ink-muted">7-day average</span>
      <span class="tabular font-mono text-sm">
        {#if latestAverage === null}
          <span class="text-ink-muted">—</span>
        {:else}
          <span class={latestAverage >= 0 ? 'text-good' : 'text-over'}>
            {latestAverage >= 0 ? '+' : '−'}{formatNumber(Math.abs(latestAverage))}
          </span>
          <span class="text-ink-muted">kcal/day</span>
        {/if}
      </span>
    </figcaption>

    <svg
      viewBox="0 0 {W} {H}"
      class="w-full"
      role="img"
      aria-label="Daily energy balance across {shown.length} logged days"
    >
      <!-- Break-even. Dots above it are deficit days, below are surplus. -->
      <line
        x1={PAD.left}
        y1={y(0)}
        x2={W - PAD.right}
        y2={y(0)}
        class="stroke-ink opacity-30"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />

      {#each shown as day (day.date)}
        <circle
          cx={x(day.date)}
          cy={y(day.deficitKcal)}
          r="3.5"
          class={day.deficitKcal >= 0 ? 'fill-good' : 'fill-over'}
          opacity="0.75"
        />
      {/each}

      {#if average.length > 1}
        <path
          d={path(average)}
          fill="none"
          class="stroke-accent"
          stroke-width="2.5"
          stroke-linejoin="round"
          stroke-dasharray="6 4"
          vector-effect="non-scaling-stroke"
        />
      {/if}
    </svg>

    <div class="text-ink-muted flex justify-between gap-3">
      <span class="eyebrow">{shown[0].date}</span>
      <span class="eyebrow">{shown.at(-1)!.date}</span>
    </div>
  </figure>
{/if}
