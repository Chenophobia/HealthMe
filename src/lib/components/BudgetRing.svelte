<script lang="ts">
  import { gauge, toneFor, formatNumber } from '$lib/readout';
  import type { DayBudget } from '$lib/budget';

  let {
    budget,
    protein,
    expanded = $bindable(false),
    detailId
  }: {
    budget: DayBudget;
    /** The inner ring: grams climbed towards the floor, scaled to the aim. */
    protein: { value: number; target: number; aim: number };
    /** The ring is a disclosure button for the day-detail panel. */
    expanded?: boolean;
    detailId: string;
  } = $props();

  /* Same bands as every bar in the app — the ring is a gauge bent into a
     circle, not a new instrument. */
  const g = $derived(gauge(budget.eatenKcal, budget.allowanceKcal));
  const tone = $derived(toneFor(g.status));

  const p = $derived(gauge(protein.value, protein.target, 'floor', protein.aim));
  const pTone = $derived(toneFor(p.status));

  const TEXT: Record<string, string> = {
    muted: 'text-ink-muted',
    accent: 'text-accent',
    warn: 'text-warn',
    good: 'text-good',
    over: 'text-over'
  };
  const STROKE: Record<string, string> = {
    muted: 'stroke-ink-muted',
    accent: 'stroke-accent',
    warn: 'stroke-warn',
    good: 'stroke-good',
    over: 'stroke-over'
  };

  const R = 84;
  const C = 2 * Math.PI * R;
  /* Inner (protein) ring: thinner — it is the supporting measure. */
  const R2 = 64;
  const C2 = 2 * Math.PI * R2;

  /* The stretch of track the day's earn added, drawn in the good tone so the
     extra room is visible as a different material at the end of the dial. */
  const earnedFrac = $derived(
    budget.allowanceKcal > 0 ? budget.earnedKcal / budget.allowanceKcal : 0
  );

  /* The protein floor's notch: the bar runs to the aim, so the target sits
     part-way round — same grammar as the notch on GaugeBar. */
  const notchAngle = $derived(p.scale > 0 ? (p.target / p.scale) * 2 * Math.PI : 0);
  const notchX1 = $derived(100 + (R2 - 6) * Math.cos(notchAngle));
  const notchY1 = $derived(100 + (R2 - 6) * Math.sin(notchAngle));
  const notchX2 = $derived(100 + (R2 + 6) * Math.cos(notchAngle));
  const notchY2 = $derived(100 + (R2 + 6) * Math.sin(notchAngle));

  const over = $derived(budget.remainingKcal < 0);
</script>

<button
  type="button"
  class="relative mx-auto block h-52 w-52 rounded-full"
  aria-expanded={expanded}
  aria-controls={detailId}
  aria-label="Calorie budget: {formatNumber(Math.abs(budget.remainingKcal))} kcal {over
    ? 'over'
    : 'left'}; protein {formatNumber(protein.value)} of {formatNumber(
    protein.target
  )} g. Tap for the day's breakdown."
  onclick={() => (expanded = !expanded)}
>
  <svg viewBox="0 0 200 200" class="h-full w-full -rotate-90" aria-hidden="true">
    <!-- Calories, outer -->
    <circle cx="100" cy="100" r={R} fill="none" class="stroke-hairline" stroke-width="13" />
    {#if earnedFrac > 0}
      <circle
        cx="100"
        cy="100"
        r={R}
        fill="none"
        class="stroke-good opacity-35"
        stroke-width="13"
        stroke-dasharray="{C * earnedFrac} {C}"
        stroke-dashoffset={-C * (1 - earnedFrac)}
      />
    {/if}
    {#if g.fraction > 0}
      <circle
        cx="100"
        cy="100"
        r={R}
        fill="none"
        class="{STROKE[tone]} transition-[stroke-dasharray,stroke] duration-500"
        stroke-width="13"
        stroke-linecap="round"
        stroke-dasharray="{C * g.fraction} {C}"
      />
    {/if}

    <!-- Protein, inner -->
    <circle
      cx="100"
      cy="100"
      r={R2}
      fill="none"
      class="stroke-hairline opacity-60"
      stroke-width="7"
    />
    {#if p.fraction > 0}
      <circle
        cx="100"
        cy="100"
        r={R2}
        fill="none"
        class="{STROKE[pTone]} transition-[stroke-dasharray,stroke] duration-500"
        stroke-width="7"
        stroke-linecap="round"
        stroke-dasharray="{C2 * p.fraction} {C2}"
      />
    {/if}
    <line
      x1={notchX1}
      y1={notchY1}
      x2={notchX2}
      y2={notchY2}
      class="stroke-ink opacity-40"
      stroke-width="2"
    />
  </svg>

  <span class="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
    <span class="tabular font-mono text-4xl leading-none font-semibold tracking-tight {TEXT[tone]}">
      {formatNumber(Math.abs(budget.remainingKcal))}
    </span>
    <span class="text-ink-muted font-mono text-xs">kcal {over ? 'over' : 'left'}</span>
  </span>
</button>
