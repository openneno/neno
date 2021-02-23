<script>
    import { onMount } from "svelte";

    import { setting } from "../request/fetchApi";
    import { settingStrore } from "../store/store.js";
    import { pagedd } from "../store/store.js";

    let platform = $settingStrore.platform;
    let imgDomain = $settingStrore.imgDomain;
    let domain = $settingStrore.domain;
    let done = "";

    onMount(() => {
        setting()
            .then(async (respone) => {
                let re = await respone.json();
                if (Object.keys(re.body).length == 0) {
                    console.log($settingStrore);
                    setting($settingStrore).then(async (respone) => {});
                } else {
                    $settingStrore = re.body;
                }
            })
            .catch((reason) => {
                console.log(reason);
            });
    });
    function saveSetting() {
        $settingStrore.imgDomain = imgDomain;
        $settingStrore.platform = platform;
        $settingStrore.domain = domain;

        window.localStorage.setItem("domain", domain);
        window.location.reload();
        setting($settingStrore)
            .then(async (respone) => {
                done = "成功";
                setTimeout(() => {
                    done = "";
                }, 1500);
            })
            .catch((reason) => {
                console.log(reason);
            });
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
        <label for="">API域名</label>
        <input
            type="text"
            bind:value={domain}
            class="w-full border-2  mt-4 outline-white p-2"
            placeholder="http://api.neno.topmini.top"
        />
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
