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
  import ConfirmDialog from "../components/ConfirmDialog.svelte";

  import { currentPage } from "../store/store.js";
  import { fade } from "../lib/motion.js";
</script>

<div class="h-screen w-full bg-canvas text-ink">
  <div class="mx-auto flex h-screen w-full max-w-[1120px] min-w-0">
    <aside class="hidden h-screen w-[248px] shrink-0 sm:flex">
      <SideLeft />
    </aside>
    {#key $currentPage}
      <div class="flex min-w-0 flex-1" in:fade={{ duration: 160 }}>
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
    {/key}
  </div>
  <NenoDetail />
  <SettingSlide />
  <ViewPicture />
  <Share />
  <ConfirmDialog />
</div>
