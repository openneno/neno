<script>
  import SideLeft from "./SideLeft.svelte";
  import SideRight from "./SideRight.svelte";
  import Setting from "./Setting.svelte";
  import SettingSlide from "./SettingSlide.svelte";
  import NenoDetail from "../components/NenoDetail.svelte";
  import ViewPicture from "../components/ViewPicture.svelte";
  import Daily from "./Daily.svelte";
  import Luck from "./Luck.svelte";
  import Share from "../components/Share.svelte";

  import { currentPage } from "../store/store.js";
</script>

<div class=" overflow-visible">
  <div
    class="w-full  h-screen flex flex-col items-center justify-start  bg-gray-100 dark:bg-black   overflow-visible"
  >
    <div class="max-w-6xl min-w-0 w-full  flex   overflow-scroll ">
      <div
        class="hidden  sm:flex md:flex flex-col items-start dark:bg-black  overflow-visible"
        style="width:240px"
      >
        <SideLeft />
      </div>
      {#if $currentPage === "neno"}
        <SideRight />
      {:else if $currentPage === "setting"}
        <Setting />
      {:else if $currentPage === "luck"}
        <Luck />
      {:else}
        <Daily />
      {/if}
    </div>
    <NenoDetail />
    <SettingSlide />
    <ViewPicture />
    <Share />
  </div>
</div>
