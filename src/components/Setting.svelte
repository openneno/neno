<script>
    import { onMount } from "svelte";

    import {
        exportIndexedDBToFile,
        imporFileTotIndexedDB,
    } from "../request/fetchApi";
    import { settingStrore, githubStrore } from "../store/store.js";
    import { pagedd } from "../store/store.js";

    let platform = $settingStrore.platform;
    let imgDomain = $settingStrore.imgDomain;
    let domain = $settingStrore.domain;
    let useMode = $settingStrore.useMode;
    let repoName = $githubStrore.repoName;
    let branch = $githubStrore.branch;

    let done = "";
    let importFile = "";
    let uploadNode = "";

    onMount(() => {
        console.log(useMode);
    });
    $: {
        console.log(importFile);
        // await importIndexedDB();
        if (importFile != "") {
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
    function saveSetting() {
        $settingStrore.imgDomain = imgDomain;
        $settingStrore.platform = platform;
        $settingStrore.domain = domain;
        $settingStrore.useMode = useMode;
        $githubStrore.repoName = repoName;
        $settingStrore.branch = branch;

        console.log($settingStrore);
        window.localStorage.setItem(
            "settingStrore",
            JSON.stringify($settingStrore)
        );
        window.localStorage.setItem(
            "githubStrore",
            JSON.stringify($githubStrore)
        );
        window.location.reload();
    }
    async function exportData() {
        let alldata = await exportIndexedDBToFile();
        let stringAllData = JSON.stringify(alldata);
        console.log(stringAllData);
        var blob = new Blob([stringAllData], { type: "application/json" });
        var objectURL = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectURL;
        link.download = "nenodata.txt";
        link.click();
        window.URL.revokeObjectURL(link.href);
    }
    async function importNeno(params) {
        uploadNode.click();
    }
    function clearGithubSetting() {
        $githubStrore.githubName = "";
        $githubStrore.repoName = "";
        $githubStrore.access_token = "";
        $githubStrore.refresh_token = "";
        $githubStrore.refresh_token_expires_in = 0;
        window.localStorage.setItem(
            "githubStrore",
            JSON.stringify($githubStrore)
        );
        window.location.reload();
    }
</script>

<div class="  flex-1 flex flex-col justify-start  pt-4 pl-4 ">
    <div class="font-bold text-lg flex  justify-start  items-center">
        <button
            class="focus:outline-none text-gray-600   sm:hidden md:hidden mr-4"
            on:click={() => {
                $pagedd = "neno";
            }}
        >
            <i class="ri-arrow-left-line" />
        </button>设置
    </div>
    <div class="m-4">
        <label for="">使用方式</label>
        <div class="flex items-center space-x-4 p-2 mt-4">
            <label>
                <input type="radio" bind:group={useMode} value={"自部署模式"} />
                自部署模式
            </label>
            <label>
                <input type="radio" bind:group={useMode} value={"github"} />
                本地模式+github同步
            </label>
        </div>
    </div>

    {#if useMode != "github"}
        <!-- content here -->

        <div class="m-4 flex flex-col">
            <label for="">图库平台</label>
            <select class="p-2 mt-4" bind:value={platform}>
                <!-- <option value="华为云"> 华为云 </option> -->
                <option class="p-2" value="七牛云">七牛云</option>
            </select>
        </div>
        <div class="m-4">
            <label for="">图库域名</label>
            <input
                type="text"
                bind:value={imgDomain}
                class="w-full border-2  mt-4 outline-white p-2"
                placeholder="填写你的在七牛云绑定的域名 (这个是我的http://img.neno.topmini.top)"
            />
        </div>
    {:else}
        <div>
            <div class="m-4 flex flex-col">
                {#if $githubStrore.githubName}
                    <div class="mb-4">
                        <div class="flex items-center ml-4">
                            <button
                                class="border-2   w-full  text-center  outline-white p-2 hover:bg-green-500 hover:text-white focus:outline-white"
                                on:click={() => {
                                    clearGithubSetting();
                                }}
                            >
                                {$githubStrore.githubName}
                                登出</button
                            >
                        </div>
                        <div class="m-4">
                            <label for="">仓库设置</label>
                            <input
                                type="text"
                                bind:value={repoName}
                                class="w-full border-2  mt-4 outline-white p-2"
                                placeholder="仓库名"
                            />
                            <!-- <input
                                type="text"
                                bind:value={branch}
                                class="w-full border-2  mt-4 outline-white p-2"
                                placeholder="分支"
                            /> -->
                        </div>
                        <div class="m-4">
                            <label for="">导入/导出离线数据</label>
                            <div class="flex items-center space-x-4">
                                <button
                                    class="w-full border-2  mt-4 outline-white p-2"
                                    on:click={() => {
                                        importNeno();
                                    }}>导入</button
                                >
                                <input
                                    type="file"
                                    bind:this={uploadNode}
                                    bind:files={importFile}
                                    style="display:none"
                                    accept=".txt"
                                    class="w-full border-2  mt-4 outline-white p-2"
                                />
                                <button
                                    class="w-full border-2  mt-4 outline-white p-2"
                                    on:click={() => {
                                        exportData();
                                    }}>导出</button
                                >
                            </div>
                        </div>
                    </div>
                {:else}
                    <a
                        class=" border-2  mb-4 text-center  outline-white p-2 hover:bg-green-500 hover:text-white focus:outline-white"
                        href={`https://github.com/login/oauth/authorize?response_type=code&client_id=Iv1.a9367867a9a251d8`}
                    >
                        使用github账号登录
                    </a>
                {/if}
            </div>
        </div>
    {/if}
    <div class="m-4">
        <button
            on:click={() => {
                saveSetting();
            }}
            class="w-full border-2   outline-white p-2 hover:bg-green-500 hover:text-white focus:outline-white"
        >
            保存设置{done}
        </button>
    </div>
</div>
