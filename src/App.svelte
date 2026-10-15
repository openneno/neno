<script>
    import HelloWorld from "./pages/Main.svelte";
    import Router from "./components/Router.svelte";
    import ReloadPrompt from './lib/ReloadPrompt.svelte'
    import {githubStore, notionStore, currentPage, settingStore, taskCountTag, syncStatus} from "./store/store.js";
    import {onMount} from "svelte";
    import {deleteTaskToIndexedDB, popTaskToIndexedDB,} from "./request/fetchApi";
    import {doTask, trySyncGithub} from "./lib/SyncTask";
    import {initTheme, normalizeSetting} from "./lib/theme.js";
    import {decodeNenoToken} from "./request/gitAccountApi.js";


    let tasking = false;
    onMount(() => {
        let setting = window.localStorage.getItem("settingStore");
        let github = window.localStorage.getItem("githubStore");
        let notion = window.localStorage.getItem("notionStore");

        github && ($githubStore = JSON.parse(github));
        notion && ($notionStore = JSON.parse(notion));
        setting && ($settingStore = normalizeSetting(JSON.parse(setting)));
        initTheme();

        //通过同步链接(#neno-config=...)打开时导入配置
        if (window.location.hash.indexOf("#neno-config=") === 0) {
            const hash = window.location.hash;
            history.replaceState(null, "", window.location.pathname + window.location.search);
            try {
                const config = decodeNenoToken(hash);
                if (window.confirm(`检测到同步配置: ${config.githubName}/${config.repoName}, 是否导入并开始同步?`)) {
                    $githubStore = {...$githubStore, ...config, lastCommitSha: ""};
                    window.localStorage.setItem("githubStore", JSON.stringify($githubStore));
                    $currentPage = "setting";
                }
            } catch (e) {
                console.log("同步链接无效", e);
            }
        }

        //打开的时候进行同步
        trySyncGithub().catch((reason) => console.log("trySyncGithub", reason));
        let syncInterval = setInterval(async () => {
            // console.log(tasking);
            if ($githubStore.access_token !== "" && $githubStore.repoName !== ""&& $githubStore.githubName !== "" && !$syncStatus.authError) {
                if (!tasking) {
                    tasking = true;
                    try {
                        let taskData = (await popTaskToIndexedDB()).body;
                        taskCountTag.set({all: taskData.length, done: 0});
                        for (const item of taskData) {
                            //任务失败时保留在队列中, 下一轮重试, 避免丢失数据
                            await doTask(item.data);
                            await deleteTaskToIndexedDB(item._id);

                            taskCountTag.update((value) => {
                                return {all: value.all, done: value.done + 1};
                            });
                        }
                    } catch (reason) {
                        console.log("同步任务失败, 稍后重试", reason);
                    } finally {
                        taskCountTag.set({all: 0, done: 0});
                        tasking = false;
                    }
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


<main class=" overflow-y-hidden f h-screen  ">
    <Router/>

    {#await sleep(50) then value}
        <HelloWorld/>
    {/await}
</main>
<ReloadPrompt />
