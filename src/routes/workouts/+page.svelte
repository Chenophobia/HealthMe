<script lang="ts">
  import { enhance } from '$app/forms';
  import { weekdayOf } from '$lib/dates';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const SESSION_TYPES = ['push', 'pull', 'legs'] as const;
  const SESSION_LABELS: Record<string, string> = { push: 'Push', pull: 'Pull', legs: 'Legs' };

  function repsLabel(sets: number, repsMin: number, repsMax: number) {
    return repsMin === repsMax ? `${sets} × ${repsMin}` : `${sets} × ${repsMin}–${repsMax}`;
  }

  function lastLine(last: NonNullable<PageData['exercises'][number]['last']>, repsMax: number) {
    const parts = last.sets.map((s) => `${s.weightKg} kg × ${s.reps}`).join(', ');
    const addWeight = last.sets.length > 0 && last.sets.every((s) => s.reps >= repsMax);
    return `Last time (${last.date}): ${parts}${addWeight ? ' — add weight!' : ''}`;
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
        ? 'bg-accent text-white'
        : 'bg-surface border-hairline text-ink-muted hover:text-ink border'}"
    >
      {SESSION_LABELS[type]}{data.scheduled === type ? ' (today)' : ''}
    </a>
  {/each}
</nav>

{#if form?.error}
  <p class="text-over mt-4 text-sm">{form.error}</p>
{/if}

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
      {#if exercise.last}
        <p class="text-ink-muted mt-2 text-sm">{lastLine(exercise.last, exercise.repsMax)}</p>
      {/if}

      {#if exercise.todaySets.length > 0}
        <ul class="mt-3 flex flex-wrap gap-2">
          {#each exercise.todaySets as set (set.id)}
            <li
              class="border-hairline bg-paper flex items-center gap-1.5 rounded-full border py-1 pr-1.5 pl-3 text-sm"
            >
              {set.weightKg} kg × {set.reps}
              <form method="POST" action="?/deleteset" use:enhance>
                <input type="hidden" name="id" value={set.id} />
                <button
                  type="submit"
                  aria-label="Delete set"
                  class="text-ink-muted hover:text-over rounded-full px-1.5 leading-none"
                >
                  &times;
                </button>
              </form>
            </li>
          {/each}
        </ul>
      {/if}

      <form method="POST" action="?/logset" use:enhance class="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="exerciseId" value={exercise.id} />
        <input type="hidden" name="sessionType" value={data.sessionType} />
        <label class="flex flex-col gap-1 text-sm">
          Weight (kg)
          <input
            name="weightKg"
            type="number"
            step="0.5"
            min="0"
            required
            class="border-hairline bg-surface w-24 rounded-md border px-3 py-2"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Reps
          <input
            name="reps"
            type="number"
            step="1"
            min="1"
            required
            class="border-hairline bg-surface w-20 rounded-md border px-3 py-2"
          />
        </label>
        <button class="bg-accent rounded-md px-4 py-2 font-semibold whitespace-nowrap text-white">
          Log set
        </button>
      </form>
    </div>
  {/each}
</section>
