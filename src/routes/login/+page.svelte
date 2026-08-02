<script lang="ts">
  import { enhance } from '$app/forms';
  let { form } = $props();
</script>

<svelte:head><title>Log in — health-me</title></svelte:head>

<main class="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-10">
  <header class="mb-8">
    <!-- The app mark, full size for once: the trend coming down to the rule. -->
    <svg viewBox="0 0 32 32" class="size-11 rounded-sm" role="img" aria-label="health-me">
      <!-- Fixed colours, not tokens: this is the same mark as the home-screen
           icon, and a logo that inverts with the theme stops being a logo. -->
      <rect width="32" height="32" fill="#11151b" />
      <g stroke="#ffffff" stroke-opacity=".45" stroke-linecap="round">
        <path d="M6.4 23.7h19.2" stroke-width="1.44" />
        <path d="M6.4 23.7v2.4M12.8 23.7v2.4M19.2 23.7v2.4M25.6 23.7v2.4" stroke-width="1.15" />
      </g>
      <path
        d="M6.4 8.96 11.52 12.8 16.64 10.56 21.76 16 25.6 20.96"
        fill="none"
        stroke="#53cfec"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <h1 class="eyebrow text-ink mt-4 text-base font-semibold">health&#8209;me</h1>
    <p class="text-ink-muted mt-2 text-sm">Daily log for the fat-loss program.</p>
  </header>

  <form method="POST" use:enhance class="flex flex-col gap-4">
    <label class="flex flex-col gap-1.5">
      <span class="eyebrow text-ink-muted">Username</span>
      <input
        name="username"
        autocomplete="username"
        required
        value={form?.username ?? ''}
        class="field"
      />
    </label>
    <label class="flex flex-col gap-1.5">
      <span class="eyebrow text-ink-muted">Password</span>
      <input
        name="password"
        type="password"
        autocomplete="current-password"
        required
        class="field"
      />
    </label>
    <label class="flex min-h-11 items-center gap-2.5 text-sm">
      <input name="remember" type="checkbox" class="size-4" /> Stay signed in
    </label>
    {#if form?.error}
      <p class="text-over text-sm">{form.error}</p>
    {/if}
    <button class="btn-primary">Log in</button>
  </form>
</main>
