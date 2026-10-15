<script>
    import {
        exportIndexedDBToFile,
        imporFileTotIndexedDB,
    } from "../request/fetchApi";
    import {getContentSha, pushToGithub} from "../request/githubApi";
    import {
        syncAllNenoToNotion,
        syncNenoToNotion,
    } from "../request/notionSyncAction";
    import {
        currentPage,
        githubStore,
        notionStore,
    } from "../store/store.js";
    import ThemePicker from "../components/ThemePicker.svelte";
    import SyncSetup from "../components/SyncSetup.svelte";

    let importButtonUploadNode = "";
    // svelte 5 的 bind:files 只接受 FileList, 改为监听 change 事件
    function onImportFileSelected(event) {
        const importFile = event.currentTarget.files;
        console.log(importFile);
        // await importIndexedDB();
        if (importFile && importFile.length !== 0) {
            let reader = new FileReader();
            reader.readAsText(importFile[0]);
            reader.onload = async (oFREvent) => {
                // 读取完毕从中取值
                let pointsTxt = oFREvent.target.result;
                let alldata = JSON.parse(pointsTxt);
                console.log(alldata);
                await imporFileTotIndexedDB(alldata.body);
                // window.location.reload();
            };
        }
    }

    //保存 notion 等其他设置, 同步账号由 SyncSetup 单独保存
    function saveSetting() {
        window.localStorage.setItem(
            "notionStore",
            JSON.stringify($notionStore)
        );
        window.location.reload();
    }

    async function exportData() {
        let alldata = await exportIndexedDBToFile();
        let stringAllData = JSON.stringify(alldata);
        console.log(stringAllData);
        const blob = new Blob([stringAllData], {type: "application/json"});
        const objectURL = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectURL;
        link.download = "nenodata.txt";
        link.click();
        window.URL.revokeObjectURL(link.href);
    }

    async function importNeno() {
        importButtonUploadNode.click();
    }

    async function setSyncToNotionAction() {
        const syncAllNenoToNotionfile = syncAllNenoToNotion
            .replace("[GITHUB_TOKEN]", $githubStore.access_token)
            .replace("[NOTION_TOKEN]", $notionStore.internalIntegrationToken)
            .replace("[NOTION_DATABASEID]", $notionStore.databaseId);
        const syncNenoToNotionfile = syncNenoToNotion
            .replace("[GITHUB_TOKEN]", $githubStore.access_token)
            .replace("[NOTION_TOKEN]", $notionStore.internalIntegrationToken)
            .replace("[NOTION_DATABASEID]", $notionStore.databaseId);
        console.log(syncNenoToNotionfile);
        let actions = [
            {
                fileName: ".github/workflows/syncAllNenoToNotion.yml",
                fileContent: syncAllNenoToNotionfile
            }, {
                fileName: ".github/workflows/syncNenoSingleItem.yml",
                fileContent: syncNenoToNotionfile
            }]
        for (let action of actions) {
            await getContentSha({
                branch: $githubStore.branch,
                fileName: encodeURI(
                    action.fileName
                ),
            }).then(async (shadata) => {

                await pushToGithub({
                    branch: $githubStore.branch,
                    fileName: action.fileName,
                    content: action.fileContent,
                    commitMessage: `add action ${action.fileName}`,
                    encode: true,
                    sha: shadata.body.sha,
                });
            })
        }


    }

</script>

<div class="  flex-1 flex flex-col justify-start  pt-4 pl-4 overflow-scroll ">
    <div
            class="font-bold text-lg flex  justify-start  items-center text-gray-600 dark:text-gray-100 "
    >
        <button
                class="focus:outline-hidden    sm:hidden md:hidden mr-4"
                on:click={() => {
                $currentPage = "neno";
            }}
        >
            <i class="ri-arrow-left-line"></i>
        </button>
        设置
    </div>

    <div class="">
        <div class="m-4 flex flex-col dark:text-gray-100 ">
            <div class="mb-4 m-4">
                <div class="font-bold mb-3 flex items-center"><i class="ri-palette-line mr-1"></i>主题</div>
                <ThemePicker/>
            </div>
            <div class="bg-gray-200  w-full h-[2px]"></div>
            <div class="mb-4 focus:outline-hidden">

                <div class="m-4">
                    <div class="font-bold mb-3 flex items-center"><i class="ri-refresh-line mr-1"></i>同步</div>
                    <div class="text-sm text-gray-500 dark:text-slate-300 mb-4">
                        笔记保存在你自己的 GitHub / Gitee 私有仓库中, 无需服务器, 也可以完全离线使用。
                    </div>
                    <SyncSetup/>
                </div>

                <div class="bg-gray-200  w-full h-[2px]"></div>
                {#if $githubStore.gitUrl === "https://api.github.com" && $githubStore.access_token !== ""}
                    <div class="m-4 flex flex-col">
                        <div>
                            <label for="isSyncToNotion">同步到notion</label>
                            <input
                                    type="checkbox"
                                    id="isSyncToNotion"
                                    bind:checked={$notionStore.isSyncToNotion}
                                    class="  bg-fuchsia-100"
                            />
                        </div>
                        <div class="ml-2  text-sm text-yellow-500">
                            <p>
                                同步功能由github
                                action完成,可进行手动的全量同步(在笔记存储仓库的action中手动执行 sync all neno to notion
                                action)和每次提交到github保存的自动进行的增量同步
                            </p>
                            <p>
                                由于notion
                                API的限制,此功能只进行新增笔记(不包括图片)的单向同步到notion,在neno上对已有笔记的修改,删除不会同步到notion
                            </p>
                        </div>

                        {#if $notionStore.isSyncToNotion}
                            <div class="ml-2 mt-2 text-">
                                <label
                                >Notion Internal Integration Token<a
                                        class="text-sm ml-4"
                                        href="https://developers.notion.com/docs/getting-started"
                                        target="_blank">(如何获取)</a
                                ></label
                                >
                                <input
                                        type="text"
                                        bind:value={$notionStore.internalIntegrationToken}
                                        class="w-full border-2  mt-4 outline-white p-2 text-black"
                                        placeholder="Internal Integration Token "
                                />
                            </div>
                            <div class="ml-2 mt-2">
                                <label
                                >Notion Database ID<a
                                        class="text-sm ml-4"
                                        href="https://developers.notion.com/docs/getting-started"
                                        target="_blank">(如何获取)</a
                                ></label
                                >
                                <input
                                        type="text"
                                        bind:value={$notionStore.databaseId}
                                        class="w-full border-2  mt-4 outline-white p-2 text-black"
                                        placeholder="Notion Database ID "
                                />
                            </div>
                            <button
                                    class="ml-2 mt-2 border-2  dark:text-white outline-white p-2 hover:bg-primary-500 hover:text-white focus:outline-white"
                                    on:click={() => {
                                setSyncToNotionAction();
                            }}
                            >
                                保存设置到github action
                            </button>
                        {/if}
                    </div>
                {/if}
                <div class="m-4">
                    <label>导入/导出离线数据</label>
                    <div class="flex items-center space-x-4">
                        <button
                                class="w-full border-2  mt-4 outline-white p-2"
                                on:click={() => {
                                importNeno();
                            }}
                        >导入
                        </button>
                        <input
                                type="file"
                                bind:this={importButtonUploadNode}
                                on:change={onImportFileSelected}
                                style="display:none"
                                accept=".txt"
                                class="w-full border-2  mt-4 outline-white p-2"
                        />
                        <button
                                class="w-full border-2  mt-4 outline-white p-2"
                                on:click={() => {
                                exportData();
                            }}
                        >导出
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="m-4">
        <button
                on:click={() => {
                saveSetting();
            }}
                class="w-full border-2  dark:text-white outline-white p-2 hover:bg-primary-500 hover:text-white focus:outline-white"
        >
            保存设置
        </button>
    </div>
</div>
