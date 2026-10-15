<script>
    import {onMount} from "svelte";
    import {fly} from "svelte/transition";

    import PageHeader from "../components/PageHeader.svelte";
    import NenoItem from "../components/NenoItem.svelte";
    import ProgressLine from "../components/ProgressLine.svelte";
    import {getAllNenoList, withRelations} from "../request/fetchApi";
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

    onMount(async () => {
        try {
            allNenos = await getAllNenoList();
            allTags = [...new Set(allNenos.flatMap((neno) => neno.tags))].sort();
            await next();
        } catch (e) {
            console.log(e);
        }
        isLoading = false;
    });

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
        allNenos = allNenos.filter((item) => item._id !== _id);
        deck = deck.filter((item) => item._id !== _id);
        history = history.filter((item) => item._id !== _id);
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

<div class="flex-1 flex flex-col justify-start pt-4 w-0 h-screen">
    <PageHeader title="随机漫步" subtitle={candidateCount > 0 ? `共 ${candidateCount} 条笔记` : ""}>
        {#if allTags.length > 0}
            <select
                    class="text-sm rounded-lg bg-gray-200 dark:bg-gray-700 dark:text-slate-200 h-8 px-2 focus:outline-hidden max-w-40"
                    aria-label="按标签漫步"
                    value={filterTag}
                    on:change={(event) => changeFilter(event.currentTarget.value)}
            >
                <option value="">全部笔记</option>
                {#each allTags as tag}
                    <option value={tag}>{tag}</option>
                {/each}
            </select>
        {/if}
    </PageHeader>

    <div class="flex flex-col overflow-y-auto p-2 mt-2 flex-1">
        {#if isLoading}
            <ProgressLine/>
        {:else if current === null}
            <div class="flex flex-col items-center justify-center mt-16 text-gray-500 dark:text-slate-300">
                <img src={catImage} alt="" class="w-40"/>
                <div class="font-bold mt-2">这里还没有可以漫步的笔记</div>
                <button
                        class="mt-4 rounded-sm bg-primary-500 hover:bg-primary-600 text-white px-4 py-1 focus:outline-hidden"
                        on:click={() => {
                        $currentPage = "neno";
                    }}>去记录
                </button>
            </div>
        {:else}
            {#key current._id}
                <div in:fly={{x: 40 * direction, duration: 250}}>
                    <NenoItem {...current} on:deleteOne={(event) => removeItem(event.detail._id)}/>
                </div>
            {/key}

            <div class="flex items-center justify-center space-x-4 mt-2">
                <button
                        class="rounded-full w-10 h-10 bg-white dark:bg-gray-600 dark:text-slate-200 shadow-xs hover:shadow-md focus:outline-hidden disabled:opacity-40"
                        aria-label="上一条"
                        title="上一条 (←)"
                        disabled={historyIndex <= 0}
                        on:click={prev}
                >
                    <i class="ri-arrow-left-s-line ri-lg"></i>
                </button>
                <button
                        class="rounded-full px-6 h-10 bg-primary-500 hover:bg-primary-600 text-white shadow-xs hover:shadow-md focus:outline-hidden flex items-center"
                        title="再走一步 (→)"
                        on:click={next}
                >
                    <i class="ri-footprint-line mr-1"></i>再走一步
                </button>
            </div>
            <div class="text-center text-xs text-gray-400 mt-2">
                已漫步 {history.length} 条 · 使用 ← → 键切换
            </div>
        {/if}
    </div>
</div>
