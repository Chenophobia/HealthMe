<script lang="ts">
  let {
    label,
    value,
    target,
    unit,
    aim
  }: { label: string; value: number; target: number; unit: string; aim?: number } = $props();

  const pct = $derived(Math.min(100, (value / target) * 100));
  const over = $derived(value > target * 1.05);
</script>

<div class="flex flex-col gap-1">
  <div class="flex justify-between text-sm">
    <span class="font-medium">{label}</span>
    <span class="text-ink-muted">
      {value} / {target}{aim ? `+ (aim ${aim})` : ''}
      {unit}
    </span>
  </div>
  <div class="bg-hairline h-2.5 w-full overflow-hidden rounded-full">
    <div
      class="h-full rounded-full transition-all {over ? 'bg-over' : 'bg-accent'}"
      style="width: {pct}%"
    ></div>
  </div>
</div>
