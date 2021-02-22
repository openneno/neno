<script>
    import { tags, pin, pins, count } from "../request/fetchApi";
    import {
        pagedd,
        countStrore,
        tagStrore,
        searchNenoByDate,
        searchNenoByTag,
    } from "../store/store.js";
    import GreenMap from "./GreenMap.svelte";
    import TagExpand from "./TagExpand.svelte";

    import { onMount } from "svelte";
    import dayjs from "dayjs";

    let allTags = [];
    let pinTags = [];

    onMount(() => {
        countcount();
        getPins();
    });

    function getTags() {
        tags()
            .then(async (respone) => {
                let re = await respone.json();
                let tempTags = re.body;
                $countStrore.tagCount = tempTags.length;
                $tagStrore.allTags = tempTags;

                // pinTags.forEach((item) => {
                //     let index = tempTags.indexOf(item.tag);
                //     if (index != -1) {
                //         tempTags.splice(index, 1);
                //     }
                // });
                // allTags = tempTags;
                allTags = filterTag(tempTags);
            })
            .catch((reason) => {
                console.log(reason);
            });
    }
    function filterTag(allTags) {
        allTags = allTags.sort((a, b) => {
            return a.length - b.length;
        });
        var filterSet = new Set();
        let end = allTags.length - 1;
        for (let index = 0; index < end; index++) {
            let element = allTags[index];
            var leftTags = allTags.slice(index + 1);
            // console.log("leftTags", element, leftTags);
            let lIndex = 0;
            var left = "";
            for (; lIndex < leftTags.length; lIndex++) {
                left = leftTags[lIndex];
                if (left.indexOf(element + "/") == 0) {
                    element = left;
                }
            }
            filterSet.add(element);
        }

        return Array.from(filterSet);
    }

    function getPins() {
        pins()
            .then(async (respone) => {
                let re = await respone.json();
                pinTags = re.body;
                getTags();
            })
            .catch((reason) => {
                console.log(reason);
            });
    }
    function pinNeno(tag, isPin) {
        if (isPin) {
            pinTags = [...pinTags, { _id: "", tag: tag }];
            allTags = allTags.filter((item) => {
                return item != tag;
            });
        } else {
            pinTags = pinTags.filter((item) => {
                return item.tag != tag;
            });
            allTags = [...allTags, tag];
        }

        pin({ tag: tag })
            .then(async (respone) => {
                let re = await respone.json();
            })
            .catch((reason) => {
                console.log(reason);
            });
    }
    function countcount(params) {
        count()
            .then(async (respone) => {
                let re = await respone.json();
                $countStrore.nenoCount = re.body.count;
                delete re.body.countDate._id;

                $countStrore.countDate = re.body.countDate;
                let dayCount = 0;
                if (Object.keys($countStrore.countDate).length >= 1) {
                    dayCount = dayjs().diff(
                        Object.keys($countStrore.countDate)[0],
                        "day"
                    );
                }
                $countStrore.dayCount = dayCount;
            })
            .catch((reason) => {
                console.log(reason);
            });
    }
</script>

<div class="w-full flex flex-col overflow-auto h-screen">
    <div
        class="flex  items-center justify-between  text-gray-600 w-full p-4 font-bold"
    >
        <div class="flex  items-center justify-between">
            NENONEN
            <div
                class="text-sm rounded-sm bg-red-300 text-white p-1 pt-0 pb-0 "
            >
                FREE
            </div>
        </div>
        <button
            class="focus:outline-none"
            on:click={() => {
                $pagedd = "setting";
            }}
        >
            <i class="ri-settings-fill" />
        </button>
    </div>
    <GreenMap
        countDate={$countStrore.countDate}
        on:greenmapClick={(event) => {
            $searchNenoByDate.date = event.detail;
        }}
    />

    <div class="flex justify-around  w-full mt-4 text-gray-500">
        <div class="font-bold text-lg">
            <div class="text-xl">{$countStrore.nenoCount}</div>
            NENO
        </div>
        <div class="font-bold text-lg">
            <div class="text-xl">{$countStrore.tagCount}</div>
            TAGS
        </div>
        <div class="font-bold text-lg">
            <div class="text-xl">{$countStrore.dayCount}</div>
            DAY
        </div>
    </div>
    <div class="flex flex-col items-start text-sm text-gray-600 w-full mt-2">
        <button
            on:click={() => {
                $pagedd = "neno";
                $searchNenoByTag.tag = "";
            }}
            class="{'     w-full    flex  items-center justify-start  rounded-r  p-4 focus:outline-none hover:text-white hover:bg-green-400 ' +
                ($pagedd == 'neno' ? 'bg-green-500 text-white' : '')}        "
        >
            <i class="ri-quill-pen-fill mr-2" />NENO</button
        >

        <button
            on:click={() => {
                $pagedd = "daily";
            }}
            class="{'     w-full    flex  items-center justify-start  rounded-r  p-4 focus:outline-none hover:text-white hover:bg-green-400 ' +
                ($pagedd == 'daily' ? 'bg-green-500 text-white' : '')}        "
        >
            <i class="ri-calendar-event-fill mr-2" />每日回顾</button
        >
        <button
            on:click={() => {
                $pagedd = "luck";
            }}
            class="{'     w-full    flex  items-center justify-start  rounded-r  p-4 focus:outline-none hover:text-white hover:bg-green-400 ' +
                ($pagedd == 'luck' ? 'bg-green-500 text-white' : '')}        "
        >
            <i class="ri-bubble-chart-fill mr-2" />随机漫步</button
        >
    </div>

    {#if pinTags.length != 0}
        <div class=" p-4 w-full text-sm text-yellow-500">置顶</div>

        {#each pinTags as { _id, tag }}
            <button
                class="rounded-r  group p-4 pt-2 pb-2  focus:outline-none w-full hover:text-white hover:bg-green-400 flex justify-between text-sm"
                class:bg-green-500={$searchNenoByTag.tag == tag}
                class:text-white={$searchNenoByTag.tag == tag}
                on:click={() => {
                    $searchNenoByTag.tag = tag;
                }}
            >
                {tag}
                <button
                    class="focus:outline-none group-hover:opacity-100 opacity-0  pl-2 pr-2"
                    on:click={() => {
                        pinNeno(tag, false);
                    }}
                >
                    <i class="ri-pushpin-fill" />
                </button>
            </button>
        {/each}
    {/if}

    {#if allTags.length != 0}
        <div class="  p-4 pt-2 pb-2 w-full text-sm text-blue-500">标签</div>

        {#each allTags as tag}
            <TagExpand
                {tag}
                selectionTag={$searchNenoByTag.tag}
                on:selectTag={(event) => {
                    $searchNenoByTag.tag = event.detail;
                    console.log("topselectTag", event.detail);
                }}
                on:pinTag={(event) => {
                    pinNeno(event.detail, true);
                    console.log("toppinTag", event.detail);
                }}
            />
        {/each}
    {/if}
</div>

<style >
    
    ::-webkit-scrollbar {
        width: 0 !important;
    }
</style>
