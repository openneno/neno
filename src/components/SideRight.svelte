<script>
    import {onMount} from "svelte";
    import {fly} from "svelte/transition";
    import {searchNenoByTag, searchNenoByDate, reload} from "../store/store.js";

    import QuillEditor from "./QuillEditor.svelte";
    import FmoloItem from "./FmoloItem.svelte";

    import {getAllFmolo, search} from "../request/fetchApi";
    import ProgressLine from "./ProgressLine.svelte";
    import {showSlide} from "./SettingSlide.svelte";
    import {log} from "util";

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
        if (flowClient != undefined) {
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
            if (value.date == "refresh") {
                page = 0;
                nenoItems = []
                load();
            } else if (value.date != "") {
                searchNeno("", value.date, "");
            }
        });
        searchNenoByTag.subscribe((value) => {
            console.log("searchNenoByTag", value);
            changeTag = value.tag.substring(1);

            if (value.tag != "") {
                searchNeno("", "", value.tag);
            } else {
                searchItems = []
            }
        });
        reload.subscribe((value) => {
            if (value.tag && value.action == "neno") {
                page = 0;
                isEnd = false
                nenoItems = []
                load();
            }
        })
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
        getAllFmolo({page: page})
            .then((respone) => {
                let re = respone;
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

    function searchNeno(searchText = "", searchDate = "", searchTag = "") {
        if (
            searchText.length != 0 ||
            searchDate.length != 0 ||
            searchTag.length != 0
        ) {
            isLoding = true;
            search({
                content: searchText,
                created_at: searchDate,
                tag: searchTag,
            })
                .then(async (respone) => {
                    let re = respone;
                    isLoding = false;
                    searchItems = re.body;
                })

                .catch((reason) => {
                    console.log("reason", reason);
                    isLoding = false;
                });
        } else {
            searchItems = [];
            if (nenoItems.length == 0) {
                load();
            }
        }
    }
</script>

<svelte:window bind:innerHeight/>
<div class="  flex-1 flex flex-col justify-start  pt-4  w-0">
    <div class="  flex flex-row items-center justify-between ">
        <div class="flex flex-row items-center pl-4 ">
            {#if changeTag == ""}
                <div class="font-bold">NENO</div>
            {:else}
                <div
                        class="flex font-bold items-center border-gray-300 border-2 border-solid rounded-lg pl-1 pr-1"
                >
                    <div class="mr-1 pt-1"><i class="ri-hashtag"/></div>
                    <div class="font-bold w-auto mr-2" type="text">
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
            {#if changeTag == ""}
                <button
                        class="focus:outline-none text-gray-600   sm:hidden md:hidden ml-2"
                        on:click={() => {
                        showSlide();
                    }}
                >
                    <i class="ri-function-fill"/>
                </button>
            {/if}
        </div>

        <div
                class="bg-gray-200 rounded-lg h-8 p-2 flex items-center flex-shrink-0"
        >
            <i class="ri-search-2-line text-gray-400"/>
            <input
                    class=" ml-2 bg-gray-200 focus:outline-none text-sm"
                    type="text"
                    on:keydown={(event) => {
                    if (event.code == "Enter") {
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
                }}
            />
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
            class="flex flex-col overflow-y-scroll p-2 "
            style="height:{innerHeight - flowClientTop}px"
    >
        {#if searchItems.length == 0}
            {#each nenoItems as item (item._id)}
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
            {#each searchItems as item (item._id)}
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
