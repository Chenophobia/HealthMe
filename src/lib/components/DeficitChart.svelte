<script lang="ts">
  import { formatNumber } from '$lib/readout';

  type Day = { date: string; deficitKcal: number | null };
  let { days }: { days: Day[] } = $props();

  /* Days without both a BMR and food logged are dropped rather than drawn as
     zero — a gap in the record isn't a day that balanced. */
  const shown = $derived(
    days
      .filter((d): d is { date: string; deficitKcal: number } => d.deficitKcal !== null)
      .slice(-30)
  );

  const W = 520;
  const H = 150;
  const PAD = { top: 12, right: 4, bottom: 12, left: 4 };
  const PLOT_H = H - PAD.top - PAD.bottom;

  /* The zero line sits wherever the data puts it, so a run of pure deficit
     doesn't waste half the box on a surplus that never happened. */
  const posMax = $derived(Math.max(0, ...shown.map((d) => d.deficitKcal)));
  const negMax = $derived(Math.max(0, ...shown.map((d) => -d.deficitKcal)));
  const span = $derived(posMax + negMax || 1);
  const zeroY = $derived(PAD.top + (posMax / span) * PLOT_H);

  const slot = $derived((W - PAD.left - PAD.right) / Math.max(1, shown.length));
  const barW = $derived(Math.max(1, slot - Math.min(3, slot * 0.3)));

  const geom = (value: number) => {
    const h = (Math.abs(value) / span) * PLOT_H;
    return value >= 0 ? { y: zeroY - h, h } : { y: zeroY, h };
  };
</script>

{#if shown.length === 0}
  <p class="text-ink-muted py-10 text-center text-sm">
    Nothing to plot yet — a day needs both a BMR and food logged.
  </p>
{:else}
  <figure class="flex flex-col gap-2">
    <figcaption class="flex items-baseline justify-between gap-3">
      <span class="eyebrow text-ink-muted">Best / worst</span>
      <span class="tabular font-mono text-sm">
        <span class={posMax > 0 ? 'text-good' : 'text-ink-muted'}
          >{posMax > 0 ? `+${formatNumber(posMax)}` : '0'}</span
        >
        <span class="text-ink-muted">/</span>
        <!-- Guarded: with no surplus day in the window this would otherwise
             render as "−0". -->
        <span class={negMax > 0 ? 'text-over' : 'text-ink-muted'}
          >{negMax > 0 ? `−${formatNumber(negMax)}` : '0'}</span
        >
        <span class="text-ink-muted">kcal</span>
      </span>
    </figcaption>

    <svg
      viewBox="0 0 {W} {H}"
      class="w-full"
      role="img"
      aria-label="Daily energy balance for the last {shown.length} logged days"
    >
      {#each shown as day, i (day.date)}
        {@const g = geom(day.deficitKcal)}
        <rect
          x={PAD.left + i * slot + (slot - barW) / 2}
          y={g.y}
          width={barW}
          height={Math.max(1, g.h)}
          rx={Math.min(2, barW / 2)}
          class={day.deficitKcal >= 0 ? 'fill-good' : 'fill-over'}
        />
      {/each}

      <line
        x1={PAD.left}
        y1={zeroY}
        x2={W - PAD.right}
        y2={zeroY}
        class="stroke-ink opacity-35"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />
    </svg>

    <div class="text-ink-muted flex justify-between gap-3">
      <span class="eyebrow">{shown[0].date}</span>
      <span class="eyebrow">{shown.at(-1)!.date}</span>
    </div>
  </figure>
{/if}
