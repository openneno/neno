<script>
    import { tags, pin, pins, count, rename } from "../request/fetchApi";
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
            .then((respone) => {
                let re = respone;
                console.log(re);
                let tempTags = re.body;
                $countStrore.tagCount = tempTags.length;
                $tagStrore.allTags = tempTags;

                allTags = filterTagtree(tempTags);
            })
            .catch((reason) => {
                console.log(reason);
            });
    }
    function filterTagtree(allTags) {
        let splitAllTags = [];

        allTags.forEach((element) => {
            splitAllTags = [...splitAllTags, element];
        });

        console.log(splitAllTags);
        var tagP = [];
        for (var tagIndex in splitAllTags) {
            var tagSplit = splitAllTags[tagIndex].split("/");
            var subtag = "";
            for (var i in tagSplit) {
                var simpletag = tagSplit[i];
                var s = subtag ? subtag + "/" + simpletag : simpletag;
                tagP[s] = {
                    showTag: simpletag,
                    tag: s,
                    parentTag: subtag,
                    children: [],
                };
                subtag = s;
            }
        }
        console.log("tagP", tagP);

        var subtag;
        var c = [];
        for (var index in tagP)
            (subtag = tagP[index]).parentTag
                ? tagP[subtag.parentTag].children.push(subtag)
                : c.push(subtag);
        console.log("pMap", c);

        return c;
    }

    function getPins() {
        pins()
            .then((respone) => {
                console.log(respone);
                let re = respone;
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
            .then((respone) => {
                let re = respone;
                console.log(re);
            })
            .catch((reason) => {
                console.log(reason);
            });
    }
    function countcount(params) {
        count()
            .then((respone) => {
                let re = respone;
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
    function renameName(detail) {
        rename({ oldTag: detail.oldTag, newTag: detail.newTag })
            .then((respone) => {
                getPins();
            })
            .catch((reason) => {
                console.log(reason);
            });
    }
</script>

<div class="w-full flex flex-col overflow-auto  overflow-visible h-screen">
    <div
        class="flex  items-center justify-between  text-gray-600 w-full p-4 font-bold"
    >
        <div class="flex  items-center justify-between space-x-2">
            <div>NENO</div>

            <a href="https://github.com/Mran/neno" target="_blank">
                <i class="ri-github-fill ri-xl" /></a
            >
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
                <div class="flex">
                    <div class=""><i class="ri-hashtag" /></div>
                    <div class="ml-1">
                        {tag.indexOf("#") == 0 ? tag.substring(1) : tag}
                    </div>
                </div>
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
                {...tag}
                selectionTag={$searchNenoByTag.tag}
                on:selectTag={(event) => {
                    $searchNenoByTag.tag = event.detail;
                    console.log("topselectTag", event.detail);
                }}
                on:pinTag={(event) => {
                    pinNeno(event.detail, true);
                    console.log("toppinTag", event.detail);
                }}
                on:renameTag={(event) => {
                    console.log("toppinTag", event.detail);
                    renameName(event.detail);
                }}
            />
        {/each}
    {/if}
</div>

<style>
    ::-webkit-scrollbar {
        width: 0 !important;
    }
</style>
