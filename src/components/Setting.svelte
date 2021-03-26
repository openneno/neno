<script>
    import { onMount } from "svelte";

    import { exportIndexedDB, importIndexedDB } from "../request/fetchApi";
    import { settingStrore } from "../store/store.js";
    import { pagedd } from "../store/store.js";

    let platform = $settingStrore.platform;
    let imgDomain = $settingStrore.imgDomain;
    let domain = $settingStrore.domain;
    let model = $settingStrore.offlineModel;

    let done = "";
    let importFile = "";
    let uploadNode = "";

    onMount(() => {
        console.log(model);
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
                await importIndexedDB(alldata.body);
                // window.location.reload();
            };
        }
    }
    function saveSetting() {
        $settingStrore.imgDomain = imgDomain;
        $settingStrore.platform = platform;
        $settingStrore.domain = domain;
        $settingStrore.offlineModel = model;
        console.log($settingStrore);
        window.localStorage.setItem(
            "settingStrore",
            JSON.stringify($settingStrore)
        );
        window.location.reload();
    }
    async function exportData() {
        let alldata = await exportIndexedDB();
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
        <label for="">离线模式</label>
        <div class="flex items-center space-x-4 p-2 mt-4">
            <input
                type="checkbox"
                bind:checked={model}
                placeholder="使用离线模式"
            />
            <div>使用离线模式</div>
        </div>
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

    <div class="m-4">
        <button
            on:click={() => {
                saveSetting();
            }}
            class="w-full border-2   outline-white p-2 hover:bg-green-500 hover:text-white focus:outline-white"
        >
            保存{done}
        </button>
    </div>
</div>
