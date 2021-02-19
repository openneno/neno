<script>
    import { tokoen } from "../store/store.js";
    import { tags, pin, pins } from "../request/fetchApi";
    import { onMount } from "svelte";
    let allTags = [];
    let pinTags = [];
    let showNormalTag = [];
    let checkedIndex = 0;

    onMount(() => {
        getPins();
    });

    function getTags() {
        tags()
            .then(async (respone) => {
                let re = await respone.json();
                let tempTags = re.body;
                let aa = [];
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
</script>

<div class="hidden  sm:flex md:flex flex-col items-start" style="width:240px">
    <div class="flex flex-col items-start text-sm text-gray-600">
        <button
            on:click={() => {
                checkedIndex = 0;
            }}
            class="{'    bu-op hover:text-white hover:bg-green-400 ' +
                (checkedIndex == 0 ? 'bg-green-500 text-white' : '')}        "
        >
            <i class="ri-quill-pen-fill mr-2" />NENO</button
        >

        <button
            on:click={() => {
                checkedIndex = 1;
            }}
            class="{'    bu-op hover:text-white hover:bg-green-400 ' +
                (checkedIndex == 1 ? 'bg-green-500 text-white' : '')}        "
        >
            <i class="ri-calendar-event-fill mr-2" />每日回顾</button
        >
        <button
            on:click={() => {
                checkedIndex = 2;
            }}
            class="{'    bu-op hover:text-white hover:bg-green-400 ' +
                (checkedIndex == 2 ? 'bg-green-500 text-white' : '')}        "
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
