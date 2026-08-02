<script lang="ts">
  import { gauge as toGauge, formatNumber, type GaugeKind } from '$lib/readout';
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
</script>

<div class="flex flex-col gap-2">
  <div class="flex items-baseline justify-between gap-3">
    <span class="eyebrow text-ink-muted">{label}</span>
    <span class="tabular font-mono text-sm">
      <span class="font-semibold {g.status === 'over' ? 'text-over' : 'text-ink'}"
        >{formatNumber(g.logged)}</span
      >
      <span class="text-ink-muted">/ {formatNumber(g.scale)} {unit}</span>
    </span>
  </div>
  <GaugeBar gauge={g} {label} />
</div>
