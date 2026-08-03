<script lang="ts">
  import { goto } from '$app/navigation';

  /* Shared by Today and Meals so the two pages don't drift apart on something
     you use every time you look back at a day. */
  let {
    date,
    prevDate,
    nextDate,
    today,
    basePath
  }: {
    date: string;
    prevDate: string;
    nextDate: string;
    today: string;
    basePath: string;
  } = $props();

  const isToday = $derived(date === today);
</script>

<nav class="mt-4 flex items-center gap-2" aria-label="Choose a day">
  <a href="?date={prevDate}" aria-label="Previous day" class="btn-quiet">←</a>
  <input
    type="date"
    value={date}
    max={today}
    aria-label="Go to date"
    onchange={(e) => {
      const v = e.currentTarget.value;
      if (v) goto(`${basePath}?date=${v}`);
    }}
    class="field flex-1"
  />
  <!-- Forward is dead on the latest day rather than hidden, so the control
       doesn't move under your thumb as you step through days. -->
  {#if isToday}
    <span class="btn-quiet opacity-40" aria-hidden="true">→</span>
  {:else}
    <a href="?date={nextDate}" aria-label="Next day" class="btn-quiet">→</a>
    <a href={basePath} class="btn-quiet text-accent">Today</a>
  {/if}
</nav>
