<script>
  import HelloWorld from "./components/HelloWorld.svelte";
  import Router from "./components/Router.svelte";
  import { setting } from "./request/fetchApi";
  import { settingStrore } from "./store/store.js";
  import { onMount } from "svelte";

  // if ("serviceWorker" in navigator) {
  //   navigator.serviceWorker.register("/service-worker.js");
  // }
  onMount(() => {
    setting()
      .then(async (respone) => {
        let re = await respone.json();
        console.log($settingStrore);

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
</script>

<main class="overflow-y-hidden f h-screen">
  <Router />
  <HelloWorld />
</main>

<style lang="postcss"></style>
