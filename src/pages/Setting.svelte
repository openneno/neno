<script>
    import {
        exportIndexedDBToFile,
        imporFileTotIndexedDB,
    } from "../request/fetchApi";
    import {commitTextFiles} from "../lib/sync/syncEngine.js";
    import {
        syncAllNenoToNotion,
        syncNenoToNotion,
    } from "../request/notionSyncAction";
    import {
        asrStore,
        currentPage,
        githubStore,
        notionStore,
    } from "../store/store.js";
    import {transcribe} from "../lib/voice/asr.js";
    import {encodeWav, SAMPLE_RATE} from "../lib/voice/recorder.js";
    import ThemePicker from "../components/ThemePicker.svelte";
    import SyncSetup from "../components/SyncSetup.svelte";
    import PageHeader from "../components/PageHeader.svelte";
    import {alertDialog} from "../components/ConfirmDialog.svelte";

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

    //语音输入: API Key 修改后自动保存(App.svelte 中持久化)
    let asrKeyInput = $asrStore.apiKey;
    let showAsrKey = false;
    let asrChecking = false;
    //"" | "ok" | 错误信息
    let asrCheckResult = "";

    function saveAsrKey() {
        const apiKey = asrKeyInput.trim();
        if (apiKey !== $asrStore.apiKey) {
            $asrStore = {...$asrStore, apiKey};
            asrCheckResult = "";
        }
    }

    //发送一段很短的静音, 检查 API Key 是否可用(按秒计费, 约 1 秒)
    async function checkAsrKey() {
        saveAsrKey();
        asrChecking = true;
        asrCheckResult = "";
        try {
            await transcribe(encodeWav(new Float32Array(SAMPLE_RATE / 2)), $asrStore.apiKey);
            asrCheckResult = "ok";
        } catch (error) {
            asrCheckResult = error.message || "检测失败";
        } finally {
            asrChecking = false;
        }
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
        //两个 workflow 文件在一次提交中写入
        try {
            await commitTextFiles([
                {path: ".github/workflows/syncAllNenoToNotion.yml", text: syncAllNenoToNotionfile},
                {path: ".github/workflows/syncNenoSingleItem.yml", text: syncNenoToNotionfile},
            ], "add notion sync actions");
            alertDialog({title: "已写入 GitHub Action", message: "之后新增的笔记会自动同步到 Notion。", icon: "ri-check-line"});
        } catch (error) {
            console.log(error);
            alertDialog({title: "写入失败", message: error.message, icon: "ri-error-warning-line"});
        }
    }

</script>

<div class="flex h-screen min-w-0 flex-1 flex-col">
    <div class="mx-auto w-full max-w-[720px] px-4 sm:px-6">
        <PageHeader title="设置"/>
    </div>

    <div class="flex-1 overflow-y-auto">
        <div class="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-4 pt-2 pb-16 sm:px-6">
            <section class="card p-5">
                <h2 class="text-[15px] font-semibold text-ink">外观</h2>
                <p class="mt-1 mb-4 text-[13px] text-ink-3">选择浅色, 深色或跟随系统, 以及喜欢的主题色。</p>
                <ThemePicker/>
            </section>

            <section class="card p-5">
                <h2 class="text-[15px] font-semibold text-ink">同步</h2>
                <p class="mt-1 mb-5 text-[13px] text-ink-3">笔记保存在你自己的 GitHub 私有仓库中, 无需服务器, 也可以完全离线使用。</p>
                <SyncSetup/>
            </section>

            <section class="card p-5">
                <h2 class="text-[15px] font-semibold text-ink">语音输入</h2>
                <p class="mt-1 mb-4 text-[13px] leading-relaxed text-ink-3">
                    点击编辑器中的 <i class="ri-mic-line"></i> 录音(每段最长 2 分钟), 由 DeepSeek 识别为文字, 自动识别语言。
                    原始录音和识别出的原文会随笔记一起保存和同步。API Key 只保存在这台设备上。
                </p>
                <label class="flex flex-col gap-1.5">
                    <span class="flex items-center justify-between text-[13px] font-medium text-ink-2">
                        DeepSeek API Key
                        <a class="text-xs font-normal text-primary-600 hover:underline dark:text-primary-300" href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer">获取 API Key</a>
                    </span>
                    <div class="relative">
                        <input
                                class="input pr-10"
                                type={showAsrKey ? "text" : "password"}
                                placeholder="sk-..."
                                autocomplete="off"
                                spellcheck="false"
                                bind:value={asrKeyInput}
                                on:change={saveAsrKey}
                                on:blur={saveAsrKey}
                        />
                        <button
                                class="icon-btn absolute top-0.5 right-0.5 size-8 text-[15px]"
                                type="button"
                                aria-label={showAsrKey ? "隐藏" : "显示"}
                                on:click={() => (showAsrKey = !showAsrKey)}
                        >
                            <i class={showAsrKey ? "ri-eye-off-line" : "ri-eye-line"}></i>
                        </button>
                    </div>
                </label>
                <div class="mt-3 flex flex-wrap items-center justify-end gap-3">
                    {#if asrCheckResult === "ok"}
                        <span class="flex items-center gap-1 text-[13px] text-primary-600 dark:text-primary-300"><i class="ri-check-line"></i>API Key 可用</span>
                    {:else if asrCheckResult}
                        <span class="flex items-center gap-1 text-[13px] text-red-600 dark:text-red-400"><i class="ri-error-warning-line"></i>{asrCheckResult}</span>
                    {/if}
                    <button class="btn btn-secondary" disabled={asrChecking || !asrKeyInput.trim()} on:click={checkAsrKey}>
                        {#if asrChecking}<i class="ri-loader-4-line animate-spin"></i>{/if}检测
                    </button>
                </div>
            </section>

            {#if $githubStore.access_token !== ""}
                <section class="card p-5">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <h2 class="text-[15px] font-semibold text-ink">同步到 Notion</h2>
                            <p class="mt-1 text-[13px] leading-relaxed text-ink-3">
                                由仓库中的 GitHub Action 完成: 每次保存时增量同步, 也可以在仓库的 Actions 中手动执行 "sync all neno to notion" 全量同步。
                                受 Notion API 限制, 只单向同步新增的笔记(不含图片), 修改和删除不会同步。
                            </p>
                        </div>
                        <input
                                type="checkbox"
                                class="switch mt-0.5"
                                aria-label="同步到 Notion"
                                bind:checked={$notionStore.isSyncToNotion}
                        />
                    </div>

                    {#if $notionStore.isSyncToNotion}
                        <div class="mt-5 flex flex-col gap-4">
                            <label class="flex flex-col gap-1.5">
                                <span class="flex items-center justify-between text-[13px] font-medium text-ink-2">
                                    Internal Integration Token
                                    <a class="text-xs font-normal text-primary-600 hover:underline dark:text-primary-300" href="https://developers.notion.com/docs/getting-started" target="_blank" rel="noreferrer">如何获取</a>
                                </span>
                                <input class="input" type="text" placeholder="secret_..." bind:value={$notionStore.internalIntegrationToken}/>
                            </label>
                            <label class="flex flex-col gap-1.5">
                                <span class="flex items-center justify-between text-[13px] font-medium text-ink-2">
                                    Database ID
                                    <a class="text-xs font-normal text-primary-600 hover:underline dark:text-primary-300" href="https://developers.notion.com/docs/getting-started" target="_blank" rel="noreferrer">如何获取</a>
                                </span>
                                <input class="input" type="text" placeholder="Notion Database ID" bind:value={$notionStore.databaseId}/>
                            </label>
                            <div class="flex flex-wrap justify-end gap-2">
                                <button class="btn btn-secondary" on:click={() => setSyncToNotionAction()}>
                                    <i class="ri-github-line"></i>写入 GitHub Action
                                </button>
                                <button class="btn btn-primary" on:click={() => saveSetting()}>保存</button>
                            </div>
                        </div>
                    {/if}
                </section>
            {/if}

            <section class="card p-5">
                <h2 class="text-[15px] font-semibold text-ink">数据</h2>
                <p class="mt-1 mb-4 text-[13px] text-ink-3">把所有笔记和图片导出为一个备份文件, 或者从备份文件恢复。</p>
                <div class="flex flex-wrap gap-2">
                    <button class="btn btn-secondary" on:click={() => exportData()}>
                        <i class="ri-download-2-line"></i>导出备份
                    </button>
                    <button class="btn btn-secondary" on:click={() => importNeno()}>
                        <i class="ri-upload-2-line"></i>从备份导入
                    </button>
                    <input
                            type="file"
                            bind:this={importButtonUploadNode}
                            on:change={onImportFileSelected}
                            class="hidden"
                            accept=".txt"
                    />
                </div>
            </section>
        </div>
    </div>
</div>
