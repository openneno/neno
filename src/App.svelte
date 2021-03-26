<script>
  import HelloWorld from "./components/HelloWorld.svelte";
  import Router from "./components/Router.svelte";
  import { settingStrore, pagedd } from "./store/store.js";
  import { onMount } from "svelte";

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js");
  }
  onMount(() => {
    let setting = window.localStorage.getItem("settingStrore");
    if (setting == null) {
      $pagedd = "setting";
    } else {
      $settingStrore = JSON.parse(setting);
    }
  });
  async function test() {
    await sleep(1000);
    sleep(1000).then((value) => {});
  }

  function sleep(ms) {\
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  test();
</script>

<main class="overflow-y-hidden f h-screen">
  <Router />

  {#await sleep(50) then value}
    <HelloWorld />
  {/await}
</main>

<style lang="postcss"></style>
