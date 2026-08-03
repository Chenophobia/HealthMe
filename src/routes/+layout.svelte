<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  let { data, children } = $props();

  const links = [
    { href: '/', label: 'Today' },
    { href: '/meals', label: 'Meals' },
    { href: '/workouts', label: 'Workouts' },
    { href: '/progress', label: 'Progress' },
    { href: '/plan', label: 'Plan' }
  ];

  const isActive = (href: string) => page.url.pathname === href;

  /*
   * Keep the window pinned at the origin.
   *
   * app.css locks the document, but iOS still scrolls the *window* to bring a
   * focused field above the keyboard — which slides the fixed header and tab
   * bar out of place and leaves them there. It shows up on Meals because that
   * page has eleven inputs and the others now have none. Nothing in this app
   * ever legitimately scrolls the window (the shell's middle region does all
   * the scrolling), so snapping it back can't fight anything real.
   */
  $effect(() => {
    const reset = () => {
      if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0);
    };
    window.addEventListener('scroll', reset, { passive: true });
    window.addEventListener('focusout', reset);
    window.visualViewport?.addEventListener('resize', reset);
    return () => {
      window.removeEventListener('scroll', reset);
      window.removeEventListener('focusout', reset);
      window.visualViewport?.removeEventListener('resize', reset);
    };
  });

  /*
   * Keep the shell inside the space the keyboard leaves.
   *
   * The shell is one viewport tall and only its middle scrolls, which means a
   * field near the bottom sits *behind* the on-screen keyboard with no way to
   * scroll it up — the scroller thinks it's already showing everything.
   * visualViewport reports the space actually left over, so drive the height
   * from that, then lift the focused field into the middle of it once the
   * keyboard has finished animating.
   */
  $effect(() => {
    const vv = window.visualViewport;

    const setHeight = () => {
      document.documentElement.style.setProperty(
        '--app-height',
        `${Math.round(vv?.height ?? window.innerHeight)}px`
      );
    };

    let pending: ReturnType<typeof setTimeout>;
    const revealFocused = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.matches('input, select, textarea')) return;
      // The keyboard animates in over ~250ms; scrolling before it settles
      // aims at the old geometry and lands in the wrong place.
      clearTimeout(pending);
      pending = setTimeout(
        () => target.scrollIntoView({ block: 'center', behavior: 'smooth' }),
        300
      );
    };

    setHeight();
    vv?.addEventListener('resize', setHeight);
    vv?.addEventListener('scroll', setHeight);
    window.addEventListener('resize', setHeight);
    window.addEventListener('focusin', revealFocused);
    return () => {
      clearTimeout(pending);
      vv?.removeEventListener('resize', setHeight);
      vv?.removeEventListener('scroll', setHeight);
      window.removeEventListener('resize', setHeight);
      window.removeEventListener('focusin', revealFocused);
    };
  });
</script>

<!--
  App shell, not a scrolling document.

  The window itself never scrolls (html/body are locked in app.css) — this
  frame is exactly one viewport tall and only the middle region scrolls. On
  iOS a scrolling document rubber-bands: drag anywhere and the whole page
  slides under the fixed chrome, which reads as the layout coming apart. With
  the scroll moved inside, the header and tab bar are structurally fixed
  rather than sticky, and there is no document left to bounce.
-->
<!-- Height comes from visualViewport (see above) so the keyboard can't cover a
     field; 100dvh is the pre-hydration and no-visualViewport fallback. -->
<div class="flex flex-col overflow-hidden" style="height: var(--app-height, 100dvh)">
  {#if data.user}
    <header class="border-hairline bg-surface pad-top-safe z-20 shrink-0 border-b">
      <div class="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 pb-2 sm:px-6">
        <a href="/" class="eyebrow text-ink font-semibold">health&#8209;me</a>

        <!-- On a phone the primary nav lives at the bottom, in thumb reach. -->
        <nav class="ml-auto hidden items-center gap-1 md:flex" aria-label="Primary">
          {#each links as link (link.href)}
            <a
              href={link.href}
              aria-current={isActive(link.href) ? 'page' : undefined}
              class="eyebrow rounded-xs px-2.5 py-2 transition-colors hover:bg-black/5 dark:hover:bg-white/10 {isActive(
                link.href
              )
                ? 'text-accent'
                : 'text-ink-muted hover:text-ink'}"
            >
              {link.label}
            </a>
          {/each}
        </nav>

        <form method="POST" action="/logout" class="ml-auto md:ml-2">
          <button class="eyebrow text-ink-muted hover:text-ink px-1 py-2">Log out</button>
        </form>
      </div>
    </header>
  {/if}

  <!-- min-h-0 lets this flex child actually shrink; without it the region
       grows to its content and pushes the tab bar off-screen. -->
  <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
    {#if data.user}
      <main class="mx-auto w-full max-w-3xl px-4 pt-6 pb-12 sm:px-6">
        {@render children()}
      </main>
    {:else}
      {@render children()}
    {/if}
  </div>

  {#if data.user}
    <nav
      class="border-hairline bg-surface pad-bottom-safe z-20 shrink-0 border-t md:hidden"
      aria-label="Primary"
    >
      <ul class="mx-auto flex w-full max-w-md">
        {#each links as link (link.href)}
          <li class="flex-1">
            <a
              href={link.href}
              aria-current={isActive(link.href) ? 'page' : undefined}
              class="relative flex min-h-12 flex-col items-center justify-center px-1 pt-2.5 pb-1.5 {isActive(
                link.href
              )
                ? 'text-accent'
                : 'text-ink-muted'}"
            >
              {#if isActive(link.href)}
                <span class="bg-accent absolute inset-x-3 top-0 h-0.5" aria-hidden="true"></span>
              {/if}
              <!-- Tighter than `eyebrow`: five labels have to fit across a
                   320px phone without wrapping. -->
              <span class="font-mono text-[10px] tracking-[0.06em] uppercase">{link.label}</span>
            </a>
          </li>
        {/each}
      </ul>
    </nav>
  {/if}
</div>
