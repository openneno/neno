<script>
    import {onMount} from "svelte";
    import {fly} from "../lib/motion.js";
    import dayjs from "dayjs";

    import PageHeader from "../components/PageHeader.svelte";
    import NenoItem from "../components/NenoItem.svelte";
    import ProgressLine from "../components/ProgressLine.svelte";
    import {getAllNenoList, withRelations} from "../request/fetchApi";
    import {applyNoteChange, onNoteChange} from "../lib/noteEvents.js";
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

    onMount(() => {
        let queue = Promise.resolve();
        const off = onNoteChange((change) => {
            queue = queue.then(() => applyChange(change)).catch((reason) => console.log(reason));
        });
        loadData();
        return off;
    });

    async function loadData() {
        try {
            allNenos = await getAllNenoList();
            onThisDay = await pickOnThisDay(allNenos);
            reviewItems = await pickReview(allNenos, batch);
        } catch (e) {
            console.log(e);
        }
        isLoading = false;
    }

    //编辑, 批注, 删除后更新页面上的笔记
    async function applyChange(change) {
        if (change.type === "delete") {
            allNenos = allNenos.filter((item) => item._id !== change.note._id);
        } else if (change.type === "add") {
            allNenos = [change.note, ...allNenos];
        } else {
            allNenos = allNenos.map((item) => (item._id === change.note._id ? change.note : item));
        }
        reviewItems = await applyNoteChange(reviewItems, change);
        const groups = [];
        for (const group of onThisDay) {
            const items = await applyNoteChange(group.items, change);
            if (items.length > 0) groups.push({...group, items});
        }
        onThisDay = groups;
    }

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

</script>

<div class="flex h-screen min-w-0 flex-1 flex-col">
    <div class="mx-auto w-full max-w-[720px] px-4 sm:px-6">
        <PageHeader title="每日回顾" subtitle={`${today.format("M月D日")} ${WEEK_DAYS[today.day()]}`}>
            {#if !isLoading && allNenos.length > REVIEW_COUNT}
                <button class="btn btn-sm btn-ghost" on:click={nextBatch}>
                    <i class="ri-refresh-line inline-block transition-transform duration-500" style="transform: rotate({batch * 360}deg)"></i>换一批
                </button>
            {/if}
        </PageHeader>
    </div>

    <div class="flex-1 overflow-y-auto">
        <div class="mx-auto w-full max-w-[720px] px-4 pt-2 pb-16 sm:px-6">
            {#if isLoading}
                <ProgressLine/>
            {:else if allNenos.length === 0}
            <div class="flex flex-col items-center py-16 text-center">
                <img src={catImage} alt="" class="w-28 opacity-90"/>
                <div class="mt-3 text-sm text-ink-2">还没有笔记, 先去记录一些想法吧</div>
                <button class="btn btn-primary mt-4" on:click={() => ($currentPage = "neno")}>去记录</button>
            </div>
            {:else}
                {#if onThisDay.length > 0}
                    <section class="mb-8">
                        <h2 class="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-ink-2">
                            <i class="ri-history-line text-primary-600 dark:text-primary-400"></i>那年今日
                        </h2>
                        {#each onThisDay as group (group.yearsAgo)}
                            <div class="mb-2 inline-flex rounded-md bg-surface-2 px-2 py-0.5 text-xs text-ink-2">{group.yearsAgo} 年前的今天</div>
                            {#each group.items as item (item._id)}
                                <NenoItem {...item}/>
                            {/each}
                        {/each}
                    </section>
                {/if}

                <section>
                    <h2 class="mb-3 flex items-baseline gap-2 text-[13px] font-semibold text-ink-2">
                        <span class="flex items-center gap-1.5">
                            <i class="ri-calendar-check-line text-primary-600 dark:text-primary-400"></i>今日回顾
                        </span>
                        <span class="text-xs font-normal text-ink-3">从 {allNenos.length} 条笔记中为你挑选</span>
                    </h2>
                    {#key batch}
                        <div in:fly={{y: 12, duration: 250}}>
                            {#each reviewItems as item (item._id)}
                                <NenoItem {...item}/>
                            {/each}
                        </div>
                    {/key}
                </section>
            {/if}
        </div>
    </div>
</div>
