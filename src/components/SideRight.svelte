<script>
    import QuillEditor from "./QuillEditor.svelte";
    import FmoloItem from "./FmoloItem.svelte";
    import { onMount } from "svelte";
    import { getAllFmolo, search } from "../request/fetchApi";
    import ProgressLine from "./ProgressLine.svelte";
    import { fly } from "svelte/transition";
    import { pagedd } from "../store/store.js";

    let flowClient;
    let innerHeight = 0;
    let flowClientTop = 0;
    let isLoding = false; //加载中状态
    let isLodingError = false; //加载错误
    let isEnd = false; //所有内容加载完毕
    let searchText = "";
    let page = 0;
    $: {
        if (flowClient != undefined) {
            let flowClientBoundingClientRect = flowClient.getBoundingClientRect();
            flowClientTop = flowClientBoundingClientRect.top;
        }
    }

    let nenoItems = [];
    let searchItems = [];

    onMount(() => {
        load();
        flowClient.addEventListener("scroll", function () {
            if (
                flowClient.scrollTop ==
                    flowClient.scrollHeight - flowClient.clientHeight &&
                !isLoding &&
                !isEnd
            ) {
                page += 1;
                load();
            }
        });
    });
    function load() {
        isLoding = true;
        isLodingError = false;
        getAllFmolo({ page: page })
            .then(function (response) {
                if (response.ok) {
                    return response;
                }
                throw new Error("Network response was not ok.");
            })
            .then(async (respone) => {
                let re = await respone.json();
                if (re.body.length == 0) {
                    isEnd = true;
                }
                re.body.forEach((element) => {
                    nenoItems = [...nenoItems, element];
                });
                isLoding = false;
            })
            .catch((reason) => {
                console.log("reason", reason);
                isLodingError = true;
                isLoding = false;
            });
    }
    function searchNeno() {
        if (searchText.length != 0) {
            isLoding = true;
            search({ content: searchText })
                .then(function (response) {
                    if (response.ok) {
                        return response;
                    }
                    throw new Error("Network response was not ok.");
                })
                .then(async (respone) => {
                    let re = await respone.json();
                    isLoding = false;

                    re.body.forEach((element) => {
                        searchItems = [...searchItems, element];
                    });
                })
                .catch((reason) => {
                    console.log("reason", reason);
                    isLoding = false;
                });
        } else {
            searchItems = [];
        }
    }
</script>

<svelte:window bind:innerHeight />
<div class="  flex-1 flex flex-col justify-start  pt-4 pl-4 ">
    <div class="  flex flex-row items-center justify-between pr-4">
        <div class="flex flex-row items-center ">
            NENO <button
                class="focus:outline-none text-gray-600   sm:hidden md:hidden ml-2"
                on:click={() => {
                    $pagedd = "setting";
                }}
            >
                <i class="ri-settings-fill" />
            </button>
        </div>

        <div class="bg-gray-200 rounded-lg h-8 p-2 flex items-center">
            <i class="ri-search-2-line text-gray-400" />
            <input
                class=" ml-2 bg-gray-200 focus:outline-none text-sm"
                type="text"
                on:keydown={(event) => {
                    if (event.code == "Enter") {
                        searchNeno();
                    }
                }}
                bind:value={searchText}
            />
            <i
                class="ri-close-circle-fill text-gray-400"
                on:click={() => {
                    searchText = "";
                    searchItems = [];
                }}
            />
        </div>
    </div>
    <div class="p-4">
        <QuillEditor
            on:update={(event) => {
                nenoItems = [event.detail, ...nenoItems];
            }}
        />
    </div>
    {#if isLoding}
        <div transition:fly={{ y: -20, duration: 1000 }} class="w-full ">
            <ProgressLine />
        </div>
    {/if}
    {#if isLodingError}
        <div class="w-full pl-4 pr-4">
            <button
                class=" w-full rounded focus:outline-none m-aut bg-red-400  text-white  p-2  "
                on:click={() => {
                    load();
                }}>重新获取</button
            >
        </div>
    {/if}
    <div
        bind:this={flowClient}
        class="flex flex-col overflow-y-scroll p-4 "
        style="height:{innerHeight - flowClientTop}px"
    >
        {#if searchItems.length == 0}
            {#each nenoItems as item, index (item._id)}
                <FmoloItem
                    {...item}
                    on:deleteOne={(event) => {
                        nenoItems = nenoItems.filter((item) => {
                            return item._id != event.detail._id;
                        });
                    }}
                />
            {/each}
        {:else}
            {#each searchItems as item, index (item._id)}
                <FmoloItem
                    {...item}
                    searchContent={searchText}
                    on:deleteOne={(event) => {
                        nenoItems = nenoItems.filter((item) => {
                            return item._id != event.detail._id;
                        });
                    }}
                />
            {/each}
        {/if}
    </div>
</div>

<style type="text/postcss">
</style>
