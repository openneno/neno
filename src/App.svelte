<script>
  import HelloWorld from "./components/HelloWorld.svelte";
  import Router from "./components/Router.svelte";
  import { setting } from "./request/fetchApi";
  import { settingStrore, pagedd } from "./store/store.js";
  import { onMount } from "svelte";

  // if ("serviceWorker" in navigator) {
  //   navigator.serviceWorker.register("/service-worker.js");
  // }
  onMount(() => {
    let domain = window.localStorage.getItem("domain");
    console.log("domain", domain);
    if (domain == null) {
      $pagedd = "setting";
    } else {
      $settingStrore.domain = domain;
    }
    setting()
      .then(async (respone) => {
        let re = await respone.json();
        console.log("settingStrore", $settingStrore);

        if (Object.keys(re.body).length == 0) {
          console.log($settingStrore);
          setting($settingStrore).then(async (respone) => {});
        } else {
          $settingStrore = re.body;
        }
      })
      .catch((reason) => {
        console.log(reason);
      });
  });
  async function test() {
    console.log("Hello");
    await sleep(1000);
    sleep(1000).then((value) => {
      console.log("sleep", value);
    });
    console.log("world!");
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  test();
</script>

<main class="overflow-y-hidden f h-screen">
  <Router />

  {#await sleep(10) then value}
    <HelloWorld />
  {/await}
</main>

<style lang="postcss"></style>
