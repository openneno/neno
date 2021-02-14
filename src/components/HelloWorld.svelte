<script>
  import SideLeft from "./SideLeft.svelte";
  import SideRight from "./SideRight.svelte";
  import SideInRight from "./SideInRight.svelte";

</script>

<div
  class="w-full  h-screen flex flex-col items-center justify-start  bg-gray-100"
>
  <div class="max-w-6xl min-w-0 w-full  flex ">
    <SideLeft />
    <SideRight />
  </div>
  <SideInRight />
</div>
