<script lang="ts">
  /*
   * The little "?" beside a term, Lose It!-style: tap it and a floating card
   * says what the term means. Fixed-position so no card's overflow can clip
   * it; clamped to the viewport; gone on scroll, outside tap, or Esc.
   */
  let { term, text }: { term: string; text: string } = $props();

  let open = $state(false);
  let button: HTMLButtonElement | undefined = $state();
  let style = $state('');

  const WIDTH = 264;

  function place() {
    if (!button) return;
    const r = button.getBoundingClientRect();
    const w = Math.min(WIDTH, window.innerWidth - 24);
    const left = Math.min(Math.max(r.left + r.width / 2 - w / 2, 12), window.innerWidth - w - 12);
    style = `top: ${r.bottom + 8}px; left: ${left}px; width: ${w}px;`;
  }

  function toggle() {
    open = !open;
    if (open) place();
  }

  function onWindowPointerdown(e: PointerEvent) {
    if (open && !button?.contains(e.target as Node)) open = false;
  }
  function onWindowKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false;
  }
</script>

<svelte:window
  onpointerdown={onWindowPointerdown}
  onkeydown={onWindowKeydown}
  onscrollcapture={() => (open = false)}
  onresize={() => open && place()}
/>

<button
  bind:this={button}
  type="button"
  class="text-ink-muted hover:text-ink -my-2 inline-flex h-8 w-8 items-center justify-center align-middle"
  aria-expanded={open}
  aria-label="What does {term} mean?"
  onclick={toggle}
>
  <span
    class="border-hairline flex h-4 w-4 items-center justify-center rounded-full border font-mono text-[0.625rem]"
    aria-hidden="true">?</span
  >
</button>

{#if open}
  <div class="card fixed z-50 p-3 text-left shadow-lg" {style} role="status">
    <p class="eyebrow text-ink-muted">{term}</p>
    <p class="text-ink mt-1.5 text-sm leading-snug">{text}</p>
  </div>
{/if}
