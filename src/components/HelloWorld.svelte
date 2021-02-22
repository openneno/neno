<script>
  import SideLeft from "./SideLeft.svelte";
  import SideRight from "./SideRight.svelte";
  import Setting from "./Setting.svelte";
  import SettingSlide from "./SettingSlide.svelte";
  import FmoloDetail from "./FmoloDetail.svelte";
  import ViewPicture from "./ViewPicture.svelte";

  import { pagedd } from "../store/store.js";
</script>

<div
  class="w-full  h-screen flex flex-col items-center justify-start  bg-gray-100"
>
  <div class="max-w-6xl min-w-0 w-full  flex ">
    <div
      class="hidden  sm:flex md:flex flex-col items-start"
      style="width:240px"
    >
      <SideLeft />
    </div>
    {#if $pagedd == "neno"}
      <SideRight />
    {:else if $pagedd == "setting"}
      <Setting />
    {/if}
  </div>
  <FmoloDetail />
  <SettingSlide />
  <ViewPicture />
</div>
