<script lang="ts">
  import { weekdayOf } from '$lib/dates';
  import { formatNumber } from '$lib/readout';
  import type { WeekDay } from '$lib/server/week';

  /*
   * Seven days of eaten-vs-allowance, Lose It!'s weekly breakdown reduced to
   * its shape: under-allowance days in the good tone, breached days in the
   * over tone, unlogged days an empty outline. Each bar is scaled to its own
   * day's allowance, with the overflow drawn past the allowance line.
   */
  let { week, viewedDate }: { week: WeekDay[]; viewedDate: string } = $props();

  /* Full height = 115% of allowance so a breach has somewhere to go and the
     allowance line sits just under the top. */
  const HEADROOM = 1.15;

  function fillPct(d: WeekDay): number {
    if (d.allowanceKcal <= 0) return 0;
    return Math.min(1, d.eatenKcal / (d.allowanceKcal * HEADROOM)) * 100;
  }
  const linePct = (100 / HEADROOM).toFixed(1);
</script>

<div
  class="flex items-end justify-between gap-2"
  role="img"
  aria-label="Last 7 days against budget"
>
  {#each week as d (d.date)}
    {@const over = d.logged && d.eatenKcal > d.allowanceKcal}
    <div class="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <span class="tabular text-ink-muted font-mono text-[0.625rem]">
        {d.logged ? formatNumber(d.eatenKcal) : '·'}
      </span>
      <div class="border-hairline relative h-20 w-full overflow-hidden rounded border">
        <!-- The allowance line — the height a day was allowed to reach. -->
        <span
          class="bg-ink absolute inset-x-0 h-px opacity-25"
          style="bottom: {linePct}%"
          aria-hidden="true"
        ></span>
        {#if d.logged}
          <span
            class="absolute inset-x-0 bottom-0 {over
              ? 'bg-over'
              : 'bg-good'} transition-[height] duration-500"
            style="height: {fillPct(d)}%"
            aria-hidden="true"
          ></span>
        {/if}
      </div>
      <span
        class="eyebrow {d.date === viewedDate ? 'text-ink font-semibold' : 'text-ink-muted'}"
        title={d.date}
      >
        {weekdayOf(d.date).slice(0, 1)}
      </span>
    </div>
  {/each}
</div>
