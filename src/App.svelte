<script>
  import HelloWorld from "./components/HelloWorld.svelte";
  import Router from "./components/Router.svelte";
  import {
    settingStrore,
    pagedd,
    githubStrore,
    commitToGithubTag,
    searchNenoByDate,
  } from "./store/store.js";
  import { onMount } from "svelte";
  import {
    pushToGithub,
    getContentSha,
    cloneGithubRepo,
    compare2Commits,
    getLastCommitRecord,
    getGithubContent,
    deleteContent,
  } from "./request/githubApi";
  import {
    insertToIndexedDB,
    deleteOneFromIndexedDB,
  } from "./request/fetchApi";
  import { is_empty } from "svelte/internal";

  // if ("serviceWorker" in navigator) {
  //   navigator.serviceWorker.register("/service-worker.js");
  // }
  onMount(() => {
    let setting = window.localStorage.getItem("settingStrore");
    let github = window.localStorage.getItem("githubStrore");

    if (setting == null) {
      $pagedd = "setting";
    } else {
      $settingStrore = JSON.parse(setting);
    }
    github && ($githubStrore = JSON.parse(github));
    //打开的时候进行同步
    trySyncGithub();
  });
  githubStrore.subscribe((value) => {
    if (value.access_token) {
      window.localStorage.setItem(
        "githubStrore",
        JSON.stringify($githubStrore)
      );
    }
  });
  async function trySyncGithub() {
    if ($githubStrore.access_token != "" && $githubStrore.repoName != "") {
      // 先检查老数据,第一次就获取所有的数据

      if ($githubStrore.lastCommitSha == "") {
        await cloneGithubRepo("");
        $searchNenoByDate.date = "refresh";
      }
      {
        var lastCommitData = await getLastCommitRecord();
        if (
          $githubStrore.lastCommitSha != "" &&
          lastCommitData.body.commit.sha != $githubStrore.lastCommitSha
        ) {
          var comparResult = await compare2Commits({
            base: $githubStrore.lastCommitSha,
            head: lastCommitData.body.commit.sha,
          });
          var fileChange = comparResult.body.files;
          for (let index = 0; index < fileChange.length; index++) {
            const element = fileChange[index];
            if (element.filename.indexOf(".json") == 35) {
              if (element.status != "removed") {
                var nenoBodyRaw = (
                  await getGithubContent({ path: encodeURI(element.filename) })
                ).body;
                var nenoData = {};
                try {
                  nenoData = JSON.parse(nenoBodyRaw);
                } catch (error) {}
                if (!is_empty(nenoData)) insertToIndexedDB(nenoData);
              } else {
                await deleteOneFromIndexedDB({
                  _id: element.filename.substring(11, 35),
                });
              }
            }
          }
          $searchNenoByDate.date = "refresh";
        }
        $githubStrore.lastCommitSha = lastCommitData.body.commit.sha;
      }
    }
  }
  commitToGithubTag.subscribe(async (value) => {
    if (value.timestmp != 0 && $githubStrore.access_token != "") {
      console.log(JSON.stringify(value.data));

      await getContentSha({
        branch: $githubStrore.branch,
        fileName: encodeURI(
          `${value.data.created_at.substring(0, 10)}/${value.data._id}.json`
        ),
      }).then(async (shadata) => {
        switch (value.action) {
          case "push": {
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
            console.log("commitToGithubTagdata", data);
            break;
          }
          case "countDate": {
            var data = await pushToGithub({
              branch: $githubStrore.branch,
              fileName: `${value.data.created_at.substring(0, 10)}/${
                value.data._id
              }.json`,

              content: JSON.stringify(value.data, null, "\t"),
              commitMessage: "countDate update",
              encode: true,
              sha: shadata.body.sha,
            });
            console.log("countDategithub", data);
            break;
          }
          case "delete": {
            var data = await deleteContent({
              fileName: `${value.data.created_at.substring(0, 10)}/${
                value.data._id
              }.json`,
              sha: shadata.body.sha,
            });
            console.log("commitToGithubTagdata", data);
          }
        }

        $githubStrore.lastCommitSha = data.body.commit.sha;
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
