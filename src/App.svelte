<script>
    import HelloWorld from "./pages/Main.svelte";
    import Router from "./components/Router.svelte";
    import ReloadPrompt from './lib/ReloadPrompt.svelte'
    import {githubStore, notionStore, currentPage, settingStore} from "./store/store.js";
    import {onMount} from "svelte";
    import {startSyncEngine, syncNow} from "./lib/sync/syncEngine.js";
    import {initTheme, normalizeSetting} from "./lib/theme.js";
    import {LEGACY_GITEE_URL, decodeNenoToken} from "./request/gitAccountApi.js";
    import {alertDialog, confirmDialog} from "./components/ConfirmDialog.svelte";


    onMount(() => {
        let setting = window.localStorage.getItem("settingStore");
        let github = window.localStorage.getItem("githubStore");
        let notion = window.localStorage.getItem("notionStore");

        github && ($githubStore = JSON.parse(github));
        //已不再支持 Gitee: 保留本地笔记, 清除同步配置, 在设置页提示用户
        if ($githubStore.gitUrl === LEGACY_GITEE_URL) {
            $githubStore = {...$githubStore, access_token: "", githubName: "", repoName: "", lastCommitSha: "", gitUrl: "https://api.github.com"};
            window.localStorage.removeItem("githubStore");
            window.localStorage.setItem("neno-gitee-removed", "1");
        }
        notion && ($notionStore = JSON.parse(notion));
        setting && ($settingStore = normalizeSetting(JSON.parse(setting)));
        initTheme();

        //通过同步链接(#neno-config=...)打开时导入配置
        if (window.location.hash.indexOf("#neno-config=") === 0) {
            const hash = window.location.hash;
            history.replaceState(null, "", window.location.pathname + window.location.search);
            let config = null;
            try {
                config = decodeNenoToken(hash);
            } catch (e) {
                console.log("同步链接无效", e);
                if (e.unsupported) alertDialog({title: "无法导入同步配置", message: e.message});
            }
            if (config) {
                confirmDialog({
                    title: "导入同步配置?",
                    message: `将使用 GitHub 仓库 ${config.githubName}/${config.repoName} 同步笔记。`,
                    confirmText: "导入并同步",
                    icon: "ri-links-line",
                }).then((confirmed) => {
                    if (!confirmed) return;
                    $githubStore = {...$githubStore, ...config, lastCommitSha: ""};
                    window.localStorage.setItem("githubStore", JSON.stringify($githubStore));
                    $currentPage = "setting";
                    //导入后立即开始同步
                    syncNow();
                });
            }
        }

        //开始同步: 打开时, 本地修改后, 切回页面时以及每分钟检查一次
        startSyncEngine();
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
