<script lang="ts">
  import { enhance } from '$app/forms';
  let { form } = $props();
</script>

<svelte:head><title>Log in — health-me</title></svelte:head>

<main class="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center p-6">
  <h1 class="mb-6 text-2xl font-bold">health-me</h1>
  <form method="POST" use:enhance class="flex flex-col gap-4">
    <label class="flex flex-col gap-1 text-sm">
      Username
      <input
        name="username"
        autocomplete="username"
        required
        value={form?.username ?? ''}
        class="border-hairline bg-surface rounded-md border px-3 py-2"
      />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Password
      <input
        name="password"
        type="password"
        autocomplete="current-password"
        required
        class="border-hairline bg-surface rounded-md border px-3 py-2"
      />
    </label>
    <label class="flex items-center gap-2 text-sm">
      <input name="remember" type="checkbox" /> Stay signed in
    </label>
    {#if form?.error}
      <p class="text-over text-sm">{form.error}</p>
    {/if}
    <button class="bg-accent text-on-accent rounded-md px-4 py-2 font-semibold">Log in</button>
  </form>
</main>
