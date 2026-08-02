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
</script>

{#if data.user}
  <header class="border-hairline bg-surface sticky top-0 z-10 border-b">
    <nav
      class="mx-auto flex w-full max-w-3xl items-center gap-1 overflow-x-auto p-2 sm:gap-2 sm:p-4"
      aria-label="Primary"
    >
      {#each links as link (link.href)}
        {@const isActive = page.url.pathname === link.href}
        <a
          href={link.href}
          aria-current={isActive ? 'page' : undefined}
          class="hover:text-ink focus-visible:ring-accent relative rounded-md px-2.5 py-2 text-sm whitespace-nowrap transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:outline-none sm:px-3 dark:hover:bg-white/10 {isActive
            ? 'text-ink font-semibold'
            : 'text-ink-muted font-medium'}"
        >
          {link.label}
          {#if isActive}
            <span class="bg-accent absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full"></span>
          {/if}
        </a>
      {/each}
      <form method="POST" action="/logout" class="ml-auto">
        <button class="text-ink-muted hover:text-ink px-2 py-2 text-sm">Log out</button>
      </form>
    </nav>
  </header>
{/if}

<main class="mx-auto w-full max-w-3xl p-4 sm:p-6">
  {@render children()}
</main>
