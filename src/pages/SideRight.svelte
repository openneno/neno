<script>
    import {onMount} from "svelte";
    import {fly} from "svelte/transition";
    import {searchNenoByTag, searchNenoByDate, reload, taskCountTag} from "../store/store.js";

    import QuillEditor from "../components/QuillEditor.svelte";
    import NenoItem from "../components/NenoItem.svelte";

    import {getAllNeno, search} from "../request/fetchApi";
    import ProgressLine from "../components/ProgressLine.svelte";
    import {showSlide} from "./SettingSlide.svelte";

    let flowClient;
    let innerHeight = 0;
    let flowClientTop = 0;
    let isLoding = false; //加载中状态
    let isLodingError = false; //加载错误
    let isEnd = false; //所有内容加载完毕
    let searchText = "";
    let changeTag = "";
    let page = 0;
    $: {
        if (flowClient !== undefined) {
            let flowClientBoundingClientRect = flowClient.getBoundingClientRect();
            flowClientTop = flowClientBoundingClientRect.top;
        }
    }

    let nenoItems = [];
    let searchItems = [];

    onMount(() => {
        load();
        searchNenoByDate.subscribe((value) => {
            console.log("searchNenoByDate", value);
            if (value.date === "refresh") {
                page = 0;
                nenoItems = []
                load();
            } else if (value.date !== "") {
                searchNeno("", value.date, "");
            }
        });
        searchNenoByTag.subscribe((value) => {
            console.log("searchNenoByTag", value);
            changeTag = value.tag.substring(1);

            if (value.tag !== "") {
                searchNeno("", "", value.tag);
            } else {
                searchItems = []
            }
        });
        reload.subscribe((value) => {
            if (value.tag && value.action === "neno") {
                page = 0;
                isEnd = false
                nenoItems = []
                load();
            }
        })
        flowClient.addEventListener("scroll", function () {
            if (
                flowClient.scrollTop ===
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
        getAllNeno({page: page})
            .then((respone) => {
                let re = respone;
                if (re.body.length === 0) {
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

    function searchNeno(searchText = "", searchDate = "", searchTag = "") {
        if (
            searchText.length !== 0 ||
            searchDate.length !== 0 ||
            searchTag.length !== 0
        ) {
            isLoding = true;
            search({
                content: searchText,
                created_at: searchDate,
                tag: searchTag,
            })
                .then(async (respone) => {
                    isLoding = false;
                    searchItems = respone.body;
                })

                .catch((reason) => {
                    console.log("reason", reason);
                    isLoding = false;
                });
        } else {
            searchItems = [];
            if (nenoItems.length === 0) {
                load();
            }
        }
    }
</script>

<svelte:window bind:innerHeight/>
<div class="  flex-1 flex flex-col justify-start  pt-4  w-0  overflow-visible">
    <div class="  flex flex-row items-center justify-between ">
        <div class="flex flex-row items-center pl-4 ">
            {#if changeTag === ""}
                <div class="font-bold dark:text-slate-300">NENO</div>
                <button
                        class="focus:outline-none text-gray-600   sm:hidden md:hidden ml-2"
                        on:click={() => {
                        showSlide();
                    }}
                >
                    <i class="ri-function-fill dark:text-slate-300"></i>
                </button>
            {:else}
                <div
                        class="flex font-bold items-center border-gray-300 border-2 border-solid rounded-lg pl-1 pr-1"
                >
                    <div class="mr-1 pt-1"><i class="ri-hashtag dark:text-slate-300 "></i></div>
                    <div class="font-bold w-auto mr-2 dark:text-slate-300" type="text">
                        {changeTag}
                    </div>
                    <button class="focus:outline-none ">
                        <i
                                class="ri-close-circle-fill text-gray-400"
                                on:click={() => {
                                $searchNenoByTag.tag = "";
                            }}></i>
                    </button>
                </div>
            {/if}
            {#if changeTag === ""}

            {/if}

            <div
                    class="flex dark:text-slate-300"
                    class:hidden={$taskCountTag.all===0}

            >
                <svg class="animate-spin mx-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20"
                     height="20">
                    <path fill="none" d="M0 0h24v24H0z"/>
                    <path d="M5.463 4.433A9.961 9.961 0 0 1 12 2c5.523 0 10 4.477 10 10 0 2.136-.67 4.116-1.81 5.74L17 12h3A8 8 0 0 0 6.46 6.228l-.997-1.795zm13.074 15.134A9.961 9.961 0 0 1 12 22C6.477 22 2 17.523 2 12c0-2.136.67-4.116 1.81-5.74L7 12H4a8 8 0 0 0 13.54 5.772l.997 1.795z"/>
                </svg>
                <div>
                    {$taskCountTag.done}/{$taskCountTag.all}
                </div>
            </div>
        </div>

        <div
                class="bg-gray-200 rounded-lg h-8 p-2 flex items-center flex-shrink-0"
        >
            <i class="ri-search-2-line text-gray-400"></i>
            <input
                    class=" ml-2 bg-gray-200 focus:outline-none text-sm"
                    type="text"
                    on:keydown={(event) => {
                    if (event.code === "Enter") {
                        searchNeno(searchText, "");
                    }
                }}
                    bind:value={searchText}
            />
            <i
                    class="ri-close-circle-fill text-gray-400"
                    on:click={() => {
                    searchText = "";
                    searchItems = [];
                }}></i>
        </div>
    </div>

    <div class="p-2 ">
        <QuillEditor
                on:update={(event) => {
                nenoItems = [event.detail, ...nenoItems];
            }}
        />
    </div>
    {#if isLoding}
        <div transition:fly={{ y: -20, duration: 1000 }} class="w-full ">
            <ProgressLine/>
        </div>
    {/if}
    {#if isLodingError}
        <div class="w-full pl-4 pr-4">
            <button
                    class=" w-full rounded focus:outline-none m-aut bg-red-400  text-white  p-2  "
                    on:click={() => {
                    load();
                }}>重新获取
            </button
            >
        </div>
    {/if}
    <div
            bind:this={flowClient}
            class="flex flex-col overflow-y-scroll p-2  overflow-visible "
            style="height:{innerHeight - flowClientTop}px"
    >
        {#if searchItems.length === 0}
            {#each nenoItems as item (item.created_at)}
                <NenoItem
                        {...item}
                        on:deleteOne={(event) => {
                        nenoItems = nenoItems.filter((item) => {
                            return item._id !== event.detail._id;
                        });
                    }}
                />
            {/each}
        {:else}
            {#each searchItems as item (item.created_at)}
                <NenoItem
                        {...item}
                        searchContent={searchText}
                        on:deleteOne={(event) => {
                        nenoItems = nenoItems.filter((item) => {
                            return item._id !== event.detail._id;
                        });
                    }}
                />
            {/each}
        {/if}
    </div>
</div>
