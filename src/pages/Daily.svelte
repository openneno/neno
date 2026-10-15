<script>
    import {onMount} from "svelte";
    import {fly} from "svelte/transition";
    import dayjs from "dayjs";

    import PageHeader from "../components/PageHeader.svelte";
    import NenoItem from "../components/NenoItem.svelte";
    import ProgressLine from "../components/ProgressLine.svelte";
    import {getAllNenoList, withRelations} from "../request/fetchApi";
    import {currentPage} from "../store/store.js";
    import {seededRandom, shuffle} from "../lib/random.js";
    import catImage from "../assets/猫猫.png";

    //每天回顾的笔记数量
    const REVIEW_COUNT = 5;

    const WEEK_DAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const today = dayjs();
    const todayText = today.format("YYYY-MM-DD");

    let isLoading = true;
    let allNenos = [];
    let onThisDay = []; //[{yearsAgo, items}]
    let reviewItems = [];
    let batch = 0;

    onMount(async () => {
        try {
            allNenos = await getAllNenoList();
            onThisDay = await pickOnThisDay(allNenos);
            reviewItems = await pickReview(allNenos, batch);
        } catch (e) {
            console.log(e);
        }
        isLoading = false;
    });

    //那年今日: 往年同月同日记录的笔记
    async function pickOnThisDay(nenos) {
        const monthDay = today.format("MM-DD");
        const groups = new Map();
        for (const neno of nenos) {
            const created = dayjs(neno.created_at);
            const yearsAgo = today.year() - created.year();
            if (yearsAgo > 0 && created.format("MM-DD") === monthDay) {
                if (!groups.has(yearsAgo)) groups.set(yearsAgo, []);
                groups.get(yearsAgo).push(await withRelations(neno));
            }
        }
        return [...groups.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([yearsAgo, items]) => ({yearsAgo, items}));
    }

    //今日回顾: 以日期为种子从今天之前的笔记中挑选, 同一天内结果稳定, "换一批"切换种子
    async function pickReview(nenos, batchIndex) {
        //优先排除今天写的和"那年今日"已经展示的笔记
        const shown = new Set(onThisDay.flatMap((group) => group.items.map((item) => item._id)));
        const older = nenos.filter((neno) => neno.created_at.substring(0, 10) !== todayText);
        const fresh = older.filter((neno) => !shown.has(neno._id));
        const pool = fresh.length > 0 ? fresh : older.length > 0 ? older : nenos;
        const picked = shuffle(pool, seededRandom(`${todayText}#${batchIndex}`)).slice(0, REVIEW_COUNT);
        return Promise.all(picked.map(withRelations));
    }

    async function nextBatch() {
        batch += 1;
        reviewItems = await pickReview(allNenos, batch);
    }

    function removeItem(_id) {
        allNenos = allNenos.filter((item) => item._id !== _id);
        reviewItems = reviewItems.filter((item) => item._id !== _id);
        onThisDay = onThisDay
            .map((group) => ({...group, items: group.items.filter((item) => item._id !== _id)}))
            .filter((group) => group.items.length > 0);
    }
</script>

<div class="flex-1 flex flex-col justify-start pt-4 w-0 h-screen">
    <PageHeader title="每日回顾" subtitle={`${today.format("YYYY年M月D日")} ${WEEK_DAYS[today.day()]}`}/>

    <div class="flex flex-col overflow-y-auto p-2 mt-2 flex-1">
        {#if isLoading}
            <ProgressLine/>
        {:else if allNenos.length === 0}
            <div class="flex flex-col items-center justify-center mt-16 text-gray-500 dark:text-slate-300">
                <img src={catImage} alt="" class="w-40"/>
                <div class="font-bold mt-2">还没有笔记, 先去记录一些想法吧</div>
                <button
                        class="mt-4 rounded-sm bg-primary-500 hover:bg-primary-600 text-white px-4 py-1 focus:outline-hidden"
                        on:click={() => {
                        $currentPage = "neno";
                    }}>去记录
                </button>
            </div>
        {:else}
            {#if onThisDay.length > 0}
                <div class="flex items-center text-sm font-bold text-primary-600 dark:text-primary-400 pl-2 mb-2">
                    <i class="ri-history-line mr-1"></i>那年今日
                </div>
                {#each onThisDay as group (group.yearsAgo)}
                    <div class="text-xs text-gray-500 dark:text-slate-400 pl-2 mb-1">{group.yearsAgo} 年前的今天</div>
                    {#each group.items as item (item._id)}
                        <NenoItem {...item} on:deleteOne={(event) => removeItem(event.detail._id)}/>
                    {/each}
                {/each}
            {/if}

            <div class="flex items-center justify-between pl-2 mb-2">
                <div class="flex items-center text-sm font-bold text-primary-600 dark:text-primary-400">
                    <i class="ri-calendar-check-line mr-1"></i>今日回顾
                    <span class="ml-2 font-normal text-gray-500 dark:text-slate-400">从 {allNenos.length} 条笔记中为你挑选</span>
                </div>
                {#if allNenos.length > REVIEW_COUNT}
                    <button
                            class="text-sm text-gray-500 hover:text-primary-600 dark:text-slate-300 focus:outline-hidden flex items-center"
                            on:click={nextBatch}
                    >
                        <i class="ri-refresh-line mr-1"></i>换一批
                    </button>
                {/if}
            </div>
            {#key batch}
                <div in:fly={{y: 20, duration: 250}}>
                    {#each reviewItems as item (item._id)}
                        <NenoItem {...item} on:deleteOne={(event) => removeItem(event.detail._id)}/>
                    {/each}
                </div>
            {/key}
        {/if}
    </div>
</div>
