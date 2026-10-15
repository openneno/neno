<script>
    import {onMount} from "svelte";
    import {fly} from "../lib/motion.js";

    import PageHeader from "../components/PageHeader.svelte";
    import NenoItem from "../components/NenoItem.svelte";
    import ProgressLine from "../components/ProgressLine.svelte";
    import {getAllNenoList, withRelations} from "../request/fetchApi";
    import {onNoteChange} from "../lib/noteEvents.js";
    import {currentPage} from "../store/store.js";
    import {shuffle} from "../lib/random.js";
    import catImage from "../assets/猫猫.png";

    let isLoading = true;
    let allNenos = [];
    let filterTag = "";
    let allTags = [];

    //随机顺序的待漫步队列, 一轮走完前不会重复
    let deck = [];
    //已经看过的笔记, 支持返回上一条
    let history = [];
    let historyIndex = -1;
    let current = null;
    let direction = 1;

    function getCandidates() {
        return filterTag === "" ? allNenos : allNenos.filter((neno) => neno.tags.includes(filterTag));
    }

    $: candidateCount = (filterTag, allNenos, getCandidates().length);

    onMount(() => {
        const off = onNoteChange(({type, note}) => {
            if (type === "delete") {
                removeItem(note._id);
            } else if (type === "add") {
                allNenos = [note, ...allNenos];
                //新的批注会改变当前笔记的关联
                if (current && note.parentId === current._id) show(current);
            } else {
                allNenos = allNenos.map((item) => (item._id === note._id ? note : item));
                history = history.map((item) => (item._id === note._id ? note : item));
                if (current && (current._id === note._id || current._id === note.parentId
                    || (current.children || []).some((item) => item._id === note._id))) {
                    show(current._id === note._id ? note : current);
                }
            }
        });
        loadData();
        return off;
    });

    async function loadData() {
        try {
            allNenos = await getAllNenoList();
            allTags = [...new Set(allNenos.flatMap((neno) => neno.tags))].sort();
            await next();
        } catch (e) {
            console.log(e);
        }
        isLoading = false;
    }

    async function show(neno) {
        current = neno ? await withRelations(neno) : null;
    }

    async function next() {
        direction = 1;
        if (historyIndex < history.length - 1) {
            historyIndex += 1;
            await show(history[historyIndex]);
            return;
        }
        const candidates = getCandidates();
        if (candidates.length === 0) {
            await show(null);
            return;
        }
        if (deck.length === 0) {
            deck = shuffle(candidates);
            //新一轮的第一条不和刚看过的重复
            if (deck.length > 1 && current && deck[0]._id === current._id) {
                deck.push(deck.shift());
            }
        }
        const neno = deck[0];
        deck = deck.slice(1);
        history = [...history, neno];
        historyIndex = history.length - 1;
        await show(neno);
    }

    async function prev() {
        if (historyIndex > 0) {
            direction = -1;
            historyIndex -= 1;
            await show(history[historyIndex]);
        }
    }

    async function changeFilter(tag) {
        filterTag = tag;
        deck = [];
        history = [];
        historyIndex = -1;
        current = null;
        await next();
    }

    function onKeydown(event) {
        const target = event.target;
        if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) {
            return;
        }
        if ($currentPage !== "luck") return;
        if (event.key === "ArrowRight") next();
        if (event.key === "ArrowLeft") prev();
    }

    function removeItem(_id) {
        if (!allNenos.some((item) => item._id === _id)) return;
        const wasCurrent = current && current._id === _id;
        allNenos = allNenos.filter((item) => item._id !== _id);
        deck = deck.filter((item) => item._id !== _id);
        history = history.filter((item) => item._id !== _id);
        if (!wasCurrent && current) {
            //删除的是其他笔记(例如当前笔记的批注): 继续显示当前笔记, 并刷新关联
            historyIndex = history.findIndex((item) => item._id === current._id);
            show(current);
            return;
        }
        historyIndex = Math.min(historyIndex, history.length - 1);
        if (historyIndex >= 0) {
            show(history[historyIndex]);
        } else {
            current = null;
            next();
        }
    }
</script>

<svelte:window on:keydown={onKeydown}/>

<div class="flex h-screen min-w-0 flex-1 flex-col">
    <div class="mx-auto w-full max-w-[720px] px-4 sm:px-6">
        <PageHeader title="随机漫步" subtitle={candidateCount > 0 ? `共 ${candidateCount} 条` : ""}>
            {#if allTags.length > 0}
                <label class="relative block">
                    <select
                            class="input h-8 w-auto max-w-44 cursor-pointer appearance-none pr-8"
                            aria-label="按标签漫步"
                            value={filterTag}
                            on:change={(event) => changeFilter(event.currentTarget.value)}
                    >
                        <option value="">全部笔记</option>
                        {#each allTags as tag}
                            <option value={tag}>{tag}</option>
                        {/each}
                    </select>
                    <i class="ri-arrow-down-s-line pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-ink-3"></i>
                </label>
            {/if}
        </PageHeader>
    </div>

    <div class="flex-1 overflow-y-auto">
        <div class="mx-auto w-full max-w-[720px] px-4 pt-2 pb-16 sm:px-6">
            {#if isLoading}
                <ProgressLine/>
            {:else if current === null}
            <div class="flex flex-col items-center py-16 text-center">
                <img src={catImage} alt="" class="w-28 opacity-90"/>
                <div class="mt-3 text-sm text-ink-2">这里还没有可以漫步的笔记</div>
                <button class="btn btn-primary mt-4" on:click={() => ($currentPage = "neno")}>去记录</button>
            </div>
            {:else}
                {#key current._id}
                    <div in:fly={{x: 32 * direction, duration: 250}}>
                        <NenoItem {...current}/>
                    </div>
                {/key}

                <div class="mt-5 flex items-center justify-center gap-3">
                    <button
                            class="btn btn-secondary size-10 rounded-full px-0"
                            aria-label="上一条"
                            title="上一条 (←)"
                            disabled={historyIndex <= 0}
                            on:click={prev}
                    >
                        <i class="ri-arrow-left-s-line text-lg"></i>
                    </button>
                    <button class="btn btn-primary h-10 rounded-full px-6" title="再走一步 (→)" on:click={next}>
                        <i class="ri-footprint-line"></i>再走一步
                    </button>
                </div>
                <div class="mt-3 text-center text-xs text-ink-3 tabular-nums">
                    已漫步 {history.length} 条 · 使用 ← → 键切换
                </div>
            {/if}
        </div>
    </div>
</div>
