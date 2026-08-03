<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { rollingAverage } from '$lib/rolling';
  import { weekdayOf } from '$lib/dates';
  import { KCAL_TARGET, KCAL_FLOOR, PROTEIN_TARGET_G, PROTEIN_AIM_G } from '$lib/targets';
  import { energyBalance } from '$lib/energy';
  import { formatNumber } from '$lib/readout';
  import DateNav from '$lib/components/DateNav.svelte';
  import Meter from '$lib/components/Meter.svelte';
  import StatRow from '$lib/components/StatRow.svelte';
  import TrendChart from '$lib/components/TrendChart.svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const SESSION_LABELS: Record<string, string> = { push: 'Push', pull: 'Pull', legs: 'Legs' };
  const SEX_LABELS: Record<string, string> = { male: 'Male', female: 'Female' };

  /* Everything that takes input stays shut until asked for. On a phone this
     page is read far more often than it's written to. */
  let showActivity = $state(false);
  let showWeighIn = $state(false);
  let editProfile = $state(false);
  let editGoal = $state(false);

  /* Collapse on success. The panel's own numbers updating is the confirmation,
     so nothing has to say "saved". */
  function closeOnSuccess(close: () => void): SubmitFunction {
    return () =>
      async ({ result, update }) => {
        await update();
        if (result.type === 'success') close();
      };
  }

  const balance = $derived(
    energyBalance({
      bmrKcal: data.bmrKcal,
      activeKcal: data.activeKcal,
      eatenKcal: data.totals.kcal
    })
  );

  const weightSeries = $derived(data.recent.map((m) => ({ date: m.date, value: m.weightKg })));
  const weightAverage = $derived(rollingAverage(weightSeries, 7));

  const profileSet = $derived(
    data.profile.heightCm !== null && data.profile.birthDate !== null && data.profile.sex !== null
  );

  const shortfall = $derived(
    data.pace && data.intake ? Math.round(data.pace.perDayKcal - data.intake.deficitAtIntake) : 0
  );

  const isToday = $derived(data.date === data.today);
</script>

<svelte:head><title>Today — health-me</title></svelte:head>

<header>
  <p class="eyebrow text-ink-muted">{weekdayOf(data.date)} · {data.date}</p>
  <h1 class="mt-2 text-2xl font-semibold tracking-tight">
    {isToday ? 'Today' : weekdayOf(data.date)}
  </h1>
</header>

<DateNav
  date={data.date}
  prevDate={data.prevDate}
  nextDate={data.nextDate}
  today={data.today}
  basePath="/"
/>

<!-- ============================= The readout ============================= -->
<section class="card mt-4 p-4 sm:p-5" aria-label="Today's budget">
  <div class="grid gap-6 sm:grid-cols-2 sm:gap-8">
    <Meter label="Calories" value={data.totals.kcal} target={data.kcalTarget} unit="kcal" />
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
  <a href="/meals" class="text-accent mt-4 inline-flex min-h-11 items-center text-sm font-semibold">
    Log a meal →
  </a>
</section>

<!-- ============================= Goal =============================

     The intake target above is worked back from this. Where the pace demands
     less food than the program's floor allows, the floor holds and the card
     says how far short that leaves you — it never quietly hands back a number
     under the floor. -->
<section class="card mt-4 overflow-hidden">
  <div class="flex items-center justify-between gap-3 p-4 sm:p-5">
    <span class="eyebrow text-ink-muted">Goal</span>
    {#if !editGoal}
      <button type="button" class="btn-quiet" onclick={() => (editGoal = true)}>
        {data.pace ? 'Edit' : 'Set'}
      </button>
    {/if}
  </div>

  {#if editGoal}
    <form
      method="POST"
      action="?/goal"
      use:enhance={closeOnSuccess(() => (editGoal = false))}
      class="border-hairline grid grid-cols-2 gap-3 border-t p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-5"
    >
      <label class="flex flex-col gap-1.5">
        <span class="eyebrow text-ink-muted">Target kg</span>
        <!-- svelte-ignore a11y_autofocus -->
        <input
          name="goalWeightKg"
          type="number"
          step="0.1"
          autofocus
          value={data.profile.goalWeightKg ?? ''}
          class="field"
        />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="eyebrow text-ink-muted">By</span>
        <input name="goalDate" type="date" value={data.profile.goalDate ?? ''} class="field" />
      </label>
      <div class="col-span-2 flex gap-3 sm:col-span-1">
        <button class="btn-primary flex-1">Save</button>
        <button type="button" class="btn-quiet" onclick={() => (editGoal = false)}>Cancel</button>
      </div>
      {#if form?.goalError}
        <p class="text-over col-span-2 text-sm sm:col-span-3">{form.goalError}</p>
      {/if}
      <p class="text-ink-muted col-span-2 text-xs sm:col-span-3">
        Clear both fields to drop the goal and go back to the {formatNumber(KCAL_TARGET)} kcal anchor.
      </p>
    </form>
  {:else if data.pace}
    <div class="border-hairline border-t p-4 sm:p-5">
      {#if data.pace.reached}
        <p class="text-good font-semibold">{data.profile.goalWeightKg} kg reached.</p>
      {:else if data.pace.expired}
        <p class="text-ink-muted text-sm">
          {data.profile.goalDate} has passed — {data.pace.kgToGo.toFixed(1)} kg still to go. Set a new
          date.
        </p>
      {:else}
        <p class="eyebrow text-ink-muted">Deficit needed</p>
        <p class="mt-2.5 flex items-baseline gap-2">
          <span
            class="tabular font-mono text-4xl leading-none font-semibold tracking-tight sm:text-5xl"
          >
            {formatNumber(data.pace.perDayKcal)}
          </span>
          <span class="text-ink-muted font-mono text-sm">kcal a day</span>
        </p>
        <p class="text-ink-muted mt-2.5 text-sm">
          To reach {data.profile.goalWeightKg} kg by {data.profile.goalDate} — {data.pace.days}
          {data.pace.days === 1 ? 'day' : 'days'} away.
        </p>

        {#if data.intake}
          <div class="border-hairline mt-4 border-t pt-4">
            <p class="text-sm">
              Eat <span class="font-semibold">{formatNumber(data.intake.intakeKcal)} kcal</span> a
              day. That gives you about
              <span class="font-semibold">{formatNumber(data.intake.deficitAtIntake)}</span>.
            </p>
            {#if data.intake.floored}
              <p class="text-warn mt-2 text-sm">
                {formatNumber(shortfall)} kcal/day short of what the goal needs. Eating less isn't the
                answer — {formatNumber(KCAL_FLOOR)} is the floor — so the gap has to come from moving
                more, or from a later date.
              </p>
            {/if}

            <!-- The running balance since the last weigh-in. Deliberately not
                 folded into the daily number: the pace already re-derives
                 itself from measured weight, and adding an estimate on top
                 would count the same shortfall twice. -->
            {#if data.carry}
              <p class="text-ink-muted mt-3 text-sm">
                {#if data.carry.kcal > 0}
                  Since your last weigh-in you're
                  <span class="text-warn font-semibold"
                    >{formatNumber(data.carry.kcal)} kcal behind</span
                  >
                  the pace, over {data.carry.days}
                  {data.carry.days === 1 ? 'day' : 'days'}. Your next weigh-in folds that in.
                {:else}
                  Since your last weigh-in you're
                  <span class="text-good font-semibold"
                    >{formatNumber(-data.carry.kcal)} kcal ahead</span
                  >
                  of the pace, over {data.carry.days}
                  {data.carry.days === 1 ? 'day' : 'days'}.
                {/if}
              </p>
            {/if}
          </div>
        {:else}
          <p class="text-ink-muted mt-4 text-sm">
            Needs a weigh-in and body profile before it can set a target.
          </p>
        {/if}
      {/if}
    </div>
  {:else}
    <p class="border-hairline text-ink-muted border-t p-4 text-sm sm:p-5">
      None set — calories follow the program's {formatNumber(KCAL_TARGET)} kcal anchor.
    </p>
  {/if}
</section>

<!-- ============================= Energy balance ============================= -->
<section class="card mt-4 overflow-hidden">
  <div class="p-4 sm:p-5">
    <p class="eyebrow text-ink-muted">Energy balance</p>

    {#if balance.status === 'unknown'}
      <p class="text-ink-muted mt-2.5 text-sm">Set your body profile below to see the deficit.</p>
    {:else if balance.status === 'pending'}
      <p class="text-ink-muted mt-2.5 text-sm">
        Burning {formatNumber(balance.burnedKcal ?? 0)} kcal. Log a meal for the deficit.
      </p>
    {:else}
      <p class="mt-2.5 flex items-baseline gap-2">
        <span
          class="tabular font-mono text-4xl leading-none font-semibold tracking-tight sm:text-5xl {balance.status ===
          'surplus'
            ? 'text-over'
            : 'text-good'}">{formatNumber(Math.abs(balance.deficitKcal ?? 0))}</span
        >
        <span class="text-ink-muted font-mono text-sm">
          kcal {balance.status === 'surplus' ? 'surplus' : 'deficit'}
        </span>
      </p>

      <div class="border-hairline mt-4 border-t pt-4">
        <StatRow
          stats={[
            {
              label: data.bmrSource === 'computed' ? 'BMR · est' : 'BMR',
              value: formatNumber(balance.bmrKcal ?? 0)
            },
            {
              label: 'Active',
              value: balance.hasActive ? formatNumber(balance.activeKcal) : '—',
              muted: !balance.hasActive
            },
            { label: 'Eaten', value: formatNumber(balance.eatenKcal) }
          ]}
        />
      </div>
    {/if}
  </div>

  <div class="border-hairline border-t">
    {#if showActivity}
      <form
        method="POST"
        action="?/activity"
        use:enhance={closeOnSuccess(() => (showActivity = false))}
        class="flex items-end gap-3 p-4"
      >
        <input type="hidden" name="date" value={data.date} />
        <label class="flex flex-1 flex-col gap-1.5">
          <span class="eyebrow text-ink-muted">Active energy · kcal</span>
          <!-- svelte-ignore a11y_autofocus -->
          <input
            name="activeKcal"
            type="number"
            min="0"
            step="1"
            required
            autofocus
            value={data.activeKcal ?? ''}
            class="field"
          />
        </label>
        <button class="btn-primary">Save</button>
        <button type="button" class="btn-quiet" onclick={() => (showActivity = false)}>
          Cancel
        </button>
      </form>
      {#if form?.activityError}
        <p class="text-over px-4 pb-4 text-sm">{form.activityError}</p>
      {/if}
    {:else}
      <button
        type="button"
        class="text-ink-muted hover:text-ink flex min-h-12 w-full items-center justify-between px-4 text-sm"
        onclick={() => (showActivity = true)}
      >
        Enter active energy manually
        <span aria-hidden="true">+</span>
      </button>
    {/if}
  </div>
</section>

<!-- ============================= Scheduled session ============================= -->
{#if data.scheduled}
  <a href="/workouts" class="card mt-4 flex items-center justify-between gap-3 p-4 sm:p-5">
    <span class="flex flex-col gap-1.5">
      <span class="eyebrow text-ink-muted">Session</span>
      <span class="text-lg font-semibold">{SESSION_LABELS[data.scheduled]} day</span>
    </span>
    <span class="text-accent text-sm font-semibold whitespace-nowrap">See exercises →</span>
  </a>
{:else}
  <div class="card mt-4 flex flex-col gap-1.5 p-4 sm:p-5">
    <span class="eyebrow text-ink-muted">Session</span>
    <span class="text-ink-muted">Rest day</span>
  </div>
{/if}

<!-- ============================= Weigh-in ============================= -->
<section class="card mt-4 overflow-hidden">
  <div class="flex items-center justify-between gap-3 p-4 sm:p-5">
    <span class="eyebrow text-ink-muted">Weigh-in</span>
    {#if !showWeighIn}
      <button type="button" class="btn-quiet" onclick={() => (showWeighIn = true)}>Log</button>
    {/if}
  </div>

  {#if showWeighIn}
    <form
      method="POST"
      action="?/weighin"
      use:enhance={closeOnSuccess(() => (showWeighIn = false))}
      class="border-hairline grid grid-cols-2 gap-3 border-t p-4 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end sm:p-5"
    >
      <label class="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
        <span class="eyebrow text-ink-muted">Date</span>
        <input name="date" type="date" value={data.date} max={data.today} required class="field" />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="eyebrow text-ink-muted">Weight kg</span>
        <!-- svelte-ignore a11y_autofocus -->
        <input name="weightKg" type="number" step="0.1" min="1" required autofocus class="field" />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="eyebrow text-ink-muted">Body fat %</span>
        <input name="bodyFatPct" type="number" step="0.1" class="field" />
      </label>
      <label class="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
        <span class="eyebrow text-ink-muted">BMR kcal</span>
        <input
          name="bmrKcal"
          type="number"
          step="1"
          placeholder={data.bmrKcal ? String(data.bmrKcal) : ''}
          class="field"
        />
      </label>
      <div class="col-span-2 flex gap-3 sm:col-span-1">
        <button class="btn-primary flex-1">Save</button>
        <button type="button" class="btn-quiet" onclick={() => (showWeighIn = false)}>Cancel</button
        >
      </div>
      {#if form?.error}
        <p class="text-over col-span-2 text-sm sm:col-span-5">{form.error}</p>
      {/if}
    </form>
  {:else if data.latest}
    <div class="border-hairline border-t p-4 sm:p-5">
      <StatRow
        stats={[
          { label: 'Weight', value: `${data.latest.weightKg} kg` },
          {
            label: 'Body fat',
            value: data.latest.bodyFatPct !== null ? `${data.latest.bodyFatPct}%` : '—',
            muted: data.latest.bodyFatPct === null
          },
          { label: 'On', value: data.latest.date }
        ]}
      />
    </div>
  {:else}
    <p class="border-hairline text-ink-muted border-t p-4 text-sm sm:p-5">None yet</p>
  {/if}
</section>

<!-- ============================= Body profile ============================= -->
<section class="card mt-4 overflow-hidden">
  <div class="flex items-center justify-between gap-3 p-4 sm:p-5">
    <span class="eyebrow text-ink-muted">Body profile</span>
    {#if !editProfile}
      <button type="button" class="btn-quiet" onclick={() => (editProfile = true)}>Edit</button>
    {/if}
  </div>

  {#if editProfile}
    <form
      method="POST"
      action="?/profile"
      use:enhance={closeOnSuccess(() => (editProfile = false))}
      class="border-hairline grid grid-cols-2 gap-3 border-t p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end sm:p-5"
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
      <div class="col-span-2 flex gap-3 sm:col-span-1">
        <button class="btn-primary flex-1">Save</button>
        <button type="button" class="btn-quiet" onclick={() => (editProfile = false)}>Cancel</button
        >
      </div>
      {#if form?.profileError}
        <p class="text-over col-span-2 text-sm sm:col-span-4">{form.profileError}</p>
      {/if}
    </form>
  {:else if profileSet}
    <div class="border-hairline border-t p-4 sm:p-5">
      <StatRow
        stats={[
          { label: 'Height', value: `${data.profile.heightCm} cm` },
          { label: 'Born', value: data.profile.birthDate ?? '—' },
          { label: 'Sex', value: SEX_LABELS[data.profile.sex ?? ''] ?? '—' }
        ]}
      />
    </div>
  {:else}
    <p class="border-hairline text-ink-muted border-t p-4 text-sm sm:p-5">
      Not set — the deficit needs it.
    </p>
  {/if}
</section>

<!-- ============================= Weight trend ============================= -->
<section class="card mt-4 p-4 sm:p-5">
  <div class="flex items-baseline justify-between gap-3">
    <h2 class="eyebrow text-ink-muted">Weight · last 30</h2>
    <a href="/progress" class="text-accent text-sm font-semibold whitespace-nowrap">Progress →</a>
  </div>
  <div class="mt-3">
    <TrendChart series={weightSeries} average={weightAverage} unit="kg" />
  </div>
  <p class="text-ink-muted mt-3 text-sm">{data.streak}-day logging streak</p>
</section>
