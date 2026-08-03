<script lang="ts">
  import { enhance } from '$app/forms';
  import { rollingAverage } from '$lib/rolling';
  import { weekdayOf } from '$lib/dates';
  import { KCAL_TARGET, PROTEIN_TARGET_G, PROTEIN_AIM_G } from '$lib/targets';
  import { energyBalance } from '$lib/energy';
  import { formatNumber } from '$lib/readout';
  import Meter from '$lib/components/Meter.svelte';
  import TrendChart from '$lib/components/TrendChart.svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const SESSION_LABELS: Record<string, string> = { push: 'Push', pull: 'Pull', legs: 'Legs' };

  const balance = $derived(
    energyBalance({
      bmrKcal: data.bmrKcal,
      activeKcal: data.activeKcal,
      eatenKcal: data.totals.kcal
    })
  );

  const weightSeries = $derived(data.recent.map((m) => ({ date: m.date, value: m.weightKg })));
  const weightAverage = $derived(rollingAverage(weightSeries, 7));
</script>

<svelte:head><title>Today — health-me</title></svelte:head>

<header>
  <p class="eyebrow text-ink-muted">{weekdayOf(data.date)} · {data.date}</p>
  <h1 class="mt-2 text-2xl font-semibold tracking-tight">Today</h1>
</header>

<!-- ============================= The readout ============================= -->
<section class="card mt-4 p-5 sm:p-6" aria-label="Today's budget">
  <div class="grid gap-6 sm:grid-cols-2 sm:gap-8">
    <Meter label="Calories" value={data.totals.kcal} target={KCAL_TARGET} unit="kcal" />
    <div class="border-hairline border-t pt-6 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8">
      <Meter
        label="Protein"
        value={data.totals.proteinG}
        target={PROTEIN_TARGET_G}
        aim={PROTEIN_AIM_G}
        unit="g"
        kind="floor"
      />
    </div>
  </div>
  <a
    href="/meals"
    class="text-accent mt-5 inline-flex min-h-11 items-center text-sm font-medium sm:mt-6"
  >
    Log a meal →
  </a>
</section>

<!-- ============================= Energy balance =============================

     A readout, not a target. Both inputs are estimates that err high — Apple's
     active energy especially — so intake stays anchored to the fixed figure
     above rather than floating with them. -->
<section class="card mt-4 p-5 sm:p-6">
  <p class="eyebrow text-ink-muted">Energy balance</p>

  {#if balance.status === 'unknown'}
    <p class="text-ink-muted mt-2.5 text-sm">
      Fill in the body profile below and the deficit appears here — resting burn is estimated from
      each weigh-in. Logging a BMR with a weigh-in works too.
    </p>
  {:else if balance.status === 'pending'}
    <p class="text-ink-muted mt-2.5 text-sm">
      Nothing eaten yet. Burning {formatNumber(balance.burnedKcal ?? 0)} kcal today — the deficit shows
      once there's food against it.
    </p>
  {:else}
    <p class="mt-2.5 flex items-baseline gap-2">
      <span
        class="tabular font-mono text-4xl leading-none font-semibold tracking-tight sm:text-5xl {balance.status ===
        'surplus'
          ? 'text-over'
          : 'text-ink'}">{formatNumber(Math.abs(balance.deficitKcal ?? 0))}</span
      >
      <span class="text-ink-muted font-mono text-sm">
        kcal {balance.status === 'surplus' ? 'surplus' : 'deficit'}
      </span>
    </p>
    <p class="text-ink-muted tabular mt-2.5 font-mono text-xs">
      {formatNumber(balance.bmrKcal ?? 0)} BMR + {formatNumber(balance.activeKcal)} active =
      {formatNumber(balance.burnedKcal ?? 0)} burned · {formatNumber(balance.eatenKcal)} eaten
    </p>
    <p class="text-ink-muted mt-1.5 text-xs">
      {data.bmrSource === 'computed'
        ? 'BMR estimated from your weight, height and age.'
        : 'BMR from the weigh-in you logged.'}
    </p>
    {#if !balance.hasActive}
      <p class="text-ink-muted mt-2 text-sm">
        No active energy yet today — this is resting burn only, so the real figure is higher.
      </p>
    {/if}
  {/if}

  <form
    method="POST"
    action="?/activity"
    use:enhance
    class="border-hairline mt-5 flex items-end gap-3 border-t pt-4"
  >
    <input type="hidden" name="date" value={data.date} />
    <label class="flex flex-1 flex-col gap-1.5">
      <span class="eyebrow text-ink-muted">Active energy · kcal</span>
      <input
        name="activeKcal"
        type="number"
        min="0"
        step="1"
        required
        value={data.activeKcal ?? ''}
        class="field"
      />
    </label>
    <button class="btn-primary">Save</button>
  </form>
  {#if form?.activityError}
    <p class="text-over mt-3 text-sm">{form.activityError}</p>
  {:else if form?.activityOk}
    <p class="text-accent mt-3 text-sm">Active energy saved.</p>
  {/if}
  <p class="text-ink-muted mt-3 text-xs">
    Apple Health → Activity → Active Energy. {data.activitySource === 'shortcut'
      ? 'Last written by the Shortcut.'
      : 'The Shortcut overwrites this when it next runs.'}
  </p>
</section>

<!-- ============================= Scheduled session ============================= -->
{#if data.scheduled}
  <a href="/workouts" class="card mt-4 flex items-center justify-between gap-3 p-4">
    <span class="flex flex-col gap-1">
      <span class="eyebrow text-ink-muted">Session</span>
      <span class="font-medium">{SESSION_LABELS[data.scheduled]} day</span>
    </span>
    <span class="text-accent text-sm font-medium whitespace-nowrap">See exercises →</span>
  </a>
{:else}
  <div class="card mt-4 flex flex-col gap-1 p-4">
    <span class="eyebrow text-ink-muted">Session</span>
    <span class="text-ink-muted text-sm">Rest day — nothing scheduled.</span>
  </div>
{/if}

<!-- ============================= Weigh-in ============================= -->
<section class="card mt-4 p-4 sm:p-5">
  <div class="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
    <h2 class="eyebrow text-ink-muted">Weigh-in</h2>
    {#if data.latest}
      <p class="tabular font-mono text-sm">
        <span class="font-semibold">{data.latest.weightKg} kg</span>
        {#if data.latest.bodyFatPct !== null}<span class="text-ink-muted"
            >· {data.latest.bodyFatPct}%</span
          >{/if}
        {#if data.latest.bmrKcal !== null}<span class="text-ink-muted"
            >· {formatNumber(data.latest.bmrKcal)} BMR</span
          >{/if}
        <span class="text-ink-muted">· {data.latest.date}</span>
      </p>
    {:else}
      <p class="text-ink-muted text-sm">None logged yet</p>
    {/if}
  </div>

  <form
    method="POST"
    action="?/weighin"
    use:enhance
    class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end"
  >
    <label class="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
      <span class="eyebrow text-ink-muted">Date</span>
      <input name="date" type="date" value={data.date} max={data.date} required class="field" />
    </label>
    <label class="flex flex-col gap-1.5">
      <span class="eyebrow text-ink-muted">Weight kg</span>
      <input name="weightKg" type="number" step="0.1" min="1" required class="field" />
    </label>
    <label class="flex flex-col gap-1.5">
      <span class="eyebrow text-ink-muted">Body fat %</span>
      <input name="bodyFatPct" type="number" step="0.1" placeholder="optional" class="field" />
    </label>
    <label class="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
      <span class="eyebrow text-ink-muted">BMR kcal</span>
      <input
        name="bmrKcal"
        type="number"
        step="1"
        placeholder={data.bmrKcal ? String(data.bmrKcal) : 'optional'}
        class="field"
      />
    </label>
    <button class="btn-primary col-span-2 sm:col-span-1">Log weigh-in</button>
  </form>

  {#if form?.error}
    <p class="text-over mt-3 text-sm">{form.error}</p>
  {:else if form?.ok}
    <p class="text-accent mt-3 text-sm">Saved for {form.date}.</p>
  {/if}
  <p class="text-ink-muted mt-3 text-xs">
    Logging a day again replaces that day's entry. A blank BMR keeps carrying the last one you
    logged.
  </p>
</section>

<!-- ============================= Body profile =============================

     Set once. Turns each weigh-in into a resting-burn estimate, so BMR tracks
     weight instead of waiting on the scale to report one. -->
<section class="mt-4">
  <details class="card p-4">
    <summary class="eyebrow text-ink-muted flex min-h-11 cursor-pointer items-center">
      Body profile
    </summary>
    <p class="text-ink-muted mt-1 text-sm">
      Used to estimate resting burn from your weight (Mifflin–St Jeor). Set it once — it keeps up on
      its own as your weight changes.
    </p>
    <form
      method="POST"
      action="?/profile"
      use:enhance
      class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
    >
      <label class="flex flex-col gap-1.5">
        <span class="eyebrow text-ink-muted">Height cm</span>
        <input
          name="heightCm"
          type="number"
          step="0.1"
          value={data.profile.heightCm ?? ''}
          class="field"
        />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="eyebrow text-ink-muted">Born</span>
        <input name="birthDate" type="date" value={data.profile.birthDate ?? ''} class="field" />
      </label>
      <label class="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
        <span class="eyebrow text-ink-muted">Sex</span>
        <select name="sex" value={data.profile.sex ?? ''} class="field">
          <option value="">Not set</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </label>
      <button class="btn-primary col-span-2 sm:col-span-1">Save profile</button>
    </form>
    {#if form?.profileError}
      <p class="text-over mt-3 text-sm">{form.profileError}</p>
    {:else if form?.profileOk}
      <p class="text-accent mt-3 text-sm">Profile saved.</p>
    {/if}
    <p class="text-ink-muted mt-3 text-xs">
      The formula only defines coefficients for two sexes. A BMR typed into a weigh-in overrides the
      estimate for that day.
    </p>
  </details>
</section>

<!-- ============================= Weight trend ============================= -->
<section class="card mt-4 p-4 sm:p-5">
  <div class="flex items-baseline justify-between gap-3">
    <h2 class="eyebrow text-ink-muted">Weight · last 30</h2>
    <a href="/progress" class="text-accent text-sm font-medium whitespace-nowrap">Progress →</a>
  </div>
  <div class="mt-3">
    <TrendChart series={weightSeries} average={weightAverage} unit="kg" />
  </div>
  <p class="text-ink-muted mt-3 text-sm">
    Ticks under the chart mark the days you logged — {data.streak}-day streak.
  </p>
</section>
