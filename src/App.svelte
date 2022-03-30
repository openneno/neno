<script>
    import HelloWorld from "./pages/Main.svelte";
    import Router from "./components/Router.svelte";
    import Tailwind from "./Tailwind.svelte";
    import ReloadPrompt from './lib/ReloadPrompt.svelte'
    import {githubStore, notionStore, currentPage, settingStore, taskCountTag,} from "./store/store.js";
    import {onMount} from "svelte";
    import {deleteTaskToIndexedDB, popTaskToIndexedDB,} from "./request/fetchApi";
    import {doTask, trySyncGithub} from "./lib/SyncTask";


    let tasking = false;
    onMount(() => {
        let setting = window.localStorage.getItem("settingStore");
        let github = window.localStorage.getItem("githubStore");
        let notion = window.localStorage.getItem("notionStore");

        github && ($githubStore = JSON.parse(github));
        notion && ($notionStore = JSON.parse(notion));
        setting && ($settingStore = JSON.parse(setting));

        //打开的时候进行同步
        trySyncGithub();
        let syncInterval = setInterval(async () => {
            // console.log(tasking);
            if ($githubStore.access_token !== "" && $githubStore.repoName !== ""&& $githubStore.githubName !== "") {
                if (!tasking) {
                    tasking = true;
                    let taskData = (await popTaskToIndexedDB()).body;
                    taskCountTag.set({all: taskData.length, done: 0});
                    for (const item of taskData) {
                        await doTask(item.data);
                        await deleteTaskToIndexedDB(item._id);

                        taskCountTag.update((value) => {
                            return {all: value.all, done: value.done + 1};
                        });
                    }
                    taskCountTag.set({all: 0, done: 0});
                    tasking = false;
                }
            }
        }, 5000);
        return () => clearInterval(syncInterval);
    });
    githubStore.subscribe((value) => {
        if (value.access_token) {
            window.localStorage.setItem("githubStore", JSON.stringify($githubStore));
        }
    });




    async function test() {
        await sleep(1000);
        sleep(1000).then((value) => {
        });
    }

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    test();
</script>

<Tailwind/>

<main class=" overflow-y-hidden f h-screen  ">
    <Router/>

    {#await sleep(50) then value}
        <HelloWorld/>
    {/await}
</main>
<ReloadPrompt />
