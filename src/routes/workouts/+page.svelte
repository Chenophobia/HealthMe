<script lang="ts">
  import { weekdayOf } from '$lib/dates';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const SESSION_TYPES = ['push', 'pull', 'legs'] as const;
  const SESSION_LABELS: Record<string, string> = { push: 'Push', pull: 'Pull', legs: 'Legs' };

  function repsLabel(sets: number, repsMin: number, repsMax: number) {
    return repsMin === repsMax ? `${sets} × ${repsMin}` : `${sets} × ${repsMin}–${repsMax}`;
  }
</script>

<svelte:head><title>Workouts — health-me</title></svelte:head>

<h1 class="text-2xl font-bold">Workouts</h1>
<p class="text-ink-muted mt-1 text-sm">{data.date} · {weekdayOf(data.date)}</p>

{#if data.scheduled === null}
  <div class="bg-surface border-hairline mt-4 rounded-lg border p-4 text-sm">
    Rest day — optional 8-min home core (see <a href="/plan" class="text-accent font-medium">Plan</a
    >).
  </div>
{/if}

<!-- ============================= Session switcher ============================= -->
<nav class="mt-4 flex gap-2" aria-label="Session type">
  {#each SESSION_TYPES as type (type)}
    {@const isActive = data.sessionType === type}
    <a
      href="?session={type}"
      aria-current={isActive ? 'page' : undefined}
      class="rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap {isActive
        ? 'bg-accent text-on-accent'
        : 'bg-surface border-hairline text-ink-muted hover:text-ink border'}"
    >
      {SESSION_LABELS[type]}{data.scheduled === type ? ' (today)' : ''}
    </a>
  {/each}
</nav>

<!-- ============================= Exercises ============================= -->
<section class="mt-6 flex flex-col gap-4">
  {#each data.exercises as exercise (exercise.id)}
    <div class="bg-surface border-hairline rounded-lg border p-4">
      <div class="flex items-baseline justify-between gap-2">
        <h2 class="font-semibold">{exercise.name}</h2>
        <span class="text-ink-muted text-sm whitespace-nowrap">
          {repsLabel(exercise.sets, exercise.repsMin, exercise.repsMax)}
        </span>
      </div>
      {#if exercise.dumbbellSwap}
        <p class="text-ink-muted text-sm">DB: {exercise.dumbbellSwap}</p>
      {/if}
    </div>
  {/each}
</section>
