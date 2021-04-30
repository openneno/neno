<script>
    import {onMount} from "svelte";

    import {
        exportIndexedDBToFile,
        imporFileTotIndexedDB,
    } from "../request/fetchApi";
    import {loginWithGithub} from "../request/githubApi";

    import {pagedd, settingStore, githubStore} from "../store/store.js";

    let platform = $settingStore.platform;
    let imgDomain = $settingStore.imgDomain;
    let domain = $settingStore.domain;
    let useMode = $settingStore.useMode;
    let access_token = $githubStore.access_token;

    let repoName = $githubStore.repoName;
    let branch = $githubStore.branch;

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
        $settingStore.imgDomain = imgDomain;
        $settingStore.platform = platform;
        $settingStore.domain = domain;
        $settingStore.useMode = useMode;
        $githubStore.repoName = repoName;

        console.log($settingStore);
        window.localStorage.setItem(
            "settingStore",
            JSON.stringify($settingStore)
        );
        window.localStorage.setItem(
            "githubStore",
            JSON.stringify($githubStore)
        );
        window.location.reload();
    }

    async function exportData() {
        let alldata = await exportIndexedDBToFile();
        let stringAllData = JSON.stringify(alldata);
        console.log(stringAllData);
        var blob = new Blob([stringAllData], {type: "application/json"});
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
        $githubStore.githubName = "";
        $githubStore.repoName = "";
        $githubStore.access_token = "";
        $githubStore.refresh_token = "";
        $githubStore.refresh_token_expires_in = 0;
        window.localStorage.setItem(
            "githubStore",
            JSON.stringify($githubStore)
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
            <i class="ri-arrow-left-line"/>
        </button>
        设置
    </div>
    <div class="m-4">
        <label for="">使用方式</label>
        <div class="flex items-center space-x-4 p-2 mt-4">
            <label>
                <input type="radio" bind:group={useMode} value={"自部署模式"}/>
                自部署模式
            </label>
            <label>
                <input type="radio" bind:group={useMode} value={"github"}/>
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
                <div class="mb-4">
                    <div class="m-4">
                        <label htmlFor="">用户Github Token<a class="text-sm ml-4"
                                                           href="https://github.com/settings/tokens" target="_blank">(如何获取)</a></label>
                        <div>
                            {$githubStore.githubName == "" ? "输入Github Token获取github用户名" : $githubStore.githubName}

                        </div>
                        <div class="flex justify-between">
                            <input
                                    type="text"
                                    bind:value={access_token}
                                    class=" w-8/12 border-2  mt-4 outline-white p-2"
                                    placeholder="用户Token"
                            />
                            <button class=" border-2  mt-4 outline-white p-2" on:click={
async ()=>{
                            if (access_token.length!=40){

                            }else {
                                var response=await loginWithGithub({access_token:access_token})
                                if(response.code!=401){
                                    githubStore.set({githubName: response.body.login,access_token: access_token,
                                    lastCommitSha:""})

                                }else {
                                  githubStore.set({githubName: "",access_token: "",
                                    lastCommitSha:""})

                                }
                            }
                        }
                        }>

                                点击获取github用户名
                            </button>
                        </div>

                    </div>
                    <div class="m-4">
                        <label htmlFor="">仓库设置</label>
                        <input
                                type="text"
                                bind:value={repoName}
                                class="w-full border-2  mt-4 outline-white p-2"
                                placeholder="仓库名"
                        />

                    </div>
                    <div class="m-4">
                        <label htmlFor="">导入/导出离线数据</label>
                        <div class="flex items-center space-x-4">
                            <button
                                    class="w-full border-2  mt-4 outline-white p-2"
                                    on:click={() => {
                                        importNeno();
                                    }}>导入
                            </button
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
                                    }}>导出
                            </button
                            >
                        </div>
                    </div>
                </div>
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
