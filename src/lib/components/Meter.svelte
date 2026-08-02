<script lang="ts">
  import { gauge as toGauge, formatNumber, gaugeCaption, type GaugeKind } from '$lib/readout';
  import GaugeBar from './GaugeBar.svelte';

  let {
    label,
    value,
    target,
    unit,
    kind = 'ceiling',
    aim
  }: {
    label: string;
    value: number;
    target: number;
    unit: string;
    kind?: GaugeKind;
    aim?: number;
  } = $props();

  const g = $derived(toGauge(value, target, kind, aim));

  /* A ceiling is read as what's left to spend; a floor as how far you've
     climbed. Same component, and the headline flips with the kind. */
  const headline = $derived(
    kind === 'ceiling' ? formatNumber(Math.abs(g.remaining)) : formatNumber(g.logged)
  );
  const suffix = $derived(
    kind === 'ceiling'
      ? `${unit} ${g.remaining < 0 ? 'over' : 'left'}`
      : `of ${formatNumber(g.target)} ${unit}`
  );
</script>

<div class="flex flex-col gap-2.5">
  <p class="eyebrow text-ink-muted">{label}</p>
  <p class="flex items-baseline gap-2">
    <span
      class="tabular font-mono text-4xl leading-none font-semibold tracking-tight sm:text-5xl {g.status ===
      'over'
        ? 'text-over'
        : 'text-ink'}">{headline}</span
    >
    <span class="text-ink-muted font-mono text-sm">{suffix}</span>
  </p>
  <GaugeBar gauge={g} {label} />
  <p class="text-ink-muted text-sm">{gaugeCaption(g, unit, kind)}</p>
</div>
