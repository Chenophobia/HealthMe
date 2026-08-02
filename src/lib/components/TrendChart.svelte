<script lang="ts">
  type Point = { date: string; value: number };
  let {
    series,
    average,
    unit,
    height = 160
  }: { series: Point[]; average?: Point[]; unit: string; height?: number } = $props();

  const W = 640;
  const PAD = { top: 10, right: 12, bottom: 22, left: 40 };

  const all = $derived([...series, ...(average ?? [])]);
  const dates = $derived(series.map((p) => p.date));
  const t0 = $derived(new Date(`${dates[0]}T00:00:00Z`).getTime());
  const t1 = $derived(new Date(`${dates[dates.length - 1]}T00:00:00Z`).getTime());
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
    return height - PAD.bottom - f * (height - PAD.top - PAD.bottom);
  }
  const path = (pts: Point[]) =>
    pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date)},${y(p.value)}`).join(' ');
</script>

{#if series.length === 0}
  <p class="text-ink-muted py-8 text-center text-sm">No entries yet.</p>
{:else}
  <svg viewBox="0 0 {W} {height}" class="w-full" role="img" aria-label="Trend chart">
    <text x="4" y={y(vMax) + 4} class="fill-current text-[10px] opacity-60">{vMax.toFixed(1)}</text>
    <text x="4" y={y(vMin) + 4} class="fill-current text-[10px] opacity-60">{vMin.toFixed(1)}</text>
    <line
      x1={PAD.left}
      y1={y(vMin)}
      x2={W - PAD.right}
      y2={y(vMin)}
      class="stroke-current opacity-20"
    />
    <path d={path(series)} fill="none" class="stroke-current opacity-35" stroke-width="1.5" />
    {#each series as p (p.date)}
      <circle cx={x(p.date)} cy={y(p.value)} r="2.5" class="fill-current opacity-60" />
    {/each}
    {#if average && average.length > 1}
      <path d={path(average)} fill="none" stroke="var(--color-accent)" stroke-width="2.5" />
    {/if}
    <text x={PAD.left} y={height - 6} class="fill-current text-[10px] opacity-60">{dates[0]}</text>
    <text
      x={W - PAD.right}
      y={height - 6}
      text-anchor="end"
      class="fill-current text-[10px] opacity-60"
    >
      {dates[dates.length - 1]} ({unit})
    </text>
  </svg>
{/if}
