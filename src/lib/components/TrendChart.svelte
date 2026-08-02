<script lang="ts">
  type Point = { date: string; value: number };
  let { series, average, unit }: { series: Point[]; average?: Point[]; unit: string } = $props();

  /* The viewBox scales to the card; strokes are pinned with
     vector-effect so lines stay hairline-thin on a phone and don't bloat on
     a desktop. Every label lives in HTML outside the SVG, so type stays at a
     real size instead of being scaled by the viewport. */
  /* 3:1 rather than wider — at 343px of phone screen a flatter box squashes
     the trend into an unreadable band. */
  const W = 520;
  const H = 170;
  const PAD = { top: 12, right: 6, bottom: 26, left: 6 };
  const BASELINE = H - 14;

  const all = $derived([...series, ...(average ?? [])]);
  const t0 = $derived(new Date(`${series[0]?.date ?? '1970-01-01'}T00:00:00Z`).getTime());
  const t1 = $derived(new Date(`${series.at(-1)?.date ?? '1970-01-01'}T00:00:00Z`).getTime());
  const vMin = $derived(Math.min(...all.map((p) => p.value)));
  const vMax = $derived(Math.max(...all.map((p) => p.value)));
  const span = $derived(vMax - vMin || 1);

  function x(date: string): number {
    const t = new Date(`${date}T00:00:00Z`).getTime();
    const f = t1 === t0 ? 0.5 : (t - t0) / (t1 - t0);
    return PAD.left + f * (W - PAD.left - PAD.right);
  }
  function y(v: number): number {
    const f = (v - vMin) / span;
    return H - PAD.bottom - f * (H - PAD.top - PAD.bottom);
  }
  const path = (pts: Point[]) =>
    pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date)},${y(p.value)}`).join(' ');
</script>

{#if series.length === 0}
  <p class="text-ink-muted py-10 text-center text-sm">
    No entries yet. Log a weigh-in and the trend starts here.
  </p>
{:else}
  <figure class="flex flex-col gap-2">
    <figcaption class="flex items-baseline justify-between gap-3">
      <span class="eyebrow text-ink-muted">Range</span>
      <span class="tabular text-ink font-mono text-sm">
        {vMin.toFixed(1)}–{vMax.toFixed(1)}
        <span class="text-ink-muted">{unit}</span>
      </span>
    </figcaption>

    <svg
      viewBox="0 0 {W} {H}"
      class="w-full"
      role="img"
      aria-label="{series.length} entries from {series[0].date} to {series.at(-1)!
        .date}, {vMin.toFixed(1)} to {vMax.toFixed(1)} {unit}"
    >
      <!-- Daily readings: quiet, because they are mostly water. -->
      <path
        d={path(series)}
        fill="none"
        class="stroke-ink opacity-25"
        stroke-width="1.5"
        vector-effect="non-scaling-stroke"
      />
      {#each series as p (p.date)}
        <circle cx={x(p.date)} cy={y(p.value)} r="2.5" class="fill-ink opacity-40" />
      {/each}

      <!-- The seven-day average is the line to judge, so it is the only
           thing on the chart drawn in the accent. -->
      {#if average && average.length > 1}
        <path
          d={path(average)}
          fill="none"
          class="stroke-accent"
          stroke-width="2.5"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
        />
      {/if}

      <!-- A tick per entry along the rule: the gaps are days you didn't log. -->
      <g class="stroke-ink opacity-30">
        <line
          x1={PAD.left}
          y1={BASELINE}
          x2={W - PAD.right}
          y2={BASELINE}
          stroke-width="1"
          vector-effect="non-scaling-stroke"
        />
        {#each series as p (p.date)}
          <line
            x1={x(p.date)}
            y1={BASELINE}
            x2={x(p.date)}
            y2={BASELINE + 7}
            stroke-width="1"
            vector-effect="non-scaling-stroke"
          />
        {/each}
      </g>
    </svg>

    <div class="text-ink-muted flex justify-between gap-3">
      <span class="eyebrow">{series[0].date}</span>
      <span class="eyebrow">{series.at(-1)!.date}</span>
    </div>
  </figure>
{/if}
