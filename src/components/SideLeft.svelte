<script>
    import { tags, pin, pins, count } from "../request/fetchApi";
    import { pagedd } from "../store/store.js";
    import GreenMap from "./GreenMap.svelte";

    import { onMount } from "svelte";
    import dayjs from "dayjs";

    let dayCount = 0;
    let nenoCount = 0;
    let countDate = 0;

    let allTags = [];
    let pinTags = [];
    let checkedIndex = $pagedd;

    onMount(() => {
        countcount();
        getPins();
    });

    function getTags() {
        tags()
            .then(async (respone) => {
                let re = await respone.json();
                let tempTags = re.body;
                pinTags.forEach((item) => {
                    let index = tempTags.indexOf(item.tag);
                    if (index != -1) {
                        tempTags.splice(index, 1);
                    }
                });
                allTags = tempTags;
            })
            .catch((reason) => {
                console.log(reason);
            });
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
                nenoCount = re.body.count;
                delete re.body.countDate._id;

                let a = {};
                for (const key in re.body.countDate) {
                    if (Object.hasOwnProperty.call(re.body.countDate, key)) {
                        const element = re.body.countDate[key];
                        console.log("element", key, element);
                        a["" + key] = element;
                    }
                }
                countDate = re.body.countDate;
                if (Object.keys(countDate).length < 1) {
                    dayCount = 0;
                } else {
                    dayCount = dayjs().diff(Object.keys(countDate)[0], "day");
                }
            })
            .catch((reason) => {
                console.log(reason);
            });
    }
</script>

<div class="hidden  sm:flex md:flex flex-col items-start" style="width:240px">
    <div
        class="flex  items-center justify-between  text-gray-600 w-full p-4 font-bold"
    >
        <div class="flex  items-center justify-between">
            FMOLOER
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
                checkedIndex = "setting";
            }}
        >
            <i class="ri-settings-fill" />
        </button>
    </div>
    <GreenMap {countDate} countDatalength={123} />

    <div class="flex justify-around  w-full mt-4 text-gray-500">
        <div class="font-bold text-lg">
            <div class="text-xl">{nenoCount}</div>
            NENO
        </div>
        <div class="font-bold text-lg">
            <div class="text-xl">{allTags.length}</div>
            TAGS
        </div>
        <div class="font-bold text-lg">
            <div class="text-xl">{dayCount}</div>
            DAY
        </div>
    </div>
    <div class="flex flex-col items-start text-sm text-gray-600 w-full mt-2">
        <button
            on:click={() => {
                $pagedd = "neno";
                checkedIndex = "neno";
            }}
            class="{'    bu-op hover:text-white hover:bg-green-400 ' +
                (checkedIndex == 'neno'
                    ? 'bg-green-500 text-white'
                    : '')}        "
        >
            <i class="ri-quill-pen-fill mr-2" />NENO</button
        >

        <button
            on:click={() => {
                checkedIndex = "daily";
            }}
            class="{'    bu-op hover:text-white hover:bg-green-400 ' +
                (checkedIndex == 'daily'
                    ? 'bg-green-500 text-white'
                    : '')}        "
        >
            <i class="ri-calendar-event-fill mr-2" />每日回顾</button
        >
        <button
            on:click={() => {
                checkedIndex = 2;
            }}
            class="{'    bu-op hover:text-white hover:bg-green-400 ' +
                (checkedIndex == 'luck'
                    ? 'bg-green-500 text-white'
                    : '')}        "
        >
            <i class="ri-bubble-chart-fill mr-2" />随机漫步</button
        >
    </div>

    {#if pinTags.length != 0}
        <div class=" p-4 w-full text-sm">置顶</div>

        {#each pinTags as { _id, tag }}
            <button
                class="rounded-r  group p-4 pt-2 pb-2  focus:outline-none w-full hover:bg-gray-200 flex justify-between text-sm"
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
        <div class="  p-4 pt-2 pb-2 w-full text-sm">标签</div>

        {#each allTags as tag}
            <button
                class="rounded-r  group p-4 pt-2 pb-2 focus:outline-none w-full hover:bg-gray-200 flex justify-between text-sm"
            >
                {tag}
                <button
                    class="focus:outline-none group-hover:opacity-100 opacity-0  pl-2 pr-2"
                    on:click={() => {
                        pinNeno(tag, true);
                    }}
                >
                    <i class="ri-pushpin-2-fill" />
                </button>
            </button>
        {/each}
    {/if}
</div>

<style type="text/postcss">
    .bu-op {
        @apply w-full    flex  items-center justify-start  rounded-r  p-4 outline-none;
    }
</style>
