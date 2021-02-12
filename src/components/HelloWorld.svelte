<script>
  import { count } from "../store/store.js";
  import SideLeft from "./SideLeft.svelte";
  import SideRight from "./SideRight.svelte";

  /**
   * Increases the count variable from the store by 1
   */
  function incrementCount() {
    console.log($count);
    count.set($count + 3);
  }
</script>

<div class="w-full  h-screen flex flex-col items-center justify-start mt-2">
  <div class="max-w-6xl min-w-0 w-full  flex ">
    <SideLeft />
    <SideRight />
  </div>
</div>

<style type="text/postcss">
  .button {
    @apply bg-blue-700 text-white font-bold py-2 px-4 rounded border-yellow-400;
  }
</style>
