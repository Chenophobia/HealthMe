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

<header>
  <p class="eyebrow text-ink-muted">{weekdayOf(data.date)} · {data.date}</p>
  <h1 class="mt-2 text-2xl font-semibold tracking-tight">Workouts</h1>
</header>

{#if data.scheduled === null}
  <p class="text-ink-muted mt-3 text-sm">
    Rest day. Optional 8-minute home core is in the <a href="/plan" class="text-accent font-medium"
      >plan</a
    >.
  </p>
{/if}

<!-- ============================= Session switcher ============================= -->
<nav class="mt-4 flex gap-2" aria-label="Session type">
  {#each SESSION_TYPES as type (type)}
    {@const isActive = data.sessionType === type}
    <a
      href="?session={type}"
      aria-current={isActive ? 'page' : undefined}
      class="flex min-h-11 flex-1 items-center justify-center rounded-xs px-3 text-sm font-medium whitespace-nowrap {isActive
        ? 'bg-accent text-on-accent'
        : 'card text-ink-muted hover:text-ink'}"
    >
      {SESSION_LABELS[type]}{data.scheduled === type ? ' · today' : ''}
    </a>
  {/each}
</nav>

<!-- ============================= Exercises =============================

     Numbered, because a session is run in order — the index is the running
     order, not decoration. -->
<ol class="mt-6 flex flex-col gap-2">
  {#each data.exercises as exercise, i (exercise.id)}
    <li class="card flex items-start gap-4 p-4">
      <span class="eyebrow text-ink-muted mt-1 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 class="font-medium">{exercise.name}</h2>
          <span class="tabular text-ink font-mono text-sm whitespace-nowrap">
            {repsLabel(exercise.sets, exercise.repsMin, exercise.repsMax)}
          </span>
        </div>
        {#if exercise.dumbbellSwap}
          <p class="text-ink-muted mt-1 text-sm">Dumbbell swap: {exercise.dumbbellSwap}</p>
        {/if}
      </div>
    </li>
  {/each}
</ol>
