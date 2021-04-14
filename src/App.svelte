<script>
  import HelloWorld from "./components/HelloWorld.svelte";
  import Router from "./components/Router.svelte";
  import {
    settingStrore,
    pagedd,
    githubStrore,
    pushToGithubTag,
  } from "./store/store.js";
  import { onMount } from "svelte";
  import {
    pushToGithub,
    getContentSha,
    cloneGithubRepo,
  } from "./request/githubApi";

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js");
  }
  onMount(() => {
    let setting = window.localStorage.getItem("settingStrore");
    let github = window.localStorage.getItem("githubStrore");

    if (setting == null) {
      $pagedd = "setting";
    } else {
      $settingStrore = JSON.parse(setting);
    }
    github && ($githubStrore = JSON.parse(github));
  });

  pushToGithubTag.subscribe(async (value) => {
    if (value.timestmp != 0 && $githubStrore.access_token != "") {
      console.log(JSON.stringify(value.data));
      // 先检查老数据,第一次就获取所有的数据
      if ($githubStrore.lastCommitSha == "") {
        await cloneGithubRepo("");
      }
      await getContentSha({
        branch: $githubStrore.branch,
        fileName: `${value.data.created_at.substring(0, 10)}/${
          value.data._id
        }.json`,
      }).then(async (shadata) => {
        var data = await pushToGithub({
          branch: $githubStrore.branch,
          fileName: `${value.data.created_at.substring(0, 10)}/${
            value.data._id
          }.json`,
          content: JSON.stringify(value.data, null, "\t"),
          commitMessage: value.data.pureContent,
          encode: true,
          sha: shadata.body.sha,
        });
        console.log("pushToGithubTagdata", data);

        $githubStrore.lastCommitSha = data.body.commit.sha;
        window.localStorage.setItem(
          "githubStrore",
          JSON.stringify($githubStrore)
        );
      });
    }
  });

  async function test() {
    await sleep(1000);
    sleep(1000).then((value) => {});
  }

  function sleep(ms) {
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
