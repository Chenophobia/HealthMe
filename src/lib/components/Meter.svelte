<script lang="ts">
  import {
    gauge as toGauge,
    formatNumber,
    gaugeHeadline,
    toneFor,
    type GaugeKind
  } from '$lib/readout';
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

  /* The headline takes its band's colour outright — at arm's length the hue
     is read before the digits are. */
  const TEXT: Record<string, string> = {
    muted: 'text-ink-muted',
    accent: 'text-accent',
    warn: 'text-warn',
    good: 'text-good',
    over: 'text-over'
  };

  const g = $derived(toGauge(value, target, kind, aim));
  const headline = $derived(gaugeHeadline(g, unit, kind));
</script>

<div class="flex flex-col gap-2.5">
  <div class="flex items-baseline justify-between gap-3">
    <span class="eyebrow text-ink-muted">{label}</span>
    <span class="tabular text-ink-muted font-mono text-xs">
      {formatNumber(g.logged)} / {formatNumber(g.scale)}
    </span>
  </div>
  <p class="flex items-baseline gap-2">
    <span
      class="tabular font-mono text-4xl leading-none font-semibold tracking-tight sm:text-5xl {TEXT[
        toneFor(g.status)
      ]}">{headline.value}</span
    >
    <span class="text-ink-muted font-mono text-sm">{headline.suffix}</span>
  </p>
  <GaugeBar gauge={g} {label} />
</div>
