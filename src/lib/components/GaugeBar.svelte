<script lang="ts">
  import { toneFor, type Gauge } from '$lib/readout';

  let { gauge, label }: { gauge: Gauge; label: string } = $props();

  /* Written out rather than built from a template string: Tailwind only ships
     class names it can see in the source. */
  const FILL: Record<string, string> = {
    muted: 'bg-ink-muted',
    accent: 'bg-accent',
    warn: 'bg-warn',
    good: 'bg-good',
    over: 'bg-over'
  };

  const tone = $derived(toneFor(gauge.status));

  /* On a floor gauge the bar runs to the aim, so the target itself becomes a
     notch part-way along — the line you have to clear, not the end of the bar. */
  const notchPct = $derived(gauge.scale > gauge.target ? (gauge.target / gauge.scale) * 100 : null);
</script>

<div
  class="bg-hairline relative h-3 w-full overflow-hidden rounded-full"
  role="meter"
  aria-label={label}
  aria-valuenow={Math.round(gauge.logged)}
  aria-valuemin="0"
  aria-valuemax={Math.round(gauge.scale)}
>
  <div
    class="absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-500 {FILL[
      tone
    ]}"
    style="width: {gauge.fraction * 100}%"
  ></div>

  <!-- The bar is a measure, so it carries measure marks: quarters, and the
       floor's notch where one applies. -->
  <div class="pointer-events-none absolute inset-0" aria-hidden="true">
    {#each [25, 50, 75] as at (at)}
      <span class="bg-surface absolute inset-y-0 w-px opacity-60" style="left: {at}%"></span>
    {/each}
    {#if notchPct !== null}
      <span class="bg-ink absolute inset-y-0 w-0.5" style="left: {notchPct}%"></span>
    {/if}
  </div>
</div>
