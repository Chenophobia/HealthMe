<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { rollingAverage } from '$lib/rolling';
  import { weekdayOf } from '$lib/dates';
  import { KCAL_TARGET, KCAL_FLOOR, PROTEIN_TARGET_G, PROTEIN_AIM_G } from '$lib/targets';
  import { energyBalance } from '$lib/energy';
  import { formatNumber, gauge, gaugeHeadline, toneFor } from '$lib/readout';
  import { CARD_LABELS, type TodayCard } from '$lib/today-cards';
  import DateNav from '$lib/components/DateNav.svelte';
  import TrendChart from '$lib/components/TrendChart.svelte';
  import BudgetRing from '$lib/components/BudgetRing.svelte';
  import InfoTip from '$lib/components/InfoTip.svelte';
  import WeekBars from '$lib/components/WeekBars.svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const SESSION_LABELS: Record<string, string> = { push: 'Push', pull: 'Pull', legs: 'Legs' };
  const SEX_LABELS: Record<string, string> = { male: 'Male', female: 'Female' };

  /* Everything that takes input stays shut until asked for. On a phone this
     page is read far more often than it's written to. */
  let showDetail = $state(false);
  let showActivity = $state(false);
  let showWeighIn = $state(false);
  let editProfile = $state(false);
  let editGoal = $state(false);

  /* Customize mode: the arrows reorder a local copy, Done persists it. */
  let customizing = $state(false);
  let draftOrder = $state<TodayCard[]>([]);
  const cardOrder = $derived(customizing ? draftOrder : data.cardOrder);

  function startCustomize() {
    draftOrder = [...data.cardOrder];
    customizing = true;
  }
  function move(key: TodayCard, dir: -1 | 1) {
    const at = draftOrder.indexOf(key);
    const to = at + dir;
    if (at === -1 || to < 0 || to >= draftOrder.length) return;
    [draftOrder[at], draftOrder[to]] = [draftOrder[to], draftOrder[at]];
  }

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

  const isToday = $derived(data.date === data.today);
  const hasGoal = $derived(data.profile.goalWeightKg !== null && data.profile.goalDate !== null);

  /* Lose It!'s Net: food minus exercise credit. Remaining = Budget − Net. */
  const netKcal = $derived(data.totals.kcal - data.budget.earnedKcal);

  /* The inner ring's readout line. */
  const proteinGauge = $derived(
    gauge(data.totals.proteinG, PROTEIN_TARGET_G, 'floor', PROTEIN_AIM_G)
  );
  const proteinHeadline = $derived(gaugeHeadline(proteinGauge, 'g', 'floor'));
  const PROTEIN_TEXT: Record<string, string> = {
    muted: 'text-ink-muted',
    accent: 'text-accent',
    warn: 'text-warn',
    good: 'text-good',
    over: 'text-over'
  };

  const TIP = $derived({
    budget: data.pace
      ? `The calories to eat today, worked back from your goal pace and typical activity — never below the ${formatNumber(KCAL_FLOOR)} kcal floor.`
      : `The program's ${formatNumber(KCAL_TARGET)} kcal anchor. Set a goal and the budget is worked back from its pace instead.`,
    food: 'Everything logged as eaten today, from the Meals page.',
    earned:
      'Burn above your baseline. Move more than a typical day and the extra calories are added to today’s budget — a quiet day just earns zero, it never shrinks the budget.',
    protein: `The inner ring. A floor, not a ceiling: climb past ${PROTEIN_TARGET_G} g (the notch), aiming for ${PROTEIN_AIM_G} g.`,
    baseline:
      'What the budget already assumed you’d burn: resting energy plus your typical activity (recent average). Only burn beyond this earns extra calories.',
    resting:
      'Calories burned just existing. Uses your Watch’s Resting Energy when the day has one, otherwise estimated from your latest weigh-in (Mifflin-St Jeor).',
    active: 'Calories burned moving — Apple Health’s Active Energy, sent by the Shortcut.',
    net: 'Food minus earned exercise calories. Keep Net level with the budget and the day lands on plan.'
  });
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

<!-- ============================= The ring ============================= -->
<section class="card mt-4 p-4 sm:p-5" aria-label="Today's budget">
  <div class="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10">
    <BudgetRing
      budget={data.budget}
      protein={{ value: data.totals.proteinG, target: PROTEIN_TARGET_G, aim: PROTEIN_AIM_G }}
      bind:expanded={showDetail}
      detailId="day-detail"
    />

    <div class="flex flex-col gap-5">
      <!-- The whole sum, Lose It!-style: Budget − Food + Earned = the ring. -->
      <div class="flex items-center justify-center gap-2 sm:justify-start">
        {#snippet term(value: string, label: string, tip: string, tone = '')}
          <span class="flex flex-col items-center gap-0.5">
            <span class="tabular font-mono text-lg font-semibold {tone}">{value}</span>
            <span class="eyebrow text-ink-muted flex items-center">
              {label}<InfoTip term={label} text={tip} />
            </span>
          </span>
        {/snippet}
        {@render term(formatNumber(data.budget.budgetKcal), 'Budget', TIP.budget)}
        <span class="text-ink-muted pb-4 font-mono" aria-hidden="true">−</span>
        {@render term(formatNumber(data.budget.eatenKcal), 'Food', TIP.food)}
        <span class="text-ink-muted pb-4 font-mono" aria-hidden="true">+</span>
        {@render term(
          formatNumber(data.budget.earnedKcal),
          'Earned',
          TIP.earned,
          data.budget.earnedKcal > 0 ? 'text-good' : ''
        )}
      </div>

      <!-- The inner ring, spelled out. -->
      <div
        class="border-hairline flex items-center justify-center gap-2 border-t pt-4 text-sm sm:justify-start"
      >
        <span class="eyebrow text-ink-muted flex items-center">
          Protein<InfoTip term="Protein" text={TIP.protein} />
        </span>
        <span class="tabular font-mono {PROTEIN_TEXT[toneFor(proteinGauge.status)]}">
          {proteinHeadline.value}
          <span class="text-ink-muted">{proteinHeadline.suffix}</span>
        </span>
        <span class="tabular text-ink-muted font-mono text-xs">
          · {formatNumber(data.totals.proteinG)} / {formatNumber(PROTEIN_AIM_G)}
        </span>
      </div>
    </div>
  </div>

  <!-- ======================= Day breakdown (ring tap) ======================= -->
  {#if showDetail}
    <div id="day-detail" class="border-hairline mt-5 border-t pt-4">
      <p class="eyebrow text-ink-muted">Day breakdown</p>

      <dl class="mt-3 flex flex-col gap-2.5 text-sm">
        <div class="flex items-center justify-between gap-3">
          <dt class="text-ink-muted flex items-center">
            Resting · {data.earned.restingSource === 'watch' ? 'watch' : 'est'}
            <InfoTip term="Resting energy" text={TIP.resting} />
          </dt>
          <dd class="tabular font-mono">
            {data.earned.restingKcal === null ? '—' : formatNumber(data.earned.restingKcal)}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-3">
          <dt class="text-ink-muted flex items-center">
            Active<InfoTip term="Active energy" text={TIP.active} />
          </dt>
          <dd class="tabular font-mono">
            {data.earned.hasActive ? formatNumber(data.earned.activeKcal) : '—'}
          </dd>
        </div>
        <div class="border-hairline flex items-center justify-between gap-3 border-t pt-2.5">
          <dt class="text-ink-muted">Total burn</dt>
          <dd class="tabular font-mono">
            {data.earned.todayBurnKcal === null ? '—' : formatNumber(data.earned.todayBurnKcal)}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-3">
          <dt class="text-ink-muted flex items-center">
            Baseline<InfoTip term="Baseline" text={TIP.baseline} />
          </dt>
          <dd class="tabular font-mono">
            {data.earned.baselineKcal === null ? '—' : formatNumber(data.earned.baselineKcal)}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-3">
          <dt class="text-ink-muted">Earned</dt>
          <dd class="tabular font-mono {data.budget.earnedKcal > 0 ? 'text-good' : ''}">
            {data.budget.earnedKcal > 0 ? '+' : ''}{formatNumber(data.budget.earnedKcal)}
          </dd>
        </div>

        <div class="border-hairline flex items-center justify-between gap-3 border-t pt-2.5">
          <dt class="text-ink-muted flex items-center">
            Net<InfoTip term="Net calories" text={TIP.net} />
          </dt>
          <dd class="tabular font-mono">{formatNumber(netKcal)}</dd>
        </div>
        {#if balance.status === 'deficit' || balance.status === 'surplus'}
          <div class="flex items-center justify-between gap-3">
            <dt class="text-ink-muted">Day so far</dt>
            <dd
              class="tabular font-mono {balance.status === 'surplus' ? 'text-over' : 'text-good'}"
            >
              {formatNumber(Math.abs(balance.deficitKcal ?? 0))} kcal {balance.status}
            </dd>
          </div>
        {/if}
      </dl>

      <!-- Manual entry, for days the Shortcut missed. -->
      <div class="border-hairline mt-4 border-t">
        {#if showActivity}
          <form
            method="POST"
            action="?/activity"
            use:enhance={closeOnSuccess(() => (showActivity = false))}
            class="flex flex-wrap items-end gap-3 pt-4"
          >
            <input type="hidden" name="date" value={data.date} />
            <label class="flex min-w-32 flex-1 flex-col gap-1.5">
              <span class="eyebrow text-ink-muted">Active · kcal</span>
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
            <label class="flex min-w-32 flex-1 flex-col gap-1.5">
              <span class="eyebrow text-ink-muted">Resting · kcal</span>
              <input
                name="basalKcal"
                type="number"
                min="0"
                step="1"
                value={data.basalKcal ?? ''}
                class="field"
              />
            </label>
            <div class="flex gap-3">
              <button class="btn-primary">Save</button>
              <button type="button" class="btn-quiet" onclick={() => (showActivity = false)}>
                Cancel
              </button>
            </div>
            {#if form?.activityError}
              <p class="text-over w-full text-sm">{form.activityError}</p>
            {/if}
          </form>
        {:else}
          <button
            type="button"
            class="text-ink-muted hover:text-ink flex min-h-12 w-full items-center justify-between text-sm"
            onclick={() => (showActivity = true)}
          >
            Enter energy manually
            <span aria-hidden="true">+</span>
          </button>
        {/if}
      </div>
    </div>
  {/if}

  <a href="/meals" class="text-accent mt-4 inline-flex min-h-11 items-center text-sm font-semibold">
    Log a meal →
  </a>
</section>

<!-- ============================= Movable cards =============================

     Each card is a snippet; the order they render in is the user's own,
     saved with the profile. The ring above is pinned — it is the page. -->

{#snippet weekCard()}
  <section class="card mt-4 p-4 sm:p-5" aria-label="Last 7 days">
    <p class="eyebrow text-ink-muted mb-3">Last 7 days</p>
    <WeekBars week={data.week} viewedDate={data.date} />
  </section>
{/snippet}

{#snippet goalCard()}
  <section class="card mt-4 overflow-hidden">
    <div class="p-4 sm:p-5">
      <div class="flex items-center justify-between gap-3">
        <span class="eyebrow text-ink-muted">Goal</span>
        {#if !editGoal}
          <button type="button" class="btn-quiet" onclick={() => (editGoal = true)}>
            {data.pace ? 'Edit' : 'Set'}
          </button>
        {/if}
      </div>

      {#if !editGoal}
        <div class="mt-2.5">
          {#if data.pace?.reached}
            <p class="text-good text-lg font-semibold">{data.profile.goalWeightKg} kg reached</p>
          {:else if data.pace?.expired}
            <p class="text-lg font-semibold">
              {data.pace.kgToGo.toFixed(1)} kg
              <span class="text-ink-muted font-normal">still to go</span>
            </p>
            <p class="text-ink-muted mt-1.5 text-sm">
              {data.profile.goalDate} has passed — set a new date.
            </p>
          {:else if data.pace}
            <p class="text-lg font-semibold">
              {data.profile.goalWeightKg} kg
              <span class="text-ink-muted font-normal">by {data.profile.goalDate}</span>
            </p>
            <p class="text-ink-muted mt-1.5 text-sm">{data.pace.kgToGo.toFixed(1)} kg to go</p>
          {:else if hasGoal}
            <p class="text-lg font-semibold">
              {data.profile.goalWeightKg} kg
              <span class="text-ink-muted font-normal">by {data.profile.goalDate}</span>
            </p>
            <p class="text-ink-muted mt-1.5 text-sm">Log a weigh-in and the pace appears.</p>
          {:else}
            <p class="text-ink-muted mt-1 text-sm">
              None set — the budget follows the {formatNumber(KCAL_TARGET)} kcal anchor.
            </p>
          {/if}
        </div>
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
          <input
            name="goalWeightKg"
            type="number"
            step="0.1"
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
    {/if}
  </section>
{/snippet}

{#snippet sessionCard()}
  {#if data.scheduled}
    <a href="/workouts" class="card mt-4 block p-4 sm:p-5">
      <div class="flex items-center justify-between gap-3">
        <span class="eyebrow text-ink-muted">Session</span>
        <span class="text-accent text-sm font-semibold whitespace-nowrap">See exercises →</span>
      </div>
      <p class="mt-2.5 text-lg font-semibold">{SESSION_LABELS[data.scheduled]} day</p>
    </a>
  {:else}
    <div class="card mt-4 p-4 sm:p-5">
      <span class="eyebrow text-ink-muted">Session</span>
      <p class="text-ink-muted mt-2.5 text-lg">Rest day</p>
    </div>
  {/if}
{/snippet}

{#snippet weighinCard()}
  <section class="card mt-4 overflow-hidden">
    <div class="p-4 sm:p-5">
      <div class="flex items-center justify-between gap-3">
        <span class="eyebrow text-ink-muted">Weigh-in</span>
        {#if !showWeighIn}
          <button type="button" class="btn-quiet" onclick={() => (showWeighIn = true)}>Log</button>
        {/if}
      </div>

      {#if !showWeighIn}
        <div class="mt-2.5">
          {#if data.latest}
            <p class="text-lg font-semibold">
              {data.latest.weightKg} kg
              {#if data.latest.bodyFatPct !== null}
                <span class="text-ink-muted font-normal">· {data.latest.bodyFatPct}% fat</span>
              {/if}
            </p>
            <p class="text-ink-muted mt-1.5 text-sm">
              {data.latest.date === data.date ? 'Today' : `On ${data.latest.date}`}
            </p>
          {:else}
            <p class="text-ink-muted mt-1 text-sm">None yet</p>
          {/if}
        </div>
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
          <input
            name="date"
            type="date"
            value={data.date}
            max={data.today}
            required
            class="field"
          />
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="eyebrow text-ink-muted">Weight kg</span>
          <input name="weightKg" type="number" step="0.1" min="1" required class="field" />
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
          <button type="button" class="btn-quiet" onclick={() => (showWeighIn = false)}>
            Cancel
          </button>
        </div>
        {#if form?.error}
          <p class="text-over col-span-2 text-sm sm:col-span-5">{form.error}</p>
        {/if}
      </form>
    {/if}
  </section>
{/snippet}

{#snippet bodyCard()}
  <section class="card mt-4 overflow-hidden">
    <div class="p-4 sm:p-5">
      <div class="flex items-center justify-between gap-3">
        <span class="eyebrow text-ink-muted">Body profile</span>
        {#if !editProfile}
          <button type="button" class="btn-quiet" onclick={() => (editProfile = true)}>Edit</button>
        {/if}
      </div>

      {#if !editProfile}
        <div class="mt-2.5">
          {#if profileSet}
            <p class="text-lg font-semibold">
              {data.profile.heightCm} cm
              <span class="text-ink-muted font-normal">· {SEX_LABELS[data.profile.sex ?? '']}</span>
            </p>
            <p class="text-ink-muted mt-1.5 text-sm">Born {data.profile.birthDate}</p>
          {:else}
            <p class="text-ink-muted mt-1 text-sm">Not set — the budget needs it.</p>
          {/if}
        </div>
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
          <button type="button" class="btn-quiet" onclick={() => (editProfile = false)}>
            Cancel
          </button>
        </div>
        {#if form?.profileError}
          <p class="text-over col-span-2 text-sm sm:col-span-4">{form.profileError}</p>
        {/if}
      </form>
    {/if}
  </section>
{/snippet}

{#snippet trendCard()}
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
{/snippet}

<!-- In customize mode the cards fold into labeled rows — the order is the
     thing being edited, so the order is all that's shown. -->
{#each cardOrder as key (key)}
  {#if customizing}
    <div class="card mt-3 flex items-center justify-between gap-3 py-1.5 pr-2 pl-4">
      <span class="eyebrow text-ink-muted">{CARD_LABELS[key]}</span>
      <span class="flex gap-2">
        <button
          type="button"
          class="btn-quiet disabled:opacity-35"
          aria-label="Move {CARD_LABELS[key]} up"
          disabled={cardOrder.indexOf(key) === 0}
          onclick={() => move(key, -1)}
        >
          ↑
        </button>
        <button
          type="button"
          class="btn-quiet disabled:opacity-35"
          aria-label="Move {CARD_LABELS[key]} down"
          disabled={cardOrder.indexOf(key) === cardOrder.length - 1}
          onclick={() => move(key, 1)}
        >
          ↓
        </button>
      </span>
    </div>
  {:else if key === 'week'}{@render weekCard()}
  {:else if key === 'goal'}{@render goalCard()}
  {:else if key === 'session'}{@render sessionCard()}
  {:else if key === 'weighin'}{@render weighinCard()}
  {:else if key === 'body'}{@render bodyCard()}
  {:else if key === 'trend'}{@render trendCard()}{/if}
{/each}

<!-- ============================= Customize ============================= -->
<div class="mt-6 mb-2 flex justify-center gap-3">
  {#if customizing}
    <form
      method="POST"
      action="?/order"
      use:enhance={closeOnSuccess(() => (customizing = false))}
      class="flex gap-3"
    >
      <input type="hidden" name="order" value={draftOrder.join(',')} />
      <button class="btn-primary">Done</button>
      <button type="button" class="btn-quiet" onclick={() => (customizing = false)}>Cancel</button>
    </form>
  {:else}
    <button type="button" class="btn-quiet" onclick={startCustomize}>Customize layout</button>
  {/if}
</div>
