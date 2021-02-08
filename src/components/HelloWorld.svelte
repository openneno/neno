<script>
  import { count } from "../store/store.js";

  /**
   * Increases the count variable from the store by 1
   */
  function incrementCount() {
    count.set($count + 1);
  }
</script>

<style type="text/postcss">
  .button {
    @apply bg-blue-700 text-white font-bold py-2 px-4 rounded;
  }
</style>

<div class="flex items-center justify-center h-screen bg-gray-200">
  <button class="button" on:click={() => incrementCount()}>
    Count is {$count}
  </button>
</div>
