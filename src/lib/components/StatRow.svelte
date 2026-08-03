<script lang="ts">
  /*
   * The one way this app shows a set of related figures: mono, tabular,
   * hairline-divided, one eyebrow each. Every card that has a values row uses
   * it, so weigh-in, body profile and the energy breakdown read as the same
   * kind of thing rather than three near-misses.
   */
  export type Stat = { label: string; value: string; muted?: boolean };

  let { stats }: { stats: Stat[] } = $props();

  const COLS: Record<number, string> = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' };
</script>

<dl class="grid gap-3 {COLS[stats.length] ?? 'grid-cols-3'}">
  {#each stats as stat, i (stat.label)}
    <div class="flex flex-col gap-1.5 {i > 0 ? 'border-hairline border-l pl-3' : ''}">
      <dt class="eyebrow text-ink-muted">{stat.label}</dt>
      <!-- text-sm, not larger: a date runs to ten characters and a third of a
           375px screen is not wide enough for that at body size. -->
      <dd
        class="tabular font-mono text-sm font-semibold whitespace-nowrap {stat.muted
          ? 'text-ink-muted'
          : ''}"
      >
        {stat.value}
      </dd>
    </div>
  {/each}
</dl>
