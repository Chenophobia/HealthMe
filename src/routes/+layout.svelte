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
</script>

{#if data.user}
  <div class="flex min-h-dvh flex-col">
    <header
      class="border-hairline bg-surface/85 pad-top-safe sticky top-0 z-20 border-b backdrop-blur"
    >
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

    <main class="scroll-clear-tabbar mx-auto w-full max-w-3xl flex-1 px-4 pt-6 sm:px-6">
      {@render children()}
    </main>

    <nav
      class="border-hairline bg-surface/90 pad-bottom-safe fixed inset-x-0 bottom-0 z-20 border-t backdrop-blur md:hidden"
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
  </div>
{:else}
  {@render children()}
{/if}
