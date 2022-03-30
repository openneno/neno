<script>
    import {count, pin, pins, renameTag, tags} from "../request/fetchApi";
    import {
        countStore,
        currentPage,
        reload,
        searchNenoByDate,
        searchNenoByTag,
        settingStore,
        tagStore,
    } from "../store/store.js";
    import GreenMap from "../components/GreenMap.svelte";
    import TagExpand from "../components/TagExpand.svelte";

    import {onMount} from "svelte";
    import dayjs from "dayjs";

    let allTags = [];
    let pinTags = [];

    onMount(() => {
        countcount();
        getPins();
        reload.subscribe((value) => {
            if (value.tag && value.action === "nenoCount") {
                countcount();
                getPins();
            }
        });
    });

    function getTags() {
        tags()
            .then((respone) => {
                let tempTags = respone.body;
                $countStore.tagCount = tempTags.length;
                $tagStore.allTags = tempTags;
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

        let tagP = [];
        for (let tagIndex in splitAllTags) {
            const tagSplit = splitAllTags[tagIndex].split("/");
            let subtag = "";
            for (let i in tagSplit) {
                const simpletag = tagSplit[i];
                const s = subtag ? subtag + "/" + simpletag : simpletag;
                tagP[s] = {
                    showTag: simpletag,
                    tag: s,
                    parentTag: subtag,
                    children: [],
                };
                subtag = s;
            }
        }

        let subtag;
        let tree = [];
        for (let index in tagP)
            (subtag = tagP[index]).parentTag
                ? tagP[subtag.parentTag].children.push(subtag)
                : tree.push(subtag);

        return tree;
    }

    function getPins() {
        pins()
            .then((respone) => {
                pinTags = respone.body;
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
                return item !== tag;
            });
        } else {
            pinTags = pinTags.filter((item) => {
                return item.tag !== tag;
            });
            allTags = [...allTags, tag];
        }

        pin({ tag: tag })
            .then((respone) => {
            })
            .catch((reason) => {
                console.log(reason);
            });
    }

    function countcount(params) {
        count()
            .then((respone) => {
                let re = respone;
                $countStore.nenoCount = re.body.count;
                delete re.body.countDate._id;

                $countStore.countDate = re.body.countDate;
                let dayCount = 0;
                if (Object.keys($countStore.countDate).length >= 1) {
                    dayCount = dayjs().diff(
                        Object.keys($countStore.countDate)[0],
                        "day"
                    );
                }
                $countStore.dayCount = dayCount;
            })
            .catch((reason) => {
                console.log(reason);
            });
    }

    function renameName(detail) {
        renameTag({ oldTag: detail.oldTag, newTag: detail.newTag })
            .then((respone) => {
                getPins();
            })
            .catch((reason) => {
                console.log(reason);
            });
    }
    function changeDarkMode() {
        $settingStore.isDark = !$settingStore.isDark;
        if ($settingStore.isDark) {
            document.querySelector('meta[name="theme-color"]').setAttribute("content", "#000");
        }else {
            document.querySelector('meta[name="theme-color"]').setAttribute("content", "#f3f4f6");
        }
        window.localStorage.setItem(
            "settingStore",
            JSON.stringify($settingStore)
        );
    }
</script>

<div class="w-full flex flex-col overflow-auto   h-screen    overflow-visible">
    <div
        class="flex  items-center justify-between  text-gray-600 w-full p-4 font-bold dark:text-slate-300"
    >
        <div class="flex  items-center justify-between space-x-2">
            <div class="dark:text-slate-300">NENO</div>

            <a href="https://github.com/Mran/neno" target="_blank">
                <i class="ri-github-fill ri-xl "></i></a
            >
        </div>

        <div>
            {#if $settingStore.isDark}
                <i
                    class="ri-sun-line text-white"
                    on:click={() => {
                        changeDarkMode();
                    }}></i>
            {:else}
                <i
                    class="ri-moon-line"
                    on:click={() => {
                        changeDarkMode();
                    }}></i>
            {/if}

            <button
                class="focus:outline-none "
                on:click={() => {
                    $currentPage = "setting";
                }}
            >
                <i class="ri-settings-fill "></i>
            </button>
        </div>
    </div>
    <GreenMap

        countDate={$countStore.countDate}
        on:greenmapClick={(event) => {
            $searchNenoByDate.date = event.detail;
        }}
    />

    <div
        class="flex justify-around  w-full mt-4 text-gray-500dark:text-slate-300"
    >
        <div class="font-bold text-lg">
            <div class="text-xl">{$countStore.nenoCount}</div>
            NENO
        </div>
        <div class="font-bold text-lg">
            <div class="text-xl">{$countStore.tagCount}</div>
            TAGS
        </div>
        <div class="font-bold text-lg">
            <div class="text-xl">{$countStore.dayCount}</div>
            DAY
        </div>
    </div>
    <div
        class="flex flex-col items-start text-sm text-gray-600   dark:text-slate-200 w-full mt-2"
    >
        <button
            on:click={() => {
                $currentPage = "neno";
                $searchNenoByTag.tag = "";
            }}
            class="{'     w-full    flex  items-center justify-start  rounded-r  p-4 focus:outline-none hover:text-white hover:bg-green-400 ' +
                ($currentPage === 'neno' ? 'bg-green-500 text-white' : '')}      "
        >
            <i class="ri-quill-pen-fill mr-2"></i>NENO
        </button>

        <button
            on:click={() => {
                $currentPage = "daily";
            }}
            class="{'     w-full    flex  items-center justify-start  rounded-r  p-4 focus:outline-none hover:text-white hover:bg-green-400 ' +
                ($currentPage === 'daily' ? 'bg-green-500 text-white' : '')}        "
        >
            <i class="ri-calendar-event-fill mr-2"></i>每日回顾
        </button>
        <button
            on:click={() => {
                $currentPage = "luck";
            }}
            class="{'     w-full    flex  items-center justify-start  rounded-r  p-4 focus:outline-none hover:text-white hover:bg-green-400 ' +
                ($currentPage === 'luck' ? 'bg-green-500 text-white' : '')}        "
        >
            <i class="ri-bubble-chart-fill mr-2"></i>随机漫步
        </button>
    </div>

    {#if pinTags.length !== 0}
        <div class=" p-4 w-full text-sm text-yellow-500">置顶</div>

        {#each pinTags as { _id, tag }}
            <button
                class="rounded-r  group p-4 pt-2 pb-2  focus:outline-none w-full hover:text-white hover:bg-green-400 flex justify-between text-sm"
                class:bg-green-500={$searchNenoByTag.tag === tag}
                class:text-white={$searchNenoByTag.tag === tag}
                on:click={() => {
                    $searchNenoByTag.tag = tag;
                }}
            >
                <div class="flex">
                    <div class=""><i class="ri-hashtag"></i></div>
                    <div class="ml-1">
                        {tag.indexOf("#") === 0 ? tag.substring(1) : tag}
                    </div>
                </div>
                <button
                    class="focus:outline-none group-hover:opacity-100 opacity-0  pl-2 pr-2"
                    on:click={() => {
                        pinNeno(tag, false);
                    }}
                >
                    <i class="ri-pushpin-fill"></i>
                </button>
            </button>
        {/each}
    {/if}

    {#if allTags.length !== 0}
        <div class="  p-4 pt-2 pb-2 w-full text-sm text-blue-500">标签</div>

        {#each allTags as tag}
            <TagExpand
                {...tag}
                selectionTag={$searchNenoByTag.tag}
                on:selectTag={(event) => {
                    $searchNenoByTag.tag = event.detail;

                }}
                on:pinTag={(event) => {
                    pinNeno(event.detail, true);
                }}
                on:renameTag={(event) => {
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
