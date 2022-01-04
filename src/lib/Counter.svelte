<script lang="ts">
  import { count } from './stores';

  export let id: string;
</script>

<button 
  {id} 
  on:click={() => $count += 1}
  data-testid={id}
  class="rounded-full text-red-600 py-4 px-8 border-2 border-transparent outline-none w-48 tabular-nums focus:border-opacity-100"
>
  Clicks: {$count}
</button>

<style>
  button {
    background: rgba(var(--svelte-rgb), 0.05);
  }

  button:active {
    background: rgba(var(--svelte-rgb), 0.15);
  }
</style>